import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { revalidatePath, revalidateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export const maxDuration = 60

// ─── Types ────────────────────────────────────────────────────────────────────

interface DatosComprobante {
  montoDetectado: number
  referenciaDetectada: string
  entidad: string
  fecha: string
  fechaIso: string
  hora: string
  nombreDestinatario: string
  numeroDestino: string
  bancoDestino: string
  transaccionExitosa: boolean
}

interface ClientRow {
  id: string
  auto_aprobacion: boolean
  comprobante_bloqueado: boolean
  comprobante_bloqueado_hasta: string | null
  strikes_data: { count: number; strikes: Array<{ fecha: string; motivo: string }> } | null
}

// ─── dHash perceptual (64-bit) usando jimp ────────────────────────────────────

async function dHash(imageBase64: string): Promise<string | null> {
  try {
    const { Jimp } = await import("jimp")
    const buf = Buffer.from(imageBase64, "base64")
    const img = await Jimp.fromBuffer(buf)
    img.greyscale().resize({ w: 9, h: 8 })
    const data = img.bitmap.data
    let hex = ""
    let nibble = 0
    let count = 0
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const idx = (y * 9 + x) * 4
        const idxNext = (y * 9 + x + 1) * 4
        nibble = (nibble << 1) | (data[idx] > data[idxNext] ? 1 : 0)
        count++
        if (count % 4 === 0) {
          hex += nibble.toString(16)
          nibble = 0
        }
      }
    }
    return hex
  } catch {
    return null
  }
}

function hamming(a: string, b: string): number {
  if (a.length !== b.length) return 64
  let n = 0
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    while (x) { n += x & 1; x >>= 1 }
  }
  return n
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

async function analizarConGemini(imageBase64: string, mimeType: string): Promise<DatosComprobante> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })

  const result = await model.generateContent([
    { inlineData: { data: imageBase64, mimeType } },
    `Eres un extractor de datos de comprobantes de pago colombianos (Nequi, Daviplata, transferencias, etc.).

FORMATO DE MONTOS EN COLOMBIA:
- El punto (.) separa miles: $25.500 = 25500 pesos
- La coma (,) es decimal: $25.500,00 = 25500 pesos
- Ejemplos: "$25.500,00"→25500 | "$100.000"→100000 | "$ 50.000,00"→50000

Extrae estos campos del comprobante:
1. monto: valor transferido/enviado como número entero (solo dígitos, sin puntos ni comas)
2. referencia: número de referencia o transacción
3. entidad: medio de pago EXACTO como aparece en el comprobante (Nu, Nequi, Daviplata, Bancolombia, etc.). IMPORTANTE: Nu/Nubank y Nequi son entidades DISTINTAS — si dice "Nu" o "Nubank" escribe "Nu", no "Nequi".
4. fecha: fecha del pago en formato legible (ej: "27 de mayo de 2026")
5. fecha_iso: fecha del pago en formato YYYY-MM-DD (ej: "2026-05-27")
6. hora: hora del pago (ej: "07:41 p. m.")
7. destinatario: nombre de quien RECIBE el dinero (campo "Para", "A nombre de", etc.)
8. numero_destino: teléfono/número de cuenta/llave del DESTINATARIO, solo dígitos sin espacios ni guiones. Busca campos como "Número Nequi", "Llave", "Cuenta destino", "Número celular destino". Si no aparece, usa "".
9. transaccion_exitosa: true si el comprobante muestra transacción COMPLETADA ("Envío Realizado", "Exitoso", "Enviado", "Transferencia exitosa"). false si es pendiente, fallida o cancelada. Si el estado no es claro, usa true.
10. banco_destino: banco o billetera del DESTINATARIO. Ejemplos: "Nequi", "Bancolombia", "Nu". Si no aparece, usa "".

Si hay un QR en la imagen, ignóralo y lee el texto.

Responde SOLO este JSON:
{"monto": 25500, "referencia": "M21386956", "entidad": "Nequi", "fecha": "27 de mayo de 2026", "fecha_iso": "2026-05-27", "hora": "07:41 p. m.", "destinatario": "Luz Cardeno", "numero_destino": "3175287585", "transaccion_exitosa": true, "banco_destino": "Nequi"}

Si no encuentras un campo usa: monto→0, transaccion_exitosa→true, otros→"".`,
  ])

  const text = result.response.text().trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Gemini no devolvió JSON")
  const parsed = JSON.parse(jsonMatch[0])

  return {
    montoDetectado: Math.abs(parseInt(String(parsed.monto ?? "0").replace(/[^0-9]/g, ""), 10) || 0),
    referenciaDetectada: String(parsed.referencia || "").slice(0, 100),
    entidad: String(parsed.entidad || "").slice(0, 50),
    fecha: String(parsed.fecha || "").slice(0, 80),
    fechaIso: String(parsed.fecha_iso || "").slice(0, 10),
    hora: String(parsed.hora || "").slice(0, 30),
    nombreDestinatario: String(parsed.destinatario || "").slice(0, 100),
    numeroDestino: String(parsed.numero_destino || "").replace(/\D/g, "").slice(0, 20),
    bancoDestino: String(parsed.banco_destino || "").slice(0, 50),
    transaccionExitosa: parsed.transaccion_exitosa !== false,
  }
}

