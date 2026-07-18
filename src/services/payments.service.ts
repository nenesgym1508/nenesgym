import { createClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { env } from "@/lib/env"

export async function getClientPayments(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("payments")
    .select("*, plan:plans(name, days)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export function getPendingPayments() {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from("payments")
        .select(`
          *,
          plan:plans(name, days, duration_days),
          client:clients(
            id,
            profile:profiles(full_name, email, phone)
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      return data ?? []
    },
    ["admin-pending-payments"],
    { revalidate: 3600, tags: ["admin-payments"] }
  )()
}

export function getAllPayments() {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
      const { data } = await supabase
        .from("payments")
        .select(`
          *,
          plan:plans(name),
          client:clients(
            id,
            profile:profiles(full_name, email)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(100)
      return data ?? []
    },
    ["admin-all-payments"],
    { revalidate: 3600, tags: ["admin-payments"] }
  )()
}

export async function getReceiptSignedUrl(path: string) {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from("receipts")
    .createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

export const getAvailablePlans = unstable_cache(
  async () => {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("price_cents", { ascending: true })
    return data ?? []
  },
  ["available-plans"],
  { revalidate: 300, tags: ["plans"] }
)

