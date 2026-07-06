import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NuevaRutinaFlow } from "@/components/cliente/nueva-rutina-flow"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteNuevaRutinaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  return <NuevaRutinaFlow />
}
