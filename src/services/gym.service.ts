import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"

export async function getGymSettings() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("gyms")
    .select("id, name, grace_days, currency, timezone, checkin_token, nequi_number, nequi_titular, daviplata_number, daviplata_titular")
    .eq("id", GYM_ID)
    .single()
  return data as (typeof data & {
    nequi_number: string | null
    nequi_titular: string | null
    daviplata_number: string | null
    daviplata_titular: string | null
  }) | null
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
