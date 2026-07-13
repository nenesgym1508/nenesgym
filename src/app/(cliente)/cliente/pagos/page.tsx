import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientPayments, getAvailablePlans } from "@/services/payments.service"
import { createAdminClient } from "@/lib/supabase/admin"
import { PageHeader } from "@/components/layout/page-header"
import { PaymentHistory } from "@/components/cliente/payment-history"
import { PaymentUploadForm } from "@/components/cliente/payment-upload-form"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClientePagosPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  const admin = createAdminClient()

  const [payments, plans, clientRow] = await Promise.all([
    client ? getClientPayments(client.id) : Promise.resolve([]),
    getAvailablePlans(),
    client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (admin as any).from("clients").select("comprobante_bloqueado, comprobante_bloqueado_hasta").eq("id", client.id).single()
      : Promise.resolve({ data: null }),
  ])

  const cr = (clientRow as { data: { comprobante_bloqueado?: boolean; comprobante_bloqueado_hasta?: string | null } | null }).data
  const bloqueado =
    cr?.comprobante_bloqueado === true ||
    (cr?.comprobante_bloqueado_hasta != null && new Date(cr.comprobante_bloqueado_hasta) > new Date())

  return (
    <div>
      <PageHeader title="Mis pagos" />
      <div className="p-4 md:px-10 md:py-8 space-y-6">
        <PaymentUploadForm
          plans={plans}
          comprobanteBloqueado={bloqueado}
        />
        <PaymentHistory payments={payments} />
      </div>
    </div>
  )
}
