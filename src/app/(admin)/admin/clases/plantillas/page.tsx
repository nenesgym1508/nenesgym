import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getTemplates } from "@/services/templates.service"
import { PageHeader } from "@/components/layout/page-header"
import { TemplatesList } from "@/components/admin/templates-list"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminPlantillasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const templates = await getTemplates()

  return (
    <div>
      <PageHeader title="Plantillas" backHref={ROUTES.ADMIN_CLASES} />
      <div className="p-4">
        <TemplatesList
          initialTemplates={templates}
          userId={user.id}
        />
      </div>
    </div>
  )
}
