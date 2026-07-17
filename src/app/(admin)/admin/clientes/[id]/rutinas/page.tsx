import { notFound } from "next/navigation"
import { requireAdminSession } from "@/lib/auth/session"
import { getClientById } from "@/services/clients.service"
import { getClientRoutines } from "@/services/routines.service"
import { ClientRoutinesSection } from "@/components/admin/client-routines-section"
import { PageHeader } from "@/components/layout/page-header"
import { adminClienteDetalle } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteRutinasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  await requireAdminSession()

  const clientData = await getClientById(id)
  if (!clientData) notFound()

  const routines = await getClientRoutines(clientData.id)
  const clientProfile = clientData.profile as { full_name?: string | null } | null

  return (
    <div>
      <PageHeader title={`Rutinas — ${clientProfile?.full_name ?? "Cliente"}`} backHref={adminClienteDetalle(id)} />
      <div className="p-4">
        <ClientRoutinesSection clientId={clientData.id} routines={routines} />
      </div>
    </div>
  )
}
