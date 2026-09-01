import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ROUTES } from "@/constants/routes"
import { INVITATION_COOKIE, INVITATION_QUERY_PARAM } from "@/lib/invitations"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/cliente/dashboard"

  // Contexto de invitación. El query param es la capa PRINCIPAL: la cookie no
  // sobrevive cuando el cliente abre el enlace en el WebView de WhatsApp y Google
  // salta al navegador del sistema. La cookie queda como respaldo por si
  // Supabase recortara el query string.
  const invFromQuery = searchParams.get(INVITATION_QUERY_PARAM)
  const invFromCookie = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${INVITATION_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=")
  const invitationToken = invFromQuery || (invFromCookie ? decodeURIComponent(invFromCookie) : null)

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        const isExclusivoAdmin = user.email.toLowerCase() === "nenesgym1508@gmail.com"
        const adminClient = createAdminClient()

        if (isExclusivoAdmin) {
          await adminClient.from("profiles").update({ role: "admin" }).eq("id", user.id)
          await adminClient.from("profiles").update({ role: "client" }).neq("id", user.id).eq("role", "admin")
          // La cookie se borra también aquí: si el admin entra con Google
          // teniendo una invitación a medias, dejarla viva 10 minutos haría que
          // el siguiente login de esa misma máquina la consumiera sin querer.
          return clearInvitationCookie(NextResponse.redirect(`${origin}${ROUTES.ADMIN_DASHBOARD}`))
        }

        await adminClient.from("profiles").update({ role: "client" }).eq("id", user.id).eq("role", "admin")

        // ── Rama de invitación ────────────────────────────────────────────
        // Solo se entra aquí si venía token. Sin él, el flujo de Google normal
        // queda exactamente como estaba.
        if (invitationToken) {
          const { acceptWithCurrentSessionAction } = await import("@/actions/invitations.actions")
          const result = await acceptWithCurrentSessionAction(invitationToken)
          const destino = result.ok
            ? `${origin}/invitacion/exito`
            : `${origin}/invitacion/error?code=${encodeURIComponent(result.code)}`
          return clearInvitationCookie(NextResponse.redirect(destino))
        }

        return clearInvitationCookie(NextResponse.redirect(`${origin}${ROUTES.CLIENTE_DASHBOARD}`))
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}

/**
 * La cookie se borra sobre la respuesta de redirección, no con `cookies()`:
 * en un Route Handler que devuelve un redirect, es la única vía que llega al
 * navegador.
 */
function clearInvitationCookie(res: NextResponse) {
  res.cookies.set(INVITATION_COOKIE, "", { path: "/", maxAge: 0 })
  return res
}
