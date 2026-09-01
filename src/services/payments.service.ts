import { createClient } from "@/lib/supabase/server"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Historial de pagos de un cliente.
 *
 * ⚠️ El tope es explícito a propósito. Sin `.limit()`, PostgREST corta en 1000
 * filas SIN avisar: no da error, simplemente faltan pagos. Un cliente de años
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

/**
 * TODOS los planes vendibles. Es la lista del ADMIN.
 *
 * ⚠️ Incluye los que el cliente no debe ver (tarifas de estudiante y similares).
 * Para una pantalla del cliente usa `getPlansVisibleToClient`, nunca esta.
 */
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

/**
 * Planes que puede ver y elegir UN cliente concreto.
 *
 * Dos formas de que un plan entre en la lista:
 *   1. Es público (`visible_to_clients`), o
 *   2. ese cliente ya lo tuvo alguna vez.
 *
 * La segunda es la que hace que esto sirva de algo. Sin ella, un estudiante al
 * que el dueño le asignó su tarifa a mano tendría que volver al mostrador en
 * cada renovación, porque su propio plan no le aparecería.
 *
 * ⚠️ NO se cachea con `unstable_cache`: el resultado depende del cliente. Una
 * caché compartida le enseñaría a uno los planes privados de otro.
 */
export async function getPlansVisibleToClient(clientId: string | null) {
  const supabase = createAdminClient()

  const { data: todos } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .order("price_cents", { ascending: true })

  const planes = todos ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publicos = planes.filter((p: any) => p.visible_to_clients !== false)
  if (!clientId) return publicos

  // Los que ya usó: mira pagos y membresías, porque el admin pudo activarle el
  // plan sin que quedara un pago a su nombre.
  const [{ data: pagos }, { data: mems }] = await Promise.all([
    supabase.from("payments").select("plan_id").eq("client_id", clientId).not("plan_id", "is", null).limit(200),
    supabase.from("memberships").select("plan_id").eq("client_id", clientId).not("plan_id", "is", null).limit(200),
  ])

  const suyos = new Set<string>([
    ...(pagos ?? []).map((p) => p.plan_id as string),
    ...(mems ?? []).map((m) => m.plan_id as string),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return planes.filter((p: any) => p.visible_to_clients !== false || suyos.has(p.id))
}

