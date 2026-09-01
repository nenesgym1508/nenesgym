"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/require-admin"
import { computeEffectiveStatus, searchAdminClients } from "@/services/memberships.service"
import { todayInBogota, nowInBogota, gymSession, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { ROUTES, adminClienteDetalle } from "@/constants/routes"
import type { MembershipStatus } from "@/types/membership"
import type { PaymentMethod } from "@/types/payment"
import type { GoalType } from "@/types/progress"
import { adminCreateClientSchema } from "@/schemas/client.schema"
import { buildPlaceholderEmail } from "@/lib/placeholder-email"
import { traducirErrorAuth } from "@/lib/auth/auth-errors"

const PAYMENT_METHODS: PaymentMethod[] = ["cash", "transfer", "nequi", "daviplata", "other"]

// Buscador rápido del dashboard: consulta en Postgres (ilike + límite) en vez de
// descargar toda la lista de clientes al navegador.
export async function searchClientsQuickAction(
  q: string
): Promise<{ id: string; full_name: string | null; email: string | null }[]> {
  const ctx = await requireAdmin()
  if ("error" in ctx) return []
  const term = q.trim()
  if (!term) return []
  const { rows } = await searchAdminClients({ search: term, status: "todos", page: 1, pageSize: 6 })
  return rows.map((r) => ({
    id: r.id,
    full_name: r.profile?.full_name ?? null,
    email: r.profile?.email ?? null,
  }))
}

export async function updateGymSettingsAction(input: {
  name: string
  graceDays: number
  nequiNumber?: string
  nequiTitular?: string
  daviplataNumber?: string
  davaplataTitular?: string
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.name.trim()) return { error: "El nombre es obligatorio" }
  if (input.graceDays < 0 || input.graceDays > 60)
    return { error: "Los días de gracia deben estar entre 0 y 60" }

  const adminClient = createAdminClient()
  const updatePayload: Record<string, any> = {
    name: input.name.trim(),
    grace_days: input.graceDays,
  }

  if (input.nequiNumber !== undefined) updatePayload.nequi_number = input.nequiNumber.trim() || null
  if (input.nequiTitular !== undefined) updatePayload.nequi_titular = input.nequiTitular.trim() || null
  if (input.daviplataNumber !== undefined) updatePayload.daviplata_number = input.daviplataNumber.trim() || null
  if (input.davaplataTitular !== undefined) updatePayload.daviplata_titular = input.davaplataTitular.trim() || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("gyms")
    .update(updatePayload)
    .eq("id", ctx.gymId)
  if (error) return { error: error.message }

  // Config del gym cacheada (tag "gym"): invalidar para que el cambio aparezca al abrir.
  updateTag("gym")
  revalidatePath(ROUTES.ADMIN_MAS)
  return { success: true }
}

export async function toggleAutoAprobacionAction(clientId: string, value: boolean) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("clients")
    .update({ auto_aprobacion: value })
    .eq("id", clientId)
  if (error) return { error: error.message }

  revalidatePath(ROUTES.ADMIN_CLIENTES)
  return { success: true }
}

export async function desbloquearComprobanteAction(clientId: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const adminClient = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("clients")
    .update({
      comprobante_bloqueado: false,
      comprobante_bloqueado_hasta: null,
    })
    .eq("id", clientId)
  if (error) return { error: error.message }

  revalidatePath(ROUTES.ADMIN_CLIENTES)
  return { success: true }
}

