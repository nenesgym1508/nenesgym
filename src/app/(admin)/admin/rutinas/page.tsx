import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAdminRoutines } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { RoutinesList } from "@/components/admin/routines-list"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminRoutinesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const routines = await getAdminRoutines()

  return (
    <div className="pb-24">
      <PageHeader title="Rutinas Clientes" backHref={ROUTES.ADMIN_ENTRENAMIENTO} />
      <div className="p-4">
        <RoutinesList routines={routines} />
      </div>
    </div>
  )
}
