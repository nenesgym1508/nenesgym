import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoutineWithDays } from "@/services/routines.service"
import { getExercises } from "@/services/exercises.service"
import { getAllClients } from "@/services/clients.service"
import { RoutineEditor } from "@/components/admin/routine-editor"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminRoutineDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [routine, exercises, clients] = await Promise.all([
    getRoutineWithDays(id),
    getExercises(),
    getAllClients()
  ])

  if (!routine) {
    redirect(ROUTES.ADMIN_RUTINAS)
  }

  return (
    <RoutineEditor
      initialRoutine={routine}
      exercises={exercises}
      variant="admin"
      clients={clients as any}
    />
  )
}