export async function savePlanAction(input: {
  id?: string
  name: string
  priceCents: number
  days: number
  durationDays: number
  /** false = tarifa privada: no aparece en la lista del cliente. Ver migración 032. */
  visibleToClients?: boolean
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  if (!input.name.trim()) return { error: "El nombre del plan es obligatorio" }
  if (input.priceCents < 0 || input.days <= 0 || input.durationDays <= 0)
    return { error: "Precio, días y duración deben ser valores válidos" }

  const row = {
    gym_id: ctx.gymId,
    name: input.name.trim(),
    price_cents: input.priceCents,
    days: input.days,
    duration_days: input.durationDays,
    visible_to_clients: input.visibleToClients ?? true,
  }

  const { error } = input.id
    ? await ctx.supabase.from("plans").update(row).eq("id", input.id)
    : await ctx.supabase.from("plans").insert(row)
  if (error) return { error: error.message }

  // Planes cacheados (tag "plans"): invalidar para que el cambio aparezca al abrir.
  updateTag("plans")
  revalidatePath(ROUTES.ADMIN_MAS)
  return { success: true }
}

/**
 * Crea un plan a medida para UN cliente concreto y devuelve su id.
 *
 * Nace **privado** (`visible_to_clients = false`): es una tarifa negociada con
 * una persona, no una oferta del gimnasio. Con la regla de
 * `getPlansVisibleToClient`, el cliente al que se le asigne pasa a verlo —y solo
 * él— así que puede renovarlo por su cuenta sin volver al mostrador.
 *
 * ⚠️ Devuelve el id porque el llamador tiene que cobrar CON ese plan. Por eso
 * no se reutiliza `savePlanAction`, que no lo devuelve.
 */
export async function createCustomPlanAction(input: {
  name: string
  priceCents: number
  days: number
  durationDays: number
}): Promise<{ id: string } | { error: string }> {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  const name = input.name.trim()
  if (!name) return { error: "El plan a medida necesita un nombre" }
  if (!Number.isInteger(input.days) || input.days < 1 || input.days > 400)
    return { error: "Los días del plan no son válidos" }
  if (!Number.isInteger(input.durationDays) || input.durationDays < 1 || input.durationDays > 400)
    return { error: "La vigencia del plan no es válida" }
  if (!Number.isInteger(input.priceCents) || input.priceCents < 0)
    return { error: "El precio no es válido" }

  const { data, error } = await ctx.supabase
    .from("plans")
    .insert({
      gym_id: ctx.gymId,
      name,
      price_cents: input.priceCents,
      days: input.days,
      duration_days: input.durationDays,
      visible_to_clients: false,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  updateTag("plans")
  revalidatePath(ROUTES.ADMIN_MAS)
  return { id: data.id }
}

export async function setPlanActiveAction(planId: string, isActive: boolean) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  const { error } = await ctx.supabase
    .from("plans")
    .update({ is_active: isActive })
    .eq("id", planId)
  if (error) return { error: error.message }
  updateTag("plans")
  revalidatePath(ROUTES.ADMIN_MAS)
  return { success: true }
}

export async function deletePlanAction(planId: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  const { error } = await ctx.supabase
    .from("plans")
    .delete()
    .eq("id", planId)
  if (error) {
    // Código de violación de clave foránea en Postgres: 23503
    if (error.code === "23503") {
      return { error: "No se puede eliminar este plan porque tiene membresías o pagos asociados. Prueba desactivándolo en su lugar." }
    }
    return { error: error.message }
  }
  updateTag("plans")
  revalidatePath(ROUTES.ADMIN_MAS)
  return { success: true }
}


export async function approvePaymentAction(
  paymentId: string,
  totalDays: number,
  durationDays: number
) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const { data, error } = await ctx.supabase.rpc("approve_payment", {
    p_payment_id: paymentId,
    p_total_days: totalDays,
    p_duration_days: durationDays,
  })

  if (error) return { error: error.message }
  const result = data as { ok: boolean; code?: string; message?: string }
  if (!result?.ok) return { error: result?.message ?? "Error al aprobar" }

  updateTag("admin-payments")
  revalidatePath(ROUTES.ADMIN_PAGOS)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  return { success: true }
}

export async function rejectPaymentAction(paymentId: string, note: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const { data, error } = await ctx.supabase.rpc("reject_payment", {
    p_payment_id: paymentId,
    p_note: note,
  })

  if (error) return { error: error.message }
  const result = data as { ok: boolean; message?: string }
  if (!result?.ok) return { error: result?.message ?? "Error al rechazar" }

  updateTag("admin-payments")
  revalidatePath(ROUTES.ADMIN_PAGOS)
  return { success: true }
}

export async function manualCheckInAction(clientId: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  // Service-role: la validación crítica vive en el backend (server action), no en el front.
  const admin = createAdminClient()

  const { data: membership } = await admin
    .from("memberships")
    .select("*")
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .order("end_date", { ascending: false })
    .limit(1)
    .single()

  if (!membership) return { error: "El cliente no tiene una membresía activa" }

  const today = todayInBogota()
  // Modelo base calendario: las faltas también descuentan días.
  const elapsedDays = eligibleDaysElapsed(
    membership.start_date,
    today,
    daysPerWeekForPlan(membership.total_days)
  )
  const status = computeEffectiveStatus(
    elapsedDays,
    membership.total_days,
    membership.end_date,
    membership.grace_days,
    membership.status as MembershipStatus
  )
  if (status === "exhausted") return { error: "El cliente no tiene días disponibles" }
  if (status === "expired") return { error: "La membresía del cliente está vencida" }

  // Franja del día: permite hasta 2 ingresos (mañana + tarde), 1 por franja.
  const session = gymSession(nowInBogota())

  const { data: existing } = await admin
    .from("attendance")
    .select("id")
    .eq("client_id", clientId)
    .eq("check_in_date", today)
    .eq("session", session)
    .limit(1)
    .maybeSingle()
  if (existing) {
    return {
      error: `El cliente ya registró su ingreso de la ${session === "am" ? "mañana" : "tarde"}`,
    }
  }

  const { error: insertError } = await admin.from("attendance").insert({
    gym_id: ctx.gymId,
    client_id: clientId,
    membership_id: membership.id,
    check_in_date: today,
    source: "admin_manual",
    session,
  })
  if (insertError) return { error: insertError.message }

  // @ts-expect-error — función creada en REGISTROS/migrations/increment_used_days.sql, regenerar tipos tras aplicarla
  const { error: updateError } = await admin.rpc("increment_used_days", {
    p_membership_id: membership.id,
  })
  if (updateError) return { error: updateError.message }

  revalidatePath(ROUTES.ADMIN_ASISTENCIAS)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  return { success: true }
}

// Ajuste manual de una membresía existente: días totales y/o fecha de
// vencimiento. Los "días restantes" que ve el cliente/admin se recalculan
// siempre en vivo (total_days - días hábiles transcurridos desde start_date,
// ver eligibleDaysElapsed) — no hay contador que sincronizar aparte.
export async function adjustMembershipAction(input: {
  membershipId: string
  clientId: string
  totalDays: number
  endDate: string
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  if (!Number.isInteger(input.totalDays) || input.totalDays <= 0)
    return { error: "Los días totales deben ser un número entero mayor a 0" }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.endDate))
    return { error: "Fecha de vencimiento inválida" }

  const { error } = await ctx.supabase
    .from("memberships")
    .update({ total_days: input.totalDays, end_date: input.endDate })
    .eq("id", input.membershipId)
  if (error) return { error: error.message }

  revalidatePath(ROUTES.ADMIN_CLIENTES)
  revalidatePath(adminClienteDetalle(input.clientId))
  return { success: true }
}

