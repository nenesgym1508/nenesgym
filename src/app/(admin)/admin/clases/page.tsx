import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { ClasesAgenda } from "@/components/admin/clases-agenda"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminClasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  return (
    <div>
      <PageHeader title="Clases" backHref={ROUTES.ADMIN_ENTRENAMIENTO} />
      <div className="p-4">
        <ClasesAgenda />
      </div>
    </div>
  )
}
