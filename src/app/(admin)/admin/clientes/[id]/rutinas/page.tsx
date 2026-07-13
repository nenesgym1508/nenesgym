import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getClientById } from "@/services/clients.service"
import { getClientRoutines } from "@/services/routines.service"
import { ClientRoutinesSection } from "@/components/admin/client-routines-section"
import { PageHeader } from "@/components/layout/page-header"
import { adminClienteDetalle, ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteRutinasPage({
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