// Cancela la membresía activa del cliente. No la borra (queda en el
// historial con status='cancelled'); computeEffectiveStatus la excluye de
// inmediato de "activa/gracia" y deja de contar para check-in.
export async function cancelMembershipAction(membershipId: string, clientId: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const { error } = await ctx.supabase
    .from("memberships")
    .update({ status: "cancelled" })
    .eq("id", membershipId)
  if (error) return { error: error.message }

  revalidatePath(ROUTES.ADMIN_CLIENTES)
  revalidatePath(adminClienteDetalle(clientId))
  return { success: true }
}

// Progreso físico editado por el admin en nombre de un cliente (misma vista
// que usa el cliente — ver ProgressView). progress_records solo tiene RLS de
// escritura para "el propio cliente" (no hay policy admin de INSERT/UPDATE),
// así que se escribe con el cliente de service-role, con requireAdmin como
// guarda — mismo patrón que el resto de este archivo.
export async function adminSaveProgressRecordAction(clientId: string, data: {
  weight_kg?: number
  height_cm?: number
  waist_cm?: number
  chest_cm?: number
  arm_cm?: number
  leg_cm?: number
  note?: string
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const admin = createAdminClient()
  const today = todayInBogota()

  // `bmi` es columna GENERATED ALWAYS en Postgres — no enviar valor manual.
  const payload = {
    gym_id: ctx.gymId,
    client_id: clientId,
    weight_kg: data.weight_kg ?? null,
    height_cm: data.height_cm ?? null,
    waist_cm: data.waist_cm ?? null,
    chest_cm: data.chest_cm ?? null,
    arm_cm: data.arm_cm ?? null,
    leg_cm: data.leg_cm ?? null,
    note: data.note ?? null,
    measured_date: today,
    created_by: "admin",
  }

  // upsert atómico sobre la restricción única (client_id, measured_date) —
  // ver la misma corrección y su porqué en progress.actions.ts/addProgressRecord.
  const { error } = await admin
    .from("progress_records")
    .upsert(payload, { onConflict: "client_id,measured_date" })
  if (error) return { error: error.message }

  revalidatePath(adminClienteDetalle(clientId))
  return { success: true }
}

export async function adminSetProgressGoalAction(clientId: string, goalType: GoalType) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }

  const admin = createAdminClient()

  await admin
    .from("progress_goals")
    .update({ status: "cancelled" })
    .eq("client_id", clientId)
    .eq("status", "active")

  const { error } = await admin.from("progress_goals").insert({
    gym_id: ctx.gymId,
    client_id: clientId,
    goal_type: goalType,
    created_by: "admin",
  })
  if (error) return { error: error.message }

  revalidatePath(adminClienteDetalle(clientId))
  return { success: true }
}