// ─── Helpers de comparación ───────────────────────────────────────────────────

function nombresCoinciden(detectado: string, esperado: string | null | undefined): boolean {
  if (!detectado || !esperado) return false
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim()
  const a = norm(detectado)
  const b = norm(esperado)
  if (a === b) return true
  const wordsA = a.split(/\s+/)
  const wordsB = b.split(/\s+/)
  const matches = wordsB.filter(
    (w) => w.length > 2 && wordsA.some((wa) => wa.startsWith(w) || w.startsWith(wa))
  )
  return matches.length >= Math.min(wordsB.length, 2)
}

function numerosCoinciden(detectado: string, esperado: string | null | undefined): boolean {
  if (!detectado || !esperado) return false
  const clean = (s: string) => s.replace(/\D/g, "")
  const a = clean(detectado).slice(-10)
  const b = clean(esperado).slice(-10)
  return a === b && a.length >= 8
}

// ─── Rate limit (10 análisis/hora por cliente) ────────────────────────────────

const UPLOAD_WINDOW_MS = 60 * 60 * 1000
const UPLOAD_MAX = 10

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkRateLimit(clientId: string, admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).from("gym_config").select("value").eq("key", "rate_limit_analizar").maybeSingle()
    const attempts: Record<string, { count: number; firstAttempt: number }> =
      (data?.value as Record<string, { count: number; firstAttempt: number }>) || {}
    const now = Date.now()
    for (const [k, v] of Object.entries(attempts)) {
      if (now - v.firstAttempt > UPLOAD_WINDOW_MS) delete attempts[k]
    }
    const rec = attempts[clientId]
    if (rec && rec.count >= UPLOAD_MAX) return false
    attempts[clientId] = rec ? { ...rec, count: rec.count + 1 } : { count: 1, firstAttempt: now }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("gym_config").upsert({ key: "rate_limit_analizar", value: attempts })
    return true
  } catch {
    return true
  }
}

