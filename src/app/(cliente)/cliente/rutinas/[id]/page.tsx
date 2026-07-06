import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getRoutineWithDays, getRoutineSessionForDate } from "@/services/routines.service"
import { getExercises } from "@/services/exercises.service"
import { RoutineDetailView } from "@/components/cliente/routine-detail-view"
import { RoutineEditor } from "@/components/admin/routine-editor"
import { todayInBogota } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteRoutineDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  if (!client) redirect(ROUTES.CLIENTE_DASHBOARD)

  const [routine, exercises] = await Promise.all([
    getRoutineWithDays(id),
    getExercises()
  ])

  if (!routine) {
    redirect(ROUTES.CLIENTE_RUTINAS)
  }

  // Double check ownership
  if (routine.client_id !== client.id) {
    redirect(ROUTES.CLIENTE_RUTINAS)
  }

  const todayStr = todayInBogota()
  const session = await getRoutineSessionForDate(routine.id, todayStr)
  const isDoneToday = !!session

  const isOwnRoutine = routine.created_by_role === "client"

  return (
    <div className="relative min-h-screen">
      {isOwnRoutine ? (
        <RoutineEditor
          initialRoutine={routine}
          exercises={exercises}
          variant="client-own"
          isDoneToday={isDoneToday}
          todayStr={todayStr}
        />
      ) : (
        <RoutineDetailView 
          routine={routine} 
          isDoneToday={isDoneToday}
          todayStr={todayStr}
        />
      )}
    </div>
  )
}