/**
 * ¿Ese WhatsApp ya es de un cliente? Se consulta MIENTRAS el admin lo teclea.
 *
 * Existe porque el aviso llegaba tardísimo: el admin rellenaba nombre, teléfono,
 * correo, elegía plan y método de pago, pulsaba "Registrar" y solo entonces le
 * saltaba "Ya existe un cliente con ese WhatsApp". Todo el trabajo para nada.
 *
 * ⚠️ NO sustituye a la comprobación de `createClientAction`, que se queda donde
 * está. Esta es una cortesía de interfaz; aquella es la que de verdad impide el
 * duplicado, porque entre teclear y guardar pueden pasar minutos y otra persona
 * puede haber dado de alta al mismo cliente.
 *
 * Solo devuelve el nombre, para que el admin reconozca de quién se trata. Nada
 * más: es un endpoint que responde a un teléfono que el llamante propone, así
 * que cuanto menos cuente, mejor.
 */
export async function checkClientPhoneAction(
  phone: string
): Promise<{ taken: boolean; name?: string }> {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { taken: false }

  const digits = (phone ?? "").replace(/\D/g, "")
  // Misma canonicalización que el alta (ver adminCreateClientSchema): si no,
  // se compararía contra una forma que no es la que hay guardada.
  const canonico = digits.length === 12 && digits.startsWith("57") ? digits.slice(2) : digits
  if (canonico.length < 10) return { taken: false }

  const admin = createAdminClient()
  const { data } = await admin
    .from("profiles")
    .select("full_name")
    .eq("phone", canonico)
    .limit(1)
    .maybeSingle()

  return data ? { taken: true, name: data.full_name ?? undefined } : { taken: false }
}

/**
 * Borra un cliente de la base para siempre: su ficha, todo su historial y su
 * cuenta de acceso.
 *
 * ⚠️ NO TIENE VUELTA ATRÁS. No hay papelera ni copia. Por eso:
 *   · la interfaz obliga a escribir ELIMINAR antes de habilitar el botón, y
 *   · aquí se vuelve a exigir esa palabra, porque una acción de servidor se
 *     puede invocar sin pasar por la pantalla.
 *
 * Se borra de HIJOS A PADRES a mano. Las FK de este esquema no van todas en
 * cascada: intentar borrar `clients` con pagos vivos falla con 23503.
 *
 * ⚠️ También se lleva el PERFIL MARCADOR que pudo quedar atrás. Cuando alguien
 * acepta una invitación, `accept_client_invitation` repunta `clients.profile_id`
 * a su cuenta nueva y deja el perfil viejo huérfano a propósito (para poder
 * revertir). Si no se limpiara aquí, borrar clientes iría dejando cuentas
 * sueltas en `auth.users` — pasó de verdad: tras vaciar la base quedaron dos.
 */
