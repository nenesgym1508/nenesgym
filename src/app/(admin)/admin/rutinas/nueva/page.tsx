import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getTrainingRoutines } from "@/services/training-routines.service"
import { getDailyClasses } from "@/services/classes.service"
import { getAllClients } from "@/services/clients.service"
import { NuevaRutinaAdminFlow } from "@/components/admin/nueva-rutina-admin-flow"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function NuevaRutinaAdminPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const { clientId } = await searchParams

  const [routines, classes, clients] = await Promise.all([
    getTrainingRoutines(),
    getDailyClasses({ limit: 30 }),
    getAllClients()
  ])

  return (
    <NuevaRutinaAdminFlow
      routines={routines}
      classes={classes}
      clients={clients as any}
      initialClientId={clientId}
    />
  )
}
