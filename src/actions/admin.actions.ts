"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/constants/routes"

export async function approvePaymentAction(
  paymentId: string,
  totalDays: number,
  durationDays: number
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("approve_payment", {
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
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("reject_payment", {
    p_payment_id: paymentId,
    p_note: note,
  })

  if (error) return { error: error.message }
  const result = data as { ok: boolean; message?: string }
  if (!result?.ok) return { error: result?.message ?? "Error al rechazar" }

  revalidatePath(ROUTES.ADMIN_PAGOS)
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
