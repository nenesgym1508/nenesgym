import { redirect } from "next/navigation"
import { requireAdminSession } from "@/lib/auth/session"
import { getTrainingRoutineWithDays } from "@/services/training-routines.service"
import { getExercises } from "@/services/exercises.service"
import { getAllClients } from "@/services/clients.service"
import { TrainingRoutineEditor } from "@/components/admin/training-routine-editor"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function TrainingRoutineDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ assign?: string; schedule?: string; date?: string }>
}) {
  const { id } = await params
  const { assign, schedule, date } = await searchParams

  await requireAdminSession()

  const [routine, exercises, clients] = await Promise.all([
    getTrainingRoutineWithDays(id),
    getExercises(),
    getAllClients()
  ])

  if (!routine) {
    redirect(ROUTES.ADMIN_ENTRENAMIENTO)
  }

  return (
    <TrainingRoutineEditor
      initialRoutine={routine}
      exercises={exercises}
      clients={clients as any}
      autoOpenAssign={assign === "1"}
      autoOpenSchedule={schedule === "1"}
      scheduleReturnDate={date}
    />
  )
}
