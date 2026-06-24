"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { computeEffectiveStatus } from "@/services/memberships.service"
import { todayInBogota, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"
import type { MembershipStatus } from "@/types/membership"

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" as const }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, gym_id")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { error: "Sin permisos" as const }
  return { supabase, gymId: profile.gym_id }
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (adminClient as any)
    .from("gyms")
    .update({
      name: input.name.trim(),
      grace_days: input.graceDays,
      nequi_number: input.nequiNumber?.trim() || null,
      nequi_titular: input.nequiTitular?.trim() || null,
      daviplata_number: input.daviplataNumber?.trim() || null,
      daviplata_titular: input.davaplataTitular?.trim() || null,
    })
    .eq("id", ctx.gymId)
  if (error) return { error: error.message }

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

  const { data: existing } = await admin
    .from("attendance")
    .select("id")
    .eq("client_id", clientId)
    .eq("check_in_date", today)
    .limit(1)
    .maybeSingle()
  if (existing) return { error: "El cliente ya registró su ingreso hoy" }

  const { error: insertError } = await admin.from("attendance").insert({
    gym_id: ctx.gymId,
    client_id: clientId,
    membership_id: membership.id,
    check_in_date: today,
    source: "manual",
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("role, gym_id")
    .eq("id", user.id)
    .single()
  if (adminProfile?.role !== "admin") return { error: "Sin permisos" }

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      gym_id: adminProfile.gym_id,
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
