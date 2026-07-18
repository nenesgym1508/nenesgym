import { redirect } from "next/navigation"
import { getAuthenticatedSession } from "@/lib/auth/session"
import { getAllPayments, getPendingPayments } from "@/services/payments.service"
import { getGymSettings } from "@/services/gym.service"
import { PageHeader } from "@/components/layout/page-header"
import { PendingPaymentCard } from "@/components/admin/pending-payment-card"
import { Card } from "@/components/ui/card"
import { PaymentBadge } from "@/components/ui/badge"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"
import type { PaymentMethod } from "@/types/payment"

export const dynamic = "force-dynamic"

export default async function AdminPagosPage() {
  const session = await getAuthenticatedSession()
  if (!session) redirect(ROUTES.LOGIN)

  if (session.profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [pending, allPayments, gym] = await Promise.all([getPendingPayments(), getAllPayments(), getGymSettings()])

  return (
    <div className="md:max-w-6xl md:mx-auto">
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Pagos</h1>
          <p className="text-zinc-500 text-sm">Gestión de ingresos y cobros</p>
        </div>
      </header>

      <div className="px-6 pb-24 md:px-10 space-y-6">
        {/* Medios de pago habilitados */}
        {(gym?.nequi_number || gym?.daviplata_number) && (
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 md:p-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
              Medios de pago habilitados
            </h3>
            <div className="flex flex-wrap gap-3">
              {gym.nequi_number && (
                <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/5">
                  <span className="text-fuchsia-500 font-bold text-sm">Nequi</span>
                  <div className="w-px h-4 bg-white/10" />
                  <span className="text-zinc-200 text-sm tracking-wide">{gym.nequi_number}</span>
                </div>
              )}
              {gym.daviplata_number && (
                <div className="flex items-center gap-2.5 bg-black/40 px-3.5 py-2.5 rounded-xl border border-white/5">
                  <span className="text-red-500 font-bold text-sm">Daviplata</span>
                  <div className="w-px h-4 bg-white/10" />
                  <span className="text-zinc-200 text-sm tracking-wide">{gym.daviplata_number}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {pending.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Por aprobar ({pending.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {pending.map((p) => {
              const pp = p as typeof p & {
                plan?: { name: string; days: number; duration_days: number } | null
                client?: {
                  id: string
                  profile?: { full_name: string | null; email: string | null; phone: string | null } | null
                } | null
                ai_valido?: boolean | null
                ai_razon?: string | null
                ai_monto?: number | null
                ai_referencia?: string | null
                ai_entidad?: string | null
                ai_nombre?: string | null
                ai_numero_destino?: string | null
                auto_aprobado?: boolean
              }
              return (
                <PendingPaymentCard
                  key={p.id}
                  payment={{
                    id: p.id,
                    amount_cents: p.amount_cents,
                    method: p.method as PaymentMethod,
                    receipt_path: p.receipt_path,
                    created_at: p.created_at,
                    plan: pp.plan,
                    client: pp.client,
                    ai_valido: pp.ai_valido,
                    ai_razon: pp.ai_razon,
                    ai_monto: pp.ai_monto,
                    ai_referencia: pp.ai_referencia,
                    ai_entidad: pp.ai_entidad,
                    ai_nombre: pp.ai_nombre,
                    ai_numero_destino: pp.ai_numero_destino,
                    auto_aprobado: pp.auto_aprobado,
                  }}
                />
              )
              })}
            </div>
          </div>
        ) : (
          <Card className="text-center py-8 text-zinc-500 text-sm bg-zinc-950/40 border-white/5">
            No hay pagos pendientes
          </Card>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
            Historial reciente
          </h3>
          <Card className="p-0 overflow-hidden bg-zinc-950/40 border-white/5">
            {allPayments.map((p, i) => {
              const pay = p as typeof p & {
                client?: { profile?: { full_name?: string | null } }
                plan?: { name: string } | null
              }
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < allPayments.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bebas text-lg tracking-wide uppercase text-white truncate">
                      {pay.client?.profile?.full_name ?? "Cliente"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {pay.plan?.name ?? "Personalizado"} · {formatDate(p.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-zinc-200">{formatCOP(p.amount_cents)}</span>
                    <PaymentBadge status={p.status} />
                  </div>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </div>
  )
}
