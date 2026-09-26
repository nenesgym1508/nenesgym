import { getAllClientDebtsAction } from "@/actions/admin.actions"
import { requireAdminSession } from "@/lib/auth/session"
import { searchAdminClients, type ClientStatusFilter } from "@/services/memberships.service"
import { getAvailablePlans } from "@/services/payments.service"
import { ClientsList } from "@/components/admin/clients-list"
import { NewClientModal } from "@/components/admin/new-client-modal"

export const dynamic = "force-dynamic"

const PAGE_SIZE = 10
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

  // Las 3 consultas salen JUNTAS.
  //
  // Antes los saldos esperaban a la búsqueda para pasarle los ids de cliente, y
  // esa cascada costaba un segundo viaje completo a la base en la pestaña que
  // el profesor abre todo el día. `getAllClientDebtsAction` no necesita los ids
  // (los resuelve la RPC por dentro), así que ya no bloquea a nadie.
  //
  // También se quitó `getGymSettings()`: era un cuarto viaje cuyo resultado no
  // se usaba en esta página.
  const [result, plans, balances] = await Promise.all([
    searchAdminClients({ search, status, page, pageSize: PAGE_SIZE }),
    getAvailablePlans(),
    getAllClientDebtsAction(),
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
      <header className="flex items-start justify-between gap-3 mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Clientes</h1>
          <p className="text-zinc-500 text-sm">Gestiona ingresos y membresías</p>
        </div>
        {/* Atajo desde donde el admin descubre que el cliente no está en la lista. */}
        <NewClientModal plans={planOptions} variant="secondary" />
      </header>

      <div className="px-6 pb-24 md:px-10">
        <ClientsList
          clients={result.rows.map(c => ({ ...c, pendingCents: balances.debts ? balances.debts.filter(d => d.client_id === c.id).reduce((sum, d) => sum + d.amount_cents, 0) : null }))}
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
