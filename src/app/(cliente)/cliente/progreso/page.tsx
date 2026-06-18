import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientProgress } from "@/services/progress.service"
import { PageHeader } from "@/components/layout/page-header"
import { ProgressForm } from "@/components/cliente/progress-form"
import { ProgressHistory } from "@/components/cliente/progress-history"
import { ROUTES } from "@/constants/routes"

export default async function ClienteProgresoPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  const records = client ? await getClientProgress(client.id) : []

  return (
    <div>
      <PageHeader title="Mi progreso" />
      <div className="p-4 space-y-6">
        <ProgressForm />
        <ProgressHistory records={records} />
      </div>
    </div>
  )
}