export async function deleteClientCompletelyAction(
  clientId: string,
  confirmacion: string
): Promise<{ success: true; nombre: string } | { error: string }> {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  if (confirmacion.trim().toUpperCase() !== "ELIMINAR") {
    return { error: 'Escribe ELIMINAR para confirmar' }
  }

  const admin = createAdminClient()

  const { data: cliente } = await admin
    .from("clients")
    .select("id, gym_id, profile_id, profile:profiles(full_name, role)")
    .eq("id", clientId)
    .maybeSingle()

  if (!cliente) return { error: "Ese cliente ya no existe" }
  if (cliente.gym_id !== ctx.gymId) return { error: "Ese cliente no es de este gimnasio" }

  const perfil = cliente.profile as { full_name?: string | null; role?: string } | null
  // Cinturón de seguridad: la cuenta del gimnasio no se borra por aquí ni
  // aunque alguien fabrique la petición a mano.
  if (perfil?.role === "admin") return { error: "No se puede eliminar la cuenta del gimnasio" }

  const nombre = perfil?.full_name ?? "Cliente"

  // Perfiles marcador que este cliente dejó atrás al vincular su cuenta.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitaciones } = await (admin as any)
    .from("client_invitations")
    .select("replaced_profile_id")
    .eq("client_id", clientId)
  const marcadores: string[] = (invitaciones ?? [])
    .map((i: { replaced_profile_id: string | null }) => i.replaced_profile_id)
    .filter((id: string | null): id is string => !!id && id !== cliente.profile_id)

  const HIJAS = [
    "client_invitations", "receipt_verdicts", "attendance", "payments",
    "progress_records", "progress_goals", "client_routine_sessions",
    "client_routines", "client_exercise_library",
    "client_training_routine_favorites", "memberships",
  ] as const

  for (const tabla of HIJAS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from(tabla).delete().eq("client_id", clientId)
    // Una tabla que no exista todavía no debe abortar el borrado entero.
    if (error && !/does not exist/i.test(error.message)) {
      return { error: `No se pudo borrar ${tabla}: ${error.message}` }
    }
  }

  // Los ejercicios que creó como suyos cuelgan de otra columna.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("exercises").delete().eq("owner_client_id", clientId)

  const { error: eCliente } = await admin.from("clients").delete().eq("id", clientId)
  if (eCliente) return { error: `No se pudo borrar la ficha: ${eCliente.message}` }

  // Borrar el usuario de auth arrastra su fila de profiles.
  for (const id of [cliente.profile_id, ...marcadores]) {
    await admin.auth.admin.deleteUser(id)
  }

  updateTag("admin-payments")
  revalidatePath(ROUTES.ADMIN_CLIENTES)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  return { success: true, nombre }
}

