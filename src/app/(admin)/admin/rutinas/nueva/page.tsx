import { requireAdminSession } from "@/lib/auth/session"
import { getTrainingRoutines } from "@/services/training-routines.service"
import { getDailyClasses } from "@/services/classes.service"
import { getAllClients } from "@/services/clients.service"
import { NuevaRutinaAdminFlow } from "@/components/admin/nueva-rutina-admin-flow"

export const dynamic = "force-dynamic"

export default async function NuevaRutinaAdminPage({
  searchParams
}: {
  searchParams: Promise<{ clientId?: string }>
}) {
  await requireAdminSession()

  const { clientId } = await searchParams

  const [routines, classes, clients] = await Promise.all([
    getTrainingRoutines(),
    getDailyClasses({ limit: 30 }),
    getAllClients()
  ])

  return (
    <NuevaRutinaAdminFlow
      routines={routines}
      classes={classes}
      clients={clients as any}
      initialClientId={clientId}
    />
  )
}
