"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Upload, CheckCircle, Loader2, ImageIcon, AlertCircle,
  AlertTriangle, ChevronRight, ShieldCheck, Copy, Check, X, Calendar, Star, Banknote,
} from "lucide-react"
import { uploadPaymentAction } from "@/actions/payments.actions"
import { formatCOP, formatPesos, computePlanDiscount } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { Plan } from "@/types/payment"

interface PaymentUploadFormProps {
  plans: Plan[]
  comprobanteBloqueado?: boolean
}

type Paso =
  | "plan"
  | "imagen"
  | "preview"
  | "analizando"
  | "confirmar"
  | "enviando"
  | "aprobado"
  | "pendiente"
  | "error"

interface DatosIA {
  monto: number
  referencia: string
  entidad: string
  fecha: string
  fecha_iso: string
  hora: string
  destinatario: string
  numero_destino: string
  transaccion_exitosa: boolean
  nombre_coincide: boolean | null
  numero_coincide: boolean | null
  coincide_monto: boolean | null
  imagen_repetida: boolean
  referencia_repetida: boolean
  ai_valido: boolean
  ai_razon: string
  titular_esperado: string | null
  titular_flexible: boolean
  strikes: number
}

const METHODS_WITH_RECEIPT = ["nequi", "daviplata", "transfer"]
// Solo se ofrecen estos métodos al cliente
const ALLOWED_METHODS = ["cash", "nequi"]
const METHODS = (Object.entries(PAYMENT_METHOD_LABELS) as [keyof typeof PAYMENT_METHOD_LABELS, string][])
  .filter(([key]) => ALLOWED_METHODS.includes(key))

