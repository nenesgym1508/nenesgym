import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/constants/routes"
import type { Database } from "@/types/database.types"

export type AuthenticatedSession = {
  user: any
  profile: Database["public"]["Tables"]["profiles"]["Row"]
}

/**
 * Obtiene la sesión del usuario actual y su perfil correspondiente.
 * Esta función está envuelta en React cache() por lo que solo se ejecutará
 * UNA vez por solicitud HTTP (evitando waterfalls redundantes en layout + page + server actions).
 */
export const getAuthenticatedSession = cache(async (): Promise<AuthenticatedSession | null> => {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (!profile) return null

    return { user, profile }
  } catch (error) {
    console.error("Error obteniendo sesión autenticada:", error)
    return null
  }
})

/**
 * Guard de rol admin para páginas (Server Components). Reutiliza la sesión ya cargada
 * por el layout gracias a React cache() — no hace ninguna llamada extra de auth ni consulta
 * `profiles` adicional. Redirige a login o al dashboard cliente según corresponda.
 */
export async function requireAdminSession(): Promise<AuthenticatedSession> {
  const session = await getAuthenticatedSession()
  if (!session) redirect(ROUTES.LOGIN)
  if (session.profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)
  return session
}
