import { requireAdminSession } from "@/lib/auth/session"
import { getAdminRoutines, getClientsWithoutRoutine } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { RoutinesList } from "@/components/admin/routines-list"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminRoutinesPage() {
  await requireAdminSession()

  const [routines, clientsWithoutRoutine] = await Promise.all([
    getAdminRoutines(),
    getClientsWithoutRoutine()
  ])

  return (
    <div className="pb-24">
      <PageHeader title="Rutinas Clientes" backHref={ROUTES.ADMIN_ENTRENAMIENTO} />
      <div className="p-4">
        <RoutinesList routines={routines} clientsWithoutRoutine={clientsWithoutRoutine} />
      </div>
    </div>
  )
}