// ─── Strike system ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function registrarStrike(clientId: string, motivo: string, admin: ReturnType<typeof createAdminClient>): Promise<number> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).from("clients").select("strikes_data").eq("id", clientId).single()
    const sd: { count: number; strikes: Array<{ fecha: string; motivo: string }> } =
      (data?.strikes_data as typeof sd) ?? { count: 0, strikes: [] }
    sd.count += 1
    sd.strikes = [...(sd.strikes ?? []), { fecha: new Date().toISOString(), motivo }]

    const update: Record<string, unknown> = { strikes_data: sd }
    if (sd.count >= 3) {
      update.comprobante_bloqueado = true
    } else if (sd.count === 2) {
      update.comprobante_bloqueado_hasta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("clients").update(update).eq("id", clientId)
    return sd.count
  } catch {
    return 0
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (admin as any)
    .from("clients")
    .select("id, auto_aprobacion, comprobante_bloqueado, comprobante_bloqueado_hasta, strikes_data")
    .eq("profile_id", user.id)
    .single()
  if (!client) return NextResponse.json({ error: "Perfil de cliente no encontrado" }, { status: 403 })

  const clientRow = client as ClientRow

  // Check de bloqueo permanente
  if (clientRow.comprobante_bloqueado) {
    return NextResponse.json({
      bloqueada: true,
      error: "Tus comprobantes automáticos fueron bloqueados. Contacta al administrador.",
    }, { status: 403 })
  }

  // Check de bloqueo temporal (24h)
  if (clientRow.comprobante_bloqueado_hasta && new Date(clientRow.comprobante_bloqueado_hasta) > new Date()) {
    return NextResponse.json({
      bloqueada: true,
      error: "Tu acceso automático está bloqueado temporalmente por 24 horas.",
    }, { status: 403 })
  }

  const body = await req.json()
  const {
    accion,
    imageBase64,
    mimeType = "image/jpeg",
    planId,
    amountExpected,
    method = "nequi",
    amountCents: amountCentsConfirm,
  } = body

  if (!imageBase64) return NextResponse.json({ error: "Imagen requerida" }, { status: 400 })

  const imageHash = createHash("sha256").update(imageBase64 as string).digest("hex")

  const currentStrikes = (clientRow.strikes_data?.count ?? 0)

  // ── PASO 1: ANALIZAR ─────────────────────────────────────────────────────────
  if (accion === "analizar") {
    const allowed = await checkRateLimit(clientRow.id as string, admin)
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos. Esperá una hora e intentá de nuevo." },
        { status: 429 }
      )
    }

    // Duplicado exacto → flag (no error HTTP)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existenteHash } = await (admin as any)
      .from("payments")
      .select("id")
      .eq("imagen_hash", imageHash)
      .neq("status", "rejected")
      .maybeSingle()

    let imagenRepetida = !!existenteHash

    // Config del gym (cuentas de pago)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: gym } = await (admin as any)
      .from("gyms")
      .select("nequi_number, nequi_titular, daviplata_number, daviplata_titular")
      .eq("id", GYM_ID)
      .single()

    // Llamar a Gemini
    let datos: DatosComprobante
    try {
      datos = await analizarConGemini(imageBase64 as string, mimeType as string)
    } catch {
      return NextResponse.json(
        { error: "No se pudo analizar el comprobante. Intentá con una imagen más clara." },
        { status: 422 }
      )
    }

    // Referencia repetida
    let referenciaRepetida = false
    if (datos.referenciaDetectada) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existenteRef } = await (admin as any)
        .from("payments")
        .select("id")
        .eq("ai_referencia", datos.referenciaDetectada)
        .neq("status", "rejected")
        .maybeSingle()
      referenciaRepetida = !!existenteRef
    }

    // dHash para duplicados perceptuales
    const phash = await dHash(imageBase64 as string)
    if (phash && !imagenRepetida) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: previos } = await (admin as any)
        .from("payments")
        .select("imagen_phash")
        .not("imagen_phash", "is", null)
        .order("created_at", { ascending: false })
        .limit(500)
      const similar = ((previos ?? []) as Array<{ imagen_phash: string | null }>).some(
        (p) => p.imagen_phash && hamming(phash, p.imagen_phash) <= 8
      )
      if (similar) imagenRepetida = true
    }

    // Registrar strike si hay fraude detectado
    let strikesActuales = currentStrikes
    if (imagenRepetida || referenciaRepetida) {
      const motivo = referenciaRepetida
        ? `Referencia repetida: ${datos.referenciaDetectada}`
        : "Imagen de comprobante repetida"
      strikesActuales = await registrarStrike(clientRow.id, motivo, admin)
    }

    // Determinar cuenta esperada según entidad detectada
    const entidadNorm = datos.entidad.toLowerCase()
    const esNequi = entidadNorm.includes("nequi")
    const esDaviplata = entidadNorm.includes("daviplata")

    const titularEsperado: string | null = esNequi
      ? (gym?.nequi_titular ?? null)
      : esDaviplata
      ? (gym?.daviplata_titular ?? null)
      : null

    const numeroEsperado: string | null = esNequi
      ? (gym?.nequi_number ?? null)
      : esDaviplata
      ? (gym?.daviplata_number ?? null)
      : null

    // Si la IA no pudo leer el campo en el comprobante, es "no verificable"
    // (null), no una discrepancia real (false) — evita bloquear por una
    // lectura incompleta en vez de un dato que realmente no coincide.
    const nombreCoincide: boolean | null = titularEsperado && datos.nombreDestinatario
      ? nombresCoinciden(datos.nombreDestinatario, titularEsperado)
      : null

    const numeroCoincide: boolean | null = numeroEsperado && datos.numeroDestino
      ? numerosCoinciden(datos.numeroDestino, numeroEsperado)
      : null

    // Consultar el precio real del plan de la BD si se envió planId
    let expectedPriceCents = Number(amountExpected)
    if (planId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbPlan } = await (admin as any)
        .from("plans")
        .select("price_cents")
        .eq("id", planId)
        .maybeSingle()
      if (dbPlan?.price_cents) {
        expectedPriceCents = dbPlan.price_cents
      }
    }

    // amountExpected llega en centavos (amount_cents del plan); montoDetectado
    // por la IA viene en pesos — convertir antes de comparar.
    const coincideMonto: boolean | null =
      expectedPriceCents > 0 && datos.montoDetectado > 0
        ? datos.montoDetectado === Math.round(expectedPriceCents / 100)
        : null

    const titularFlexible = clientRow.auto_aprobacion === true

    // Veredicto IA: Requiere que la transacción sea exitosa, no haya discrepancia de nombre/número,
    // el monto coincida (si se pudo leer) y no sea comprobante duplicado.
    const aiValido =
      datos.transaccionExitosa &&
      nombreCoincide !== false &&
      numeroCoincide !== false &&
      coincideMonto !== false &&
      !imagenRepetida &&
      !referenciaRepetida

    let aiRazon = ""
    if (referenciaRepetida) aiRazon = "La referencia ya fue registrada anteriormente"
    else if (imagenRepetida) aiRazon = "Este comprobante es similar a uno ya registrado"
    else if (!datos.transaccionExitosa) aiRazon = "La transacción no aparece como completada"
    else if (coincideMonto === false) aiRazon = `El monto del comprobante ($${datos.montoDetectado.toLocaleString("es-CO")}) no coincide con el valor del plan ($${Math.round(expectedPriceCents / 100).toLocaleString("es-CO")})`
    else if (nombreCoincide === false) aiRazon = "El nombre del destinatario no coincide"
    else if (numeroCoincide === false) aiRazon = "El número de destino no coincide con la cuenta del gimnasio"

    // Guardar veredicto con TTL 15 min
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("receipt_verdicts").delete().eq("client_id", clientRow.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("receipt_verdicts").insert({
      client_id: clientRow.id,
      imagen_hash: imageHash,
      veredicto: {
        datos,
        imageHash,
        phash,
        planId: planId ?? null,
        method,
        amountExpected: Number(amountExpected),
        aiValido,
        aiRazon,
        nombreCoincide,
        numeroCoincide,
        coincideMonto,
        imagenRepetida,
        referenciaRepetida,
        titularEsperado,
        titularFlexible,
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    })

    return NextResponse.json({
      ok: true,
      monto: datos.montoDetectado,
      referencia: datos.referenciaDetectada,
      entidad: datos.entidad,
      fecha: datos.fecha,
      fecha_iso: datos.fechaIso,
      hora: datos.hora,
      destinatario: datos.nombreDestinatario,
      numero_destino: datos.numeroDestino,
      transaccion_exitosa: datos.transaccionExitosa,
      nombre_coincide: nombreCoincide,
      numero_coincide: numeroCoincide,
      coincide_monto: coincideMonto,
      imagen_repetida: imagenRepetida,
      referencia_repetida: referenciaRepetida,
      ai_valido: aiValido,
      ai_razon: aiRazon,
      titular_esperado: titularEsperado,
      titular_flexible: titularFlexible,
      strikes: strikesActuales,
    })
  }

  // ── PASO 2: CONFIRMAR ────────────────────────────────────────────────────────
  if (accion === "confirmar") {
    const amountCents = Number(amountCentsConfirm)
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
    }

    // Leer veredicto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: verdictRow } = await (admin as any)
      .from("receipt_verdicts")
      .select("*")
      .eq("client_id", clientRow.id)
      .maybeSingle()

    if (!verdictRow || new Date(verdictRow.expires_at as string) < new Date()) {
      return NextResponse.json(
        { error: "Sesión expirada. Analizá el comprobante de nuevo." },
        { status: 400 }
      )
    }

    const v = verdictRow.veredicto as Record<string, unknown>

    // Anti-tampering: el hash debe coincidir con el del análisis
    if (v.imageHash !== imageHash) {
      return NextResponse.json(
        { error: "El comprobante cambió. Iniciá el proceso de nuevo." },
        { status: 400 }
      )
    }

    // Validar coincidencia de monto contra la BD y el veredicto de la IA
    const confirmedPlanId = (v.planId as string) || null
    if (confirmedPlanId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dbPlan } = await (admin as any)
        .from("plans")
        .select("price_cents")
        .eq("id", confirmedPlanId)
        .maybeSingle()
      if (dbPlan && dbPlan.price_cents !== amountCents) {
        return NextResponse.json(
          { error: "El monto ingresado no coincide con el precio del plan seleccionado." },
          { status: 400 }
        )
      }
    }

    if (v.coincideMonto === false) {
      return NextResponse.json(
        { error: (v.aiRazon as string) || "El monto detectado en el comprobante no coincide con el valor del plan." },
        { status: 400 }
      )
    }

    // Seguridad: verificar que no haya fraude aunque el frontend lo haya bypaseado
    if (v.imagenRepetida || v.referenciaRepetida) {
      const motivo = v.referenciaRepetida
        ? `Intento de confirmar referencia repetida: ${(v.datos as DatosComprobante)?.referenciaDetectada}`
        : "Intento de confirmar imagen repetida"
      await registrarStrike(clientRow.id, motivo, admin)
      return NextResponse.json(
        { error: "Comprobante ya registrado anteriormente." },
        { status: 400 }
      )
    }

    // Re-verificar duplicado exacto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existente } = await (admin as any)
      .from("payments")
      .select("id, status")
      .eq("imagen_hash", imageHash)
      .neq("status", "rejected")
      .maybeSingle()

    if (existente) {
      return NextResponse.json({
        error:
          existente.status === "approved"
            ? "Este comprobante ya fue procesado."
            : "Este comprobante ya fue enviado.",
      }, { status: 400 })
    }

    // Re-verificar dHash
    const phash = v.phash as string | null
    if (phash) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: previos } = await (admin as any)
        .from("payments")
        .select("imagen_phash")
        .not("imagen_phash", "is", null)
        .order("created_at", { ascending: false })
        .limit(500)
      const similar = ((previos ?? []) as Array<{ imagen_phash: string | null }>).some(
        (p) => p.imagen_phash && hamming(phash, p.imagen_phash) <= 8
      )
      if (similar) {
        await registrarStrike(clientRow.id, "Imagen perceptualmente similar a comprobante ya enviado", admin)
        return NextResponse.json(
          { error: "Comprobante demasiado similar a uno ya registrado." },
          { status: 400 }
        )
      }
    }

    const datos = v.datos as DatosComprobante
    const aiValido = v.aiValido as boolean
    const aiRazon = (v.aiRazon as string) || null
    const planId = (v.planId as string) || null
    const paymentMethod = (v.method as string) || "nequi"

    // Subir imagen a Storage
    const buf = Buffer.from(imageBase64 as string, "base64")
    const storagePath = `${GYM_ID}/${clientRow.id}/${Date.now()}.jpg`
    const { error: uploadError } = await admin.storage
      .from("receipts")
      .upload(storagePath, buf, { contentType: "image/jpeg", upsert: false })

    if (uploadError) {
      return NextResponse.json({ error: "Error al subir el comprobante." }, { status: 500 })
    }

    // Insertar pago con campos IA
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        gym_id: GYM_ID,
        client_id: clientRow.id,
        plan_id: planId,
        amount_cents: amountCents,
        method: paymentMethod,
        status: "pending",
        receipt_path: storagePath,
        imagen_hash: imageHash,
        imagen_phash: phash ?? null,
        ai_monto: datos.montoDetectado,
        ai_referencia: datos.referenciaDetectada,
        ai_entidad: datos.entidad,
        ai_nombre: datos.nombreDestinatario,
        ai_numero_destino: datos.numeroDestino,
        ai_fecha_iso: datos.fechaIso,
        ai_valido: aiValido,
        ai_razon: aiRazon,
        auto_aprobado: false,
      } as never)
      .select("id")
      .single()

    if (paymentError || !payment) {
      await admin.storage.from("receipts").remove([storagePath])
      return NextResponse.json({ error: "Error al registrar el pago." }, { status: 500 })
    }

    // Borrar veredicto
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("receipt_verdicts").delete().eq("client_id", clientRow.id)

    // Auto-aprobación si el cliente la tiene activa y la IA validó
    if (clientRow.auto_aprobacion && aiValido) {
      let totalDays = 20
      let durationDays = 30

      if (planId) {
        const { data: plan } = await admin
          .from("plans")
          .select("days, duration_days")
          .eq("id", planId)
          .single()
        if (plan) {
          totalDays = plan.days
          durationDays = plan.duration_days
        }
      }

      const { data: approveResult, error: approveError } = await admin.rpc("approve_payment", {
        p_payment_id: (payment as { id: string }).id,
        p_total_days: totalDays,
        p_duration_days: durationDays,
      })

      const result = approveResult as { ok: boolean } | null
      if (!approveError && result?.ok) {
        await admin
          .from("payments")
          .update({ auto_aprobado: true } as never)
          .eq("id", (payment as { id: string }).id)

        revalidateTag("admin-payments", "max")
        revalidatePath(ROUTES.CLIENTE_PAGOS)
        revalidatePath(ROUTES.CLIENTE_DASHBOARD)

        return NextResponse.json({ aprobado: true })
      }
    }

    revalidateTag("admin-payments", "max")
    revalidatePath(ROUTES.CLIENTE_PAGOS)

    return NextResponse.json({ aprobado: false })
  }

  return NextResponse.json({ error: "Acción inválida" }, { status: 400 })
}
