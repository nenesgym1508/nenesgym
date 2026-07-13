import { createClient } from "@/lib/supabase/server"

// Guard de rol para server actions administrativas. RLS ya bloquea las
// escrituras a nivel de base de datos; esto agrega defensa en profundidad
// y errores legibles antes de tocar la DB.
export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" as const }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, gym_id")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") return { error: "Sin permisos" as const }
  return { supabase, user, gymId: profile.gym_id }
}
