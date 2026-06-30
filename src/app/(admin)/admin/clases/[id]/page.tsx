import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getDailyClassWithBlocks } from "@/services/classes.service"
import { getExercises } from "@/services/exercises.service"
import { getTemplates } from "@/services/templates.service"
import { ClassEditor } from "@/components/admin/class-editor"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminClaseDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [dailyClass, exercises, templates] = await Promise.all([
    getDailyClassWithBlocks(id),
    getExercises({ includeInactive: false }),
    getTemplates(),
  ])

  if (!dailyClass) notFound()

  return (
    <ClassEditor
      initialClass={dailyClass}
      exercises={exercises}
      templates={templates}
      userId={user.id}
    />
  )
}