const comprimirImagen = (file: File): Promise<{ base64: string; dataUrl: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        let { width: w, height: h } = img
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round((h * MAX) / w); w = MAX }
          else { w = Math.round((w * MAX) / h); h = MAX }
        }
        const canvas = document.createElement("canvas")
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext("2d")!
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, w, h)
        ctx.drawImage(img, 0, 0, w, h)

        // Detectar imagen completamente negra
        const sampleStep = Math.max(1, Math.floor((w * h) / 100))
        const pixels = ctx.getImageData(0, 0, w, h).data
        let darkCount = 0, total = 0
        for (let i = 0; i < pixels.length; i += sampleStep * 4) {
          if (pixels[i] + pixels[i + 1] + pixels[i + 2] < 45) darkCount++
          total++
        }
        if (total > 0 && darkCount / total > 0.95) {
          reject(new Error("IMAGEN_NEGRA"))
          return
        }

        const dataUrl = canvas.toDataURL("image/jpeg", 0.72)
        resolve({ base64: dataUrl.split(",")[1], dataUrl })
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export function PaymentUploadForm({ plans, comprobanteBloqueado }: PaymentUploadFormProps) {
  const [paso, setPaso] = useState<Paso>("plan")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [method, setMethod] = useState("nequi")
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [datosIA, setDatosIA] = useState<DatosIA | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [strikeCount, setStrikeCount] = useState(0)
  const [cuentas, setCuentas] = useState<{ metodo: string; valor: string; titular: string }[]>([])
  const [copiado, setCopiado] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const amountCents = selectedPlan ? selectedPlan.price_cents : 0

  const needsReceipt = METHODS_WITH_RECEIPT.includes(method)

  // Cargar cuentas del gym
  useEffect(() => {
    fetch("/api/gym-cuentas")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.cuentas)) setCuentas(d.cuentas) })
      .catch(() => {})
  }, [])

  const copiar = (valor: string) => {
    navigator.clipboard?.writeText(valor).then(() => {
      setCopiado(valor)
      setTimeout(() => setCopiado(c => (c === valor ? null : c)), 1500)
    }).catch(() => {})
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErrorMsg("Solo se aceptan imágenes."); setPaso("error"); return }
    if (file.size > 5 * 1024 * 1024) { setErrorMsg("La imagen no puede superar 5 MB."); setPaso("error"); return }
    try {
      const { base64, dataUrl } = await comprimirImagen(file)
      setPreview(dataUrl)
      setImageBase64(base64)
      setPaso("preview")
    } catch (e: unknown) {
      if ((e as Error)?.message === "IMAGEN_NEGRA") {
        setErrorMsg("No se pudo visualizar una imagen válida. La imagen parece estar completamente negra — por favor vuelve a subirla.")
      } else {
        setErrorMsg("No se pudo procesar la imagen. Intenta con otra.")
      }
      setPaso("error")
    }
  }

  const iniciarAnalisis = async () => {
    if (!imageBase64) return
    setPaso("analizando")
    try {
      const res = await fetch("/api/analizar-comprobante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "analizar",
          imageBase64,
          mimeType: "image/jpeg",
          planId: selectedPlan?.id ?? null,
          amountExpected: amountCents,
          method,
        }),
      })
      let data: DatosIA & { error?: string; bloqueada?: boolean }
      try { data = await res.json() }
      catch { setErrorMsg(`Error de conexión (Status: ${res.status}). Intenta de nuevo.`); setPaso("error"); return }

      if (!res.ok) {
        if (data.strikes !== undefined) setStrikeCount(data.strikes)
        setErrorMsg(data.error || "Error al analizar.")
        setPaso("error")
        return
      }

      setDatosIA(data)
      if (data.strikes !== undefined) setStrikeCount(data.strikes)
      setPaso("confirmar")
    } catch {
      setErrorMsg("Error de red. Verifica tu conexión a internet.")
      setPaso("error")
    }
  }

  const handleConfirmar = async () => {
    if (!imageBase64 || amountCents <= 0) return
    setPaso("enviando")
    try {
      const res = await fetch("/api/analizar-comprobante", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "confirmar",
          imageBase64,
          mimeType: "image/jpeg",
          amountCents,
        }),
      })
      let data: { aprobado?: boolean; error?: string; strikes?: number }
      try { data = await res.json() }
      catch { setErrorMsg(`Error de conexión (Status: ${res.status}). Intenta de nuevo.`); setPaso("error"); return }

      if (!res.ok) {
        if (data.strikes !== undefined) setStrikeCount(data.strikes)
        setErrorMsg(data.error || "Error al procesar.")
        setPaso("error")
        return
      }

      setPaso(data.aprobado ? "aprobado" : "pendiente")
    } catch {
      setErrorMsg("Error de red. Verifica tu conexión a internet.")
      setPaso("error")
    }
  }

  const handleCash = async () => {
    if (amountCents <= 0) return
    setPaso("enviando")
    const fd = new FormData()
    if (selectedPlan) fd.append("plan_id", selectedPlan.id)
    fd.append("amount_cents", String(amountCents))
    fd.append("method", method)
    const result = await uploadPaymentAction(fd)
    if (result.error) { setErrorMsg(result.error); setPaso("error") }
    else setPaso("pendiente")
  }

  const reiniciar = () => {
    setPaso("plan")
    setSelectedPlan(null)
    setPreview(null)
    setImageBase64(null)
    setDatosIA(null)
    setErrorMsg("")
    setStrikeCount(0)
    if (fileRef.current) fileRef.current.value = ""
  }

  // Stepper
  const stepLabels = ["Plan", "Comprobante", "Confirmar"]
  const stepIdx = ["plan"].includes(paso) ? 0
    : ["imagen", "preview", "analizando"].includes(paso) ? 1
    : ["confirmar", "enviando"].includes(paso) ? 2
    : -1

  const showStepper = ["plan", "imagen", "preview", "analizando", "confirmar", "enviando"].includes(paso)

  // ── BLOQUEADA ─────────────────────────────────────────────────────────────────
  if (comprobanteBloqueado) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-6 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
          <AlertTriangle className="size-7 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-red-400 mb-2">Comprobantes bloqueados</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Tu acceso automático fue <strong className="text-yellow-400">bloqueado por múltiples intentos sospechosos</strong>.
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            Contacta al administrador del gimnasio para reactivar esta opción.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Stepper */}
      {showStepper && (
        <div className="flex items-center gap-1 mb-5">
          {stepLabels.map((label, i) => {
            const done = stepIdx > i
            const active = stepIdx === i
            return (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors ${
                    done ? "bg-red-600 text-white"
                    : active ? "border-2 border-red-600 text-red-400 bg-transparent"
                    : "bg-zinc-800 text-zinc-600"
                  }`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] font-medium ${
                    active ? "text-red-400"
                    : done ? "text-zinc-500"
                    : "text-zinc-700"
                  }`}>{label}</span>
                </div>
                {i < 2 && (
                  <div className={`mb-3 flex-1 h-px ${done ? "bg-red-600" : "bg-zinc-800"}`} />
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      {/* ── PLAN ─────────────────────────────────────────────────────────────── */}
      {paso === "plan" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">¿Qué plan vas a pagar?</p>

          {/* Planes */}
          {plans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pt-2.5">
              {(() => {
                const singleDayPlan = plans.find(p => p.days === 1 || p.name.toLowerCase().includes("suelto"))
                const singleDayPrice = singleDayPlan ? singleDayPlan.price_cents : 500000
                const isMostChosenPlan = (p: Plan) => p.name.toLowerCase().replace(/í/g, "i").includes("5 dias/semana")
                const sortedPlans = [...plans].sort((a, b) =>
                  Number(isMostChosenPlan(b)) - Number(isMostChosenPlan(a)) || b.price_cents - a.price_cents
                )
                return sortedPlans.map((plan) => {
                  const disc = computePlanDiscount(plan.price_cents, plan.days, singleDayPrice)
                  const isSelected = selectedPlan?.id === plan.id
                  const isMostChosen = isMostChosenPlan(plan)

                  // Nombre corto (sin paréntesis) para que el título siempre sea de una sola línea.
                  const parenDetails = [...plan.name.matchAll(/\(([^)]+)\)/g)].map((m) => m[1])
                  const baseName = plan.name.replace(/\s*\([^)]*\)/g, "").trim()
                  const extraDetails = parenDetails.filter((d) => !d.includes(String(plan.days)))
                  const metaLine = [
                    ...extraDetails,
                    `${plan.days} ${plan.days === 1 ? "día" : "días"} de uso`,
                    `${plan.duration_days} días de vigencia`,
                  ].join(" · ")

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(isSelected ? null : plan)}
                      className={`relative w-full flex h-[76px] items-center gap-3 rounded-2xl border p-4 text-left shadow-[0_4px_25px_rgba(0,0,0,0.65)] transition-[border-color,background-color,box-shadow] ${
                        isSelected
                          ? "border-green-500 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_0_12px_rgba(34,197,94,0.25)]"
                          : "border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 hover:border-zinc-600"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute -left-2 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full border border-green-500 bg-zinc-950 text-green-500">
                          <Check className="size-3" strokeWidth={3} />
                        </span>
                      )}
                      {isMostChosen && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border border-amber-200/60 bg-gradient-to-b from-amber-300 via-yellow-500 to-amber-700 pl-1.5 pr-2.5 py-1 text-[10px] font-bold text-amber-950 uppercase shadow-[0_3px_10px_rgba(0,0,0,0.5)]">
                          <Star className="size-3 fill-amber-950" />
                          Más elegido
                        </span>
                      )}
                      <div className="w-11 h-11 rounded-xl border border-white/5 bg-zinc-950 flex items-center justify-center shrink-0">
                        <Calendar className="size-5 text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="font-bebas text-lg tracking-wide uppercase text-white block truncate">{baseName}</span>
                          <span className="text-[11px] text-zinc-500 block truncate">{metaLine}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-bebas text-xl tracking-wide text-white">{formatCOP(plan.price_cents)}</span>
                          {disc > 0 && (
                            <span className="rounded-md bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400 uppercase">
                              -{disc}%
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              })()}
            </div>
          )}

          {/* Método de pago */}
          <div>
            <label className="text-xs font-medium text-zinc-500 mb-1.5 block">Método de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMethod(key)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    method === key
                      ? "border-red-600 bg-red-600/10 text-red-400"
                      : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Continuar */}
          <button
            onClick={() => needsReceipt ? setPaso("imagen") : handleCash()}
            disabled={amountCents <= 0}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-colors ${
              amountCents > 0
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
            }`}
          >
            {amountCents > 0 ? formatCOP(amountCents) : "Selecciona un plan"} <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* ── IMAGEN ───────────────────────────────────────────────────────────── */}
      {paso === "imagen" && (
        <div className="space-y-4">
          {/* Aviso antifraude */}
          <div className="flex gap-3 items-start rounded-xl border border-yellow-900/40 bg-yellow-950/15 px-4 py-3">
            <ShieldCheck className="size-4 text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-yellow-400 mb-0.5">Seguridad antifraude</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Alterar o falsificar un comprobante puede resultar en el{" "}
                <strong className="text-yellow-400">bloqueo permanente</strong> de tu cuenta.
                Cada comprobante será revisado por una <strong className="text-yellow-400">persona real</strong>.
              </p>
            </div>
          </div>

          {/* Monto recordatorio */}
          <div className="rounded-xl border border-white/8 bg-zinc-900/50 px-4 py-2.5">
            <p className="text-xs text-zinc-500">
              Monto a transferir: <strong className="text-zinc-100 text-sm">{formatCOP(amountCents)}</strong>
            </p>
          </div>

          {/* Cuentas del gym */}
          {cuentas.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Transfiere a</p>
              <div className="space-y-2">
                {cuentas.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{c.metodo}</p>
                      <p className="text-base font-bold text-zinc-100 tracking-widest">{c.valor}</p>
                      {c.titular && <p className="text-[11px] text-zinc-500 truncate">{c.titular}</p>}
                    </div>
                    <button
                      onClick={() => copiar(c.valor)}
                      className={`shrink-0 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                        copiado === c.valor
                          ? "border-green-600/50 bg-green-600/10 text-green-400"
                          : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {copiado === c.valor ? <><Check className="size-3" /> Copiado</> : <><Copy className="size-3" /> Copiar</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={e => e.preventDefault()}
            className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-white/15 bg-white/[0.02] p-8 cursor-pointer hover:border-red-600/40 hover:bg-red-950/5 transition-colors text-center"
          >
            <ImageIcon className="size-9 text-zinc-600" />
            <div>
              <p className="text-sm font-semibold text-zinc-400">Toca para subir el comprobante</p>
              <p className="text-xs text-zinc-600 mt-1">Nequi, Daviplata, transferencia — JPG o PNG, máx. 5 MB</p>
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          <button
            onClick={() => setPaso("plan")}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← Cambiar plan
          </button>
        </div>
      )}

      {/* ── PREVIEW ──────────────────────────────────────────────────────────── */}
      {paso === "preview" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">Revisa que la imagen sea clara y legible.</p>
          {preview && (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
              <img src={preview} alt="Preview comprobante" className="w-full max-h-80 object-contain block" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button
              onClick={iniciarAnalisis}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-3 text-sm font-bold text-white transition-colors"
            >
              <CheckCircle className="size-4" /> Se ve bien — Analizar
            </button>
            <button
              onClick={() => { setPreview(null); setImageBase64(null); if (fileRef.current) fileRef.current.value = ""; setPaso("imagen") }}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ↩ Cambiar imagen
            </button>
          </div>
        </div>
      )}

      {/* ── ANALIZANDO ───────────────────────────────────────────────────────── */}
      {paso === "analizando" && (
        <div className="space-y-4 text-center py-4">
          {preview && (
            <img src={preview} alt="Comprobante" className="w-full max-h-44 object-contain rounded-xl border border-white/8 mx-auto" />
          )}
          <Loader2 className="size-8 animate-spin text-red-500 mx-auto" />
          <div>
            <p className="text-sm font-semibold text-zinc-200">Analizando comprobante con IA...</p>
            <p className="text-xs text-zinc-500 mt-1">Verificando monto y datos</p>
          </div>
        </div>
      )}

      {/* ── CONFIRMAR ────────────────────────────────────────────────────────── */}
      {paso === "confirmar" && datosIA && (() => {
        const sinMonto = datosIA.monto === 0

        // Validación: registrar si la fecha está vencida (>24h, Colombia UTC-5)
        const fechaVencida = (() => {
          if (!datosIA.fecha_iso) return false
          const ahoraCol = new Date(Date.now() - 5 * 60 * 60 * 1000)
          const hoy = ahoraCol.toISOString().slice(0, 10)
          const ayer = new Date(ahoraCol.getTime() - 86400000).toISOString().slice(0, 10)
          return datosIA.fecha_iso !== hoy && datosIA.fecha_iso !== ayer
        })()

        const titularOk = datosIA.nombre_coincide !== false || datosIA.titular_flexible
        const puede = amountCents > 0
          && !datosIA.imagen_repetida
          && !datosIA.referencia_repetida
          && titularOk
          && datosIA.transaccion_exitosa !== false
          && datosIA.numero_coincide !== false

        return (
          <div className="space-y-3">
            {preview && (
              <img src={preview} alt="Comprobante" className="w-full max-h-44 object-contain rounded-xl border border-white/8" />
            )}

            {/* Comprobante repetido */}
            {(datosIA.imagen_repetida || datosIA.referencia_repetida) && (
              <div className="rounded-xl border border-red-700/50 bg-red-950/20 px-4 py-3">
                <p className="text-sm font-bold text-red-400 mb-1">🚫 Comprobante ya registrado</p>
                <p className="text-xs text-zinc-400">
                  {datosIA.referencia_repetida
                    ? <>La referencia <strong className="text-zinc-200">{datosIA.referencia}</strong> ya fue enviada anteriormente.</>
                    : "Este comprobante ya fue enviado anteriormente."}
                  {" "}No puedes usar el mismo comprobante dos veces.
                </p>
                {strikeCount >= 1 && strikeCount < 3 && (
                  <p className="mt-2 text-[11px] font-bold text-yellow-400">
                    ⚠️ Strike {strikeCount}/3.{strikeCount >= 2 ? " Tu acceso automático queda bloqueado 24 horas." : " Al llegar a 3 tu acceso quedará en revisión manual."}
                  </p>
                )}
                {strikeCount >= 3 && (
                  <p className="mt-2 text-[11px] font-bold text-red-400">
                    🚫 Tu acceso automático fue desactivado. Contacta al administrador.
                  </p>
                )}
              </div>
            )}

            {/* Destinatario */}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && datosIA.nombre_coincide === false && !datosIA.titular_flexible && (
              <div className="rounded-xl border border-red-700/40 bg-red-950/15 px-4 py-3">
                <p className="text-xs font-bold text-red-400 mb-1">🚫 Destinatario incorrecto</p>
                <p className="text-xs text-zinc-400">
                  El comprobante está a nombre de{" "}
                  <strong className="text-zinc-200">{datosIA.destinatario || "desconocido"}</strong>, pero debe ser a{" "}
                  <strong className="text-red-300">{datosIA.titular_esperado}</strong>.
                </p>
              </div>
            )}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && datosIA.nombre_coincide === false && datosIA.titular_flexible && (
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 px-4 py-3">
                <p className="text-xs font-bold text-yellow-400">
                  ⚠️ El destinatario ({datosIA.destinatario || "desconocido"}) no coincide, pero tu cuenta tiene aprobación automática — puedes continuar.
                </p>
              </div>
            )}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && datosIA.nombre_coincide === null && (
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 px-4 py-3">
                <p className="text-xs font-bold text-yellow-400">
                  ⚠️ No pude leer el nombre del destinatario. Asegúrate de haber transferido a{" "}
                  <strong>{datosIA.titular_esperado}</strong>.
                </p>
              </div>
            )}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && datosIA.nombre_coincide === true && (
              <div className="rounded-xl border border-green-800/40 bg-green-950/10 px-4 py-2.5">
                <p className="text-xs font-bold text-green-400">✓ Destinatario: {datosIA.destinatario}</p>
              </div>
            )}

            {/* Monto */}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && sinMonto && (
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 px-4 py-2.5">
                <p className="text-xs font-bold text-yellow-400">⚠️ No pude leer el monto del comprobante.</p>
              </div>
            )}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && !sinMonto && datosIA.coincide_monto === false && (
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 px-4 py-3">
                <p className="text-xs font-bold text-yellow-400 mb-0.5">⚠️ Monto diferente al registrado</p>
                <p className="text-xs text-zinc-500">
                  Esperado {formatCOP(amountCents)}, comprobante muestra {formatPesos(datosIA.monto)}.
                </p>
              </div>
            )}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && !sinMonto && datosIA.coincide_monto && (
              <div className="rounded-xl border border-green-800/40 bg-green-950/10 px-4 py-2.5">
                <p className="text-xs font-bold text-green-400">✓ Monto verificado: {formatPesos(datosIA.monto)}</p>
              </div>
            )}

            {/* Fecha */}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && !datosIA.fecha_iso && (
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 px-4 py-2.5">
                <p className="text-xs font-bold text-yellow-400">⚠️ No pude leer la fecha — se enviará a revisión manual aunque tengas aprobación automática.</p>
              </div>
            )}
            {!datosIA.imagen_repetida && !datosIA.referencia_repetida && datosIA.fecha_iso && fechaVencida && (
              <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/10 px-4 py-2.5">
                <p className="text-xs font-bold text-yellow-400">⚠️ La fecha del comprobante tiene más de 24 horas — se enviará a revisión manual.</p>
              </div>
            )}

            {/* Transacción */}
            {datosIA.transaccion_exitosa === false && (
              <div className="rounded-xl border border-red-700/40 bg-red-950/15 px-4 py-2.5">
                <p className="text-xs font-bold text-red-400">🚫 El comprobante muestra una transacción no completada.</p>
              </div>
            )}

            {/* Número destino */}
            {datosIA.numero_coincide === false && (
              <div className="rounded-xl border border-red-700/40 bg-red-950/15 px-4 py-2.5">
                <p className="text-xs font-bold text-red-400">🚫 El número de cuenta del comprobante no coincide con el registrado.</p>
              </div>
            )}

            {/* Datos extraídos */}
            <div className="rounded-xl border border-white/8 bg-zinc-900/50 p-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Datos del comprobante</p>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] text-zinc-600">Monto detectado</p>
                  <p className="text-sm font-bold text-zinc-300">{sinMonto ? "—" : formatPesos(datosIA.monto)}</p>
                </div>
                {datosIA.referencia && (
                  <div>
                    <p className="text-[10px] text-zinc-600">Referencia</p>
                    <p className="text-xs text-zinc-400 font-mono">{datosIA.referencia}</p>
                  </div>
                )}
                <div className="flex gap-4 flex-wrap">
                  {datosIA.entidad && (
                    <div><p className="text-[10px] text-zinc-600">Entidad</p><p className="text-xs text-zinc-300">{datosIA.entidad}</p></div>
                  )}
                  {datosIA.fecha && (
                    <div><p className="text-[10px] text-zinc-600">Fecha</p><p className="text-xs text-zinc-300">{datosIA.fecha}</p></div>
                  )}
                  {datosIA.hora && (
                    <div><p className="text-[10px] text-zinc-600">Hora</p><p className="text-xs text-zinc-300">{datosIA.hora}</p></div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmar}
                disabled={!puede}
                className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                  puede
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                }`}
              >
                Confirmar y enviar
              </button>
              <button
                onClick={reiniciar}
                className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Reiniciar
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── ENVIANDO ─────────────────────────────────────────────────────────── */}
      {paso === "enviando" && (
        <div className="text-center py-10">
          <Loader2 className="size-8 animate-spin text-red-500 mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Enviando solicitud...</p>
        </div>
      )}

      {/* ── APROBADO ─────────────────────────────────────────────────────────── */}
      {paso === "aprobado" && (
        <div className="text-center py-6 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
            <CheckCircle className="size-8 text-green-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-green-400 mb-1">¡Membresía activada!</h3>
            <p className="text-sm text-zinc-400">
              Tu pago de <strong className="text-zinc-200">{formatCOP(amountCents)}</strong> fue aprobado automáticamente.
            </p>
            {selectedPlan && (
              <p className="text-xs text-zinc-500 mt-1">{selectedPlan.name} · {selectedPlan.days} días de uso</p>
            )}
          </div>
          <button
            onClick={reiniciar}
            className="mt-2 rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Listo
          </button>
        </div>
      )}

      {/* ── PENDIENTE ────────────────────────────────────────────────────────── */}
      {paso === "pendiente" && (
        <div className="text-center py-6 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-900/20">
            {method === "cash"
              ? <Banknote className="size-7 text-yellow-400" />
              : <Upload className="size-7 text-yellow-400" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-yellow-400 mb-1">
              {method === "cash" ? "Pago en efectivo registrado" : "Comprobante enviado"}
            </h3>
            <p className="text-sm text-zinc-400">
              Monto: <strong className="text-zinc-200">{formatCOP(amountCents)}</strong>
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {method === "cash"
                ? "El administrador confirmará tu pago en efectivo y activará tu membresía pronto."
                : "El administrador revisará tu comprobante y activará tu membresía pronto."}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={reiniciar}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Enviar otro
            </button>
          </div>
        </div>
      )}

      {/* ── ERROR ────────────────────────────────────────────────────────────── */}
      {paso === "error" && (
        <div className="text-center py-6 space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <AlertCircle className="size-7 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-red-400 mb-2">Error</h3>
            <p className="text-sm text-zinc-400">{errorMsg}</p>
          </div>
          {strikeCount >= 1 && strikeCount < 3 && (
            <p className="text-xs font-bold text-yellow-400">
              ⚠️ Strike {strikeCount}/3. Al llegar a 3 tu acceso automático quedará bloqueado.
            </p>
          )}
          {strikeCount === 2 && (
            <p className="text-xs text-yellow-400">
              Tu acceso automático está bloqueado por 24 horas.
            </p>
          )}
          {strikeCount >= 3 && (
            <p className="text-xs font-bold text-red-400">
              🚫 Tu acceso automático fue desactivado. Contacta al administrador.
            </p>
          )}
          <button
            onClick={reiniciar}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  )
}

// Para mantener compatibilidad si hay algún import default en otro lado
export default PaymentUploadForm
