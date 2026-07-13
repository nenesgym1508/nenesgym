import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { NuevaRutinaBibliotecaFlow } from "@/components/admin/nueva-rutina-biblioteca-flow"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function NuevaRutinaBibliotecaPage({
  searchParams
}: {
  searchParams: Promise<{ returnToDate?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const { returnToDate } = await searchParams

  return <NuevaRutinaBibliotecaFlow returnToDate={returnToDate} />
}
