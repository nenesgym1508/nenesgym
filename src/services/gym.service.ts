import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"

export async function getGymSettings() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("gyms")
    .select("id, name, grace_days, currency, timezone, checkin_token")
    .eq("id", GYM_ID)
    .single()
  return data
}

export async function getAdminPlans() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("plans")
    .select("*")
    .eq("gym_id", GYM_ID)
    .order("price_cents", { ascending: true })
  return data ?? []
}
