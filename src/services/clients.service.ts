import { createClient } from "@/lib/supabase/server"

export async function getCurrentClientData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (!profile) return null

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("profile_id", user.id)
    .single()

  return { user, profile, client }
}

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
  return data ?? []
}
