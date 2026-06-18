"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export async function addProgressRecord(data: {
  weight_kg?: number
  height_cm?: number
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

  const { error } = await supabase.from("progress_records").insert({
    gym_id: GYM_ID,
    client_id: client.id,
    weight_kg: data.weight_kg ?? null,
    height_cm: data.height_cm ?? null,
    note: data.note ?? null,
  })

  if (error) return { error: error.message }

  revalidatePath(ROUTES.CLIENTE_PROGRESO)
  return { success: true }
}
