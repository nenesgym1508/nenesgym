import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getExercises } from "@/services/exercises.service"
import { PageHeader } from "@/components/layout/page-header"
import { ExercisesList } from "@/components/admin/exercises-list"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminEjerciciosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const exercises = await getExercises({ includeInactive: true })

  return (
    <div>
      <PageHeader title="Ejercicios" backHref={ROUTES.ADMIN_CLASES} />
      <div className="p-4">
        <ExercisesList initialExercises={exercises} />
      </div>
    </div>
  )
}
