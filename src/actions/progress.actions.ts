"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import { todayInBogota } from "@/lib/dates"
import type { GoalType } from "@/types/progress"

export async function addProgressRecord(data: {
  weight_kg?: number
  height_cm?: number
  waist_cm?: number
  chest_cm?: number
  arm_cm?: number
  leg_cm?: number
  note?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!client) return { error: "Perfil de cliente no encontrado" }

  const today = todayInBogota()

  // Buscar si ya existe una medición del día en zona Bogotá
  const { data: existing } = await supabase
    .from("progress_records")
    .select("id")
    .eq("client_id", client.id)
    .eq("measured_date", today)
    .single()

  // `bmi` es columna GENERATED ALWAYS en Postgres — no enviar valor manual.
  const payload = {
    gym_id: GYM_ID,
    client_id: client.id,
    weight_kg: data.weight_kg ?? null,
    height_cm: data.height_cm ?? null,
    waist_cm: data.waist_cm ?? null,
    chest_cm: data.chest_cm ?? null,
    arm_cm: data.arm_cm ?? null,
    leg_cm: data.leg_cm ?? null,
    note: data.note ?? null,
    measured_date: today,
    created_by: "client",
  }

  let error
  if (existing) {
    const result = await supabase
      .from("progress_records")
      .update(payload)
      .eq("id", existing.id)
    error = result.error
  } else {
    const result = await supabase.from("progress_records").insert(payload)
    error = result.error
  }

  if (error) return { error: error.message }

  revalidatePath(ROUTES.CLIENTE_PROGRESO)
  revalidatePath(ROUTES.CLIENTE_DASHBOARD)
  return { success: true }
}

export async function setProgressGoalAction(goalType: GoalType) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!client) return { error: "Perfil de cliente no encontrado" }

  // Cancelar el objetivo activo anterior
  await supabase
    .from("progress_goals")
    .update({ status: "cancelled" })
    .eq("client_id", client.id)
    .eq("status", "active")

  // Crear el nuevo objetivo
  const { error } = await supabase.from("progress_goals").insert({
    gym_id: GYM_ID,
    client_id: client.id,
    goal_type: goalType,
    created_by: "client",
  })

  if (error) return { error: error.message }

  revalidatePath(ROUTES.CLIENTE_PROGRESO)
  return { success: true }
}
