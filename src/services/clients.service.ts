import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedSession } from "@/lib/auth/session"
import { todayInBogota } from "@/lib/dates"
import { cache } from "react"

export const getCurrentClientData = cache(async () => {
  const session = await getAuthenticatedSession()
  if (!session) return null

  const { user, profile } = session

  const supabase = await createClient()
  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("profile_id", user.id)
    .single()

  return { user, profile, client }
})


export async function getClientById(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clients")
    .select("*, profile:profiles(*)")
    .eq("id", clientId)
    .single()
  return data
}

export async function getAllClients() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clients")
    .select(
      `
      id, created_at, document_id,
      profile:profiles!inner(id, full_name, email, phone, role)
    `
    )
    .eq("profile.role", "client")
    .order("created_at", { ascending: false })
    .limit(500)
  return data ?? []
}

// Conteo de clientes sin descargar las filas. Usa la RPC admin_search_clients
// (total_count vía count() over()); si no existiera, cae a un count head:true.
export async function countClients(): Promise<number> {
  const supabase = await createClient()
  // p_search se omite: su DEFAULT en la función es NULL (sin filtro de búsqueda).
  const { data, error } = await supabase.rpc("admin_search_clients", {
    p_status: "todos",
    p_today: todayInBogota(),
    p_limit: 1,
    p_offset: 0,
  })
  if (!error) return Number(data?.[0]?.total_count ?? 0)

  const { count } = await supabase
    .from("clients")
    .select("id, profile:profiles!inner(role)", { count: "exact", head: true })
    .eq("profile.role", "client")
  return count ?? 0
}
