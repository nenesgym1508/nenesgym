import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientPayments, getAvailablePlans } from "@/services/payments.service"
import { PageHeader } from "@/components/layout/page-header"
import { PaymentHistory } from "@/components/cliente/payment-history"
import { PaymentUploadForm } from "@/components/cliente/payment-upload-form"
import { ROUTES } from "@/constants/routes"

export default async function ClientePagosPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  const [payments, plans] = await Promise.all([
    client ? getClientPayments(client.id) : Promise.resolve([]),
    getAvailablePlans(),
  ])

  return (
    <div>
      <PageHeader title="Mis pagos" />
      <div className="p-4 space-y-6">
        <PaymentUploadForm plans={plans} />
        <PaymentHistory payments={payments} />
      </div>
    </div>
  )
}
