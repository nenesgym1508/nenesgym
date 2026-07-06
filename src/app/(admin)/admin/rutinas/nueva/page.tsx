import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoutineTemplates } from "@/services/routine-templates.service"
import { getDailyClasses } from "@/services/classes.service"
import { getAllClients } from "@/services/clients.service"
import { NuevaRutinaAdminFlow } from "@/components/admin/nueva-rutina-admin-flow"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function NuevaRutinaAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [templates, classes, clients] = await Promise.all([
    getRoutineTemplates(),
    getDailyClasses({ limit: 30 }),
    getAllClients()
  ])

  return (
    <NuevaRutinaAdminFlow
      templates={templates}
      classes={classes}
      clients={clients as any}
    />
  )
}
