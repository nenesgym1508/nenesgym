import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { unstable_cache } from "next/cache"


export function getGymSettings() {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const { data } = await supabase
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
    },
    ["gym-settings"],
    { revalidate: 3600, tags: ["gym"] }
  )()
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

