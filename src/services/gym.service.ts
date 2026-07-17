import { unstable_cache } from "next/cache"
import { createClient as createSimpleClient } from "@supabase/supabase-js"
import { env } from "@/lib/env"
import { GYM_ID } from "@/constants/plans"
import type { Database } from "@/types/database.types"

// Cliente de Supabase seguro para caché (sin leer cookies/cabeceras dinámicas)
function getCacheSafeClient() {
  return createSimpleClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export const getGymSettings = unstable_cache(
  async () => {
    const supabase = getCacheSafeClient()
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
  { revalidate: 600, tags: ["gym"] }
)

export const getAdminPlans = unstable_cache(
  async () => {
    const supabase = getCacheSafeClient()
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("gym_id", GYM_ID)
      .order("price_cents", { ascending: true })
    return data ?? []
  },
  ["admin-plans"],
  { revalidate: 300, tags: ["plans"] }
)

