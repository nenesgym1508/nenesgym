import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedSession } from "@/lib/auth/session"

// Guard de rol para server actions administrativas. RLS ya bloquea las
// escrituras a nivel de base de datos; esto agrega defensa en profundidad
// y errores legibles antes de tocar la DB.
export async function requireAdmin() {
  const session = await getAuthenticatedSession()
  if (!session) return { error: "No autenticado" as const }
  
  const { user, profile } = session
  if (profile?.role !== "admin") return { error: "Sin permisos" as const }

  const supabase = await createClient()
  return { supabase, user, gymId: profile.gym_id }
}

