import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRoutineTemplateWithDays } from "@/services/routine-templates.service"
import { getExercises } from "@/services/exercises.service"
import { RoutineTemplateEditor } from "@/components/admin/routine-template-editor"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminRoutineTemplateDetailPage({
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

  const [tpl, exercises] = await Promise.all([
    getRoutineTemplateWithDays(id),
    getExercises()
  ])

  if (!tpl) {
    redirect(ROUTES.ADMIN_RUTINAS_PLANTILLAS)
  }

  return <RoutineTemplateEditor initialTemplate={tpl} exercises={exercises} />
}
