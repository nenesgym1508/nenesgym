"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/require-admin"
import { computeEffectiveStatus, searchAdminClients } from "@/services/memberships.service"
import { todayInBogota, nowInBogota, gymSession, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"
import type { MembershipStatus } from "@/types/membership"

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
  revalidateTag("gym", "max")
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
  }

  const { error } = input.id
    ? await ctx.supabase.from("plans").update(row).eq("id", input.id)
    : await ctx.supabase.from("plans").insert(row)
  if (error) return { error: error.message }

  // Planes cacheados (tag "plans"): invalidar para que el cambio aparezca al abrir.
  revalidateTag("plans", "max")
  revalidatePath(ROUTES.ADMIN_MAS)
  return { success: true }
}

export async function setPlanActiveAction(planId: string, isActive: boolean) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  const { error } = await ctx.supabase
    .from("plans")
    .update({ is_active: isActive })
    .eq("id", planId)
  if (error) return { error: error.message }
  revalidateTag("plans", "max")
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
  revalidateTag("plans", "max")
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

  revalidateTag("admin-payments", "max")
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

  revalidateTag("admin-payments", "max")
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

export async function createManualPaymentAction(formData: {
  clientId: string
  planId: string
  amountCents: number
  method: string
  totalDays: number
  durationDays: number
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error }
  const { supabase } = ctx

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      gym_id: ctx.gymId,
      client_id: formData.clientId,
      plan_id: formData.planId || null,
      amount_cents: formData.amountCents,
      method: formData.method as "cash",
      status: "pending",
    })
    .select("id")
    .single()

  if (paymentError) return { error: paymentError.message }

  const result = await approvePaymentAction(payment.id, formData.totalDays, formData.durationDays)
  if (result.error) return { error: result.error }

  revalidatePath(ROUTES.ADMIN_CLIENTES)
  return { success: true }
}
