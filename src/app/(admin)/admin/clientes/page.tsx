import { requireAdminSession } from "@/lib/auth/session"
import { getGymSettings } from "@/services/gym.service"
import { searchAdminClients, type ClientStatusFilter } from "@/services/memberships.service"
import { getAvailablePlans } from "@/services/payments.service"
import { ClientsList } from "@/components/admin/clients-list"
import dynamicImport from "next/dynamic"
const GymQrModal = dynamicImport(() => import("@/components/admin/gym-qr-modal").then(m => m.GymQrModal))

export const dynamic = "force-dynamic"

const PAGE_SIZE = 20
const VALID_STATUS: ClientStatusFilter[] = ["todos", "activos", "sin_membresia"]

export default async function AdminClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  await requireAdminSession()

  const sp = await searchParams
  const search = sp.q ?? ""
  const status: ClientStatusFilter = VALID_STATUS.includes(sp.status as ClientStatusFilter)
    ? (sp.status as ClientStatusFilter)
    : "todos"
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1)

  const [result, plans, gym] = await Promise.all([
    searchAdminClients({ search, status, page, pageSize: PAGE_SIZE }),
    getAvailablePlans(),
    getGymSettings(),
  ])

  const planOptions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    days: p.days,
    duration_days: p.duration_days,
    price_cents: p.price_cents,
  }))

  return (
    <div className="md:max-w-6xl md:mx-auto">
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Clientes</h1>
          <p className="text-zinc-500 text-sm">Gestiona ingresos y membresías</p>
        </div>
        {gym && <GymQrModal token={gym.checkin_token} gymName={gym.name} />}
      </header>

      <div className="px-6 pb-24 md:px-10">
        <ClientsList
          clients={result.rows}
          plans={planOptions}
          total={result.total}
          page={result.page}
          pageSize={result.pageSize}
          search={search}
          status={status}
        />
      </div>
    </div>
  )
}
