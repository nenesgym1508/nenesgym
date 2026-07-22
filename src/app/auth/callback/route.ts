import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ROUTES } from "@/constants/routes"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/cliente/dashboard"

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
          return NextResponse.redirect(`${origin}${ROUTES.ADMIN_DASHBOARD}`)
        } else {
          await adminClient.from("profiles").update({ role: "client" }).eq("id", user.id).eq("role", "admin")
          return NextResponse.redirect(`${origin}${ROUTES.CLIENTE_DASHBOARD}`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`)
}
