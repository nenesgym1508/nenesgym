import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getTemplateWithBlocks } from "@/services/templates.service"
import { getExercises } from "@/services/exercises.service"
import { TemplateEditor } from "@/components/admin/template-editor"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminPlantillaDetallePage({
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

  const [template, exercises] = await Promise.all([
    getTemplateWithBlocks(id),
    getExercises({ includeInactive: false }),
  ])

  if (!template) notFound()

  return <TemplateEditor initialTemplate={template} exercises={exercises} />
}
