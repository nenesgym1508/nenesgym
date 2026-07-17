import { requireAdminSession } from "@/lib/auth/session"
import { getExercises } from "@/services/exercises.service"
import { PageHeader } from "@/components/layout/page-header"
import { ExercisesList } from "@/components/admin/exercises-list"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminEjerciciosPage() {
  await requireAdminSession()

  const exercises = await getExercises({ includeInactive: true, visibility: "gym" })

  return (
    <div>
      <PageHeader title="Ejercicios" backHref={ROUTES.ADMIN_CLASES} />
      <div className="p-4">
        <ExercisesList initialExercises={exercises} />
      </div>
    </div>
  )
}
