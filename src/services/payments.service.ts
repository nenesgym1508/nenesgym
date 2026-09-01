import { createClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Historial de pagos de un socio.
 *
 * ⚠️ El tope es explícito a propósito. Sin `.limit()`, PostgREST corta en 1000
 * filas SIN avisar: no da error, simplemente faltan pagos. Un socio de años
 * llegaría ahí y el corte pasaría inadvertido. 200 son ~16 años de
 * renovaciones mensuales, con margen de sobra.
 */
const MAX_PAGOS_SOCIO = 200

export async function getClientPayments(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("payments")
    .select("*, plan:plans(name, days)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(MAX_PAGOS_SOCIO)
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