export async function createManualPaymentAction(formData: {
  clientId: string
  /**
   * Opcional. Sin plan, la RPC cobra con los días sueltos que se le pasen y la
   * membresía queda sin plan asociado — es el "Plan a medida · solo esta vez",
   * que no deja rastro en el catálogo. La RPC ya lo soportaba
   * (`p_plan_id DEFAULT NULL`); lo que faltaba era permitirlo aquí.
   */
  planId?: string
  amountCents: number
  method: string
  totalDays: number
  durationDays: number
  /**
   * Identificador de idempotencia. La RPC hace `on conflict (client_request_id)
   * do nothing` y devuelve ALREADY_APPLIED si el pago ya se aplicó, así que un
   * doble clic o un reintento no cobran dos veces.
   *
   * ⚠️ Un requestId = UNA intención de cobro. Quien llame a esta acción debe
   * REGENERARLO al abrir el modal y tras cada éxito. Si se reutilizara entre
   * cobros distintos, una renovación devolvería ALREADY_APPLIED y **no se
   * cobraría** — el mismo bug, pero al revés y peor.
   */
  clientRequestId?: string
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  const { supabase } = ctx

  if (!PAYMENT_METHODS.includes(formData.method as PaymentMethod)) {
    return { error: "Método de pago inválido" }
  }

  // Estos dos ya no son siempre los del plan: el modal los reduce cuando el
  // cliente arrastraba días entrenados sin plan. Al dejar de ser una copia literal
  // del catálogo hay que acotarlos — un 0 o un negativo crearía una membresía
  // que nace vencida, y el check-in la daría por agotada desde el primer día.
  const enteroValido = (n: number) => Number.isInteger(n) && n >= 1 && n <= 400
  if (!enteroValido(formData.totalDays) || !enteroValido(formData.durationDays)) {
    return { error: "Los días del plan no son válidos" }
  }

  // Operación atómica: crea el pago y aprueba la membresía en una sola
  // transacción en BD. Elimina el riesgo de pagos huérfanos o membresías
  // duplicadas que existía con el flujo anterior de 2 pasos.
  const { data, error } = await supabase.rpc("create_and_approve_cash_payment", {
    p_client_id:        formData.clientId,
    p_amount_cents:     formData.amountCents,
    p_method:           formData.method,
    p_client_request_id: formData.clientRequestId || undefined,
    p_plan_id:          formData.planId || undefined,
    p_total_days:       formData.totalDays,
    p_duration_days:    formData.durationDays,
  })

  if (error) return { error: error.message }
  const result = data as { ok: boolean; code?: string; message?: string }
  if (!result?.ok) return { error: result?.message ?? "Error al registrar el pago" }

  updateTag("admin-payments")
  revalidatePath(ROUTES.ADMIN_CLIENTES)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  return { success: true }
}

// Alta manual de un cliente desde el panel admin. Resuelve el caso del cliente que
// llega al gimnasio sin el celular encima y no puede registrarse solo.
//
// Por qué crea un usuario de auth aunque el cliente nunca vaya a iniciar sesión:
// clients.profile_id es NOT NULL y admin_search_clients hace JOIN con profiles,
// así que un cliente sin cuenta no existiría para ninguna pantalla del admin.
// Si no hay correo se genera uno marcador (ver @/lib/placeholder-email).
//
// Idempotente respecto al trigger de auth.users: ese trigger ya crea las filas de
// `profiles` y `clients` (verificado en producción: 0 usuarios sin perfil, 0
// perfiles client sin fila en clients), pero no copia el teléfono. Por eso aquí
// se completan/corrigen los datos en vez de insertar a ciegas.
export async function createClientAction(input: {
  full_name: string
  email?: string
  /** Obligatorio: identificador del cliente y canal para vincularle luego su correo. */
  phone: string
  /**
   * Identificador de idempotencia del alta completa. Sirve para dos cosas:
   *  - siembra el correo marcador, haciéndolo determinista → un reintento
   *    recupera el mismo usuario en vez de crear un cliente duplicado;
   *  - se propaga al pago como `p_client_request_id` → no cobra dos veces.
   * ⚠️ Debe regenerarse al abrir el modal y tras cada éxito.
   */
  clientRequestId?: string
  plan?: {
    /** Opcional: sin plan es un cobro suelto ("Plan a medida · solo esta vez"). */
    planId?: string
    amountCents: number
    method: string
    totalDays: number
    durationDays: number
  }
}): Promise<{ error: string } | { clientId: string; planWarning?: string }> {
  const ctx = await requireAdmin()
  // El `?? ` no es defensa vacía: TS normaliza el union que devuelve requireAdmin
  // y tipa `ctx.error` como `string | undefined`. En runtime siempre trae mensaje.
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  // Validación en el servidor: el zod del formulario es solo para UX.
  const parsed = adminCreateClientSchema.safeParse({
    full_name: input.full_name,
    email: input.email ?? "",
    phone: input.phone,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" }
  }

  const fullName = parsed.data.full_name.trim()
  const phone = parsed.data.phone // ya viene solo en dígitos (ver adminCreateClientSchema)
  const realEmail = parsed.data.email?.trim().toLowerCase() || null
  // Con clientRequestId el marcador es determinista: es lo que hace idempotente
  // el alta entera (ver el comentario largo en buildPlaceholderEmail).
  const email = realEmail ?? buildPlaceholderEmail(fullName, input.clientRequestId)

  const admin = createAdminClient()

  // ── Sonda de reanudación ────────────────────────────────────────────────
  // Si ya existe un perfil con este correo MARCADOR, es nuestro propio reintento
  // (el admin pulsó dos veces, o la red se cayó a mitad). Se recupera el usuario
  // y se salta a completar lo que falte, en vez de dar un error de duplicado.
  //
  // Va ANTES de los chequeos de duplicado a propósito: si no, el chequeo de
  // celular encontraría el perfil que el propio admin acaba de crear y le diría
  // "ya existe un cliente con ese celular" — bloqueando su propio reintento.
  let userId: string | null = null
  if (!realEmail) {
    const { data: resumed } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (resumed) userId = resumed.id
  }

  if (!userId) {
    // Duplicado por correo: el error crudo de Supabase ("User already registered")
    // no dice de quién, y aquí el admin sí puede saberlo.
    if (realEmail) {
      const { data: existing } = await admin
        .from("profiles")
        .select("id, full_name")
        .eq("email", realEmail)
        .maybeSingle()
      if (existing) {
        return { error: `Ya existe un cliente con ese correo (${existing.full_name ?? realEmail})` }
      }
    }

    // Duplicado por celular. Al ser obligatorio, es la única defensa contra
    // registrar dos veces a la misma persona (el nombre se repite y se escribe de
    // mil formas). Compara contra dígitos porque así es como se guarda siempre.
    const { data: dupPhone } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle()
    if (dupPhone) {
      return { error: `Ya existe un cliente con ese WhatsApp (${dupPhone.full_name ?? phone})` }
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: fullName, phone },
    })

    if (createError) {
      // Carrera con nuestro propio reintento: el usuario se creó entre la sonda
      // y esta llamada. Recuperarlo en vez de fallar.
      if (/already registered|already exists/i.test(createError.message)) {
        const { data: race } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()
        if (race) userId = race.id
      }
      if (!userId) return { error: traducirErrorAuth(createError.message) }
    } else {
      userId = created.user?.id ?? null
    }
  }

  if (!userId) return { error: "No se pudo crear la cuenta del cliente" }

  // El trigger ya insertó el perfil; esto completa el teléfono (que no copia) y
  // fuerza gym_id/role por si el trigger no existiera en algún entorno.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (admin as any)
    .from("profiles")
    .upsert(
      {
        id: userId,
        gym_id: ctx.gymId,
        full_name: fullName,
        email,
        phone,
        role: "client",
      },
      { onConflict: "id" }
    )
  if (profileError) return { error: profileError.message }

  // Fila de clients: normalmente la crea el trigger; si no existiera, se inserta.
  const { data: existingClient } = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle()

  let clientId = existingClient?.id ?? null
  if (!clientId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: clientError } = await (admin as any)
      .from("clients")
      .insert({ gym_id: ctx.gymId, profile_id: userId })
      .select("id")
      .single()
    if (clientError) return { error: clientError.message }
    clientId = inserted.id as string
  }

  revalidatePath(ROUTES.ADMIN_CLIENTES)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)

  // Plan opcional: reutiliza tal cual el flujo de cobro en efectivo ya existente
  // (RPC atómica create_and_approve_cash_payment). Si falla, NO se revierte el
  // alta: el cliente ya quedó bien creado y el admin puede activarle el plan
  // desde su ficha. Borrar la cuenta para "limpiar" sería peor.
  if (input.plan) {
    const planResult = await createManualPaymentAction({
      clientId,
      planId: input.plan.planId,
      amountCents: input.plan.amountCents,
      method: input.plan.method,
      totalDays: input.plan.totalDays,
      durationDays: input.plan.durationDays,
      clientRequestId: input.clientRequestId,
    })
    if (planResult.error) return { clientId, planWarning: planResult.error }
  }

  return { clientId }
}
