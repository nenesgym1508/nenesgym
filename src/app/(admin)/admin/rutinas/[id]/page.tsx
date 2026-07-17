import { redirect } from "next/navigation"
import { requireAdminSession } from "@/lib/auth/session"
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
  await requireAdminSession()

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
