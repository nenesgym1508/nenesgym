import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAllPayments, getPendingPayments } from "@/services/payments.service"
import { PageHeader } from "@/components/layout/page-header"
import { PendingPaymentCard } from "@/components/admin/pending-payment-card"
import { Card } from "@/components/ui/card"
import { PaymentBadge } from "@/components/ui/badge"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"
import type { PaymentMethod } from "@/types/payment"

export default async function AdminPagosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [pending, allPayments] = await Promise.all([getPendingPayments(), getAllPayments()])

  return (
    <div>
      <PageHeader title="Gestión de pagos" />
      <div className="p-4 space-y-6">
        {pending.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Por aprobar ({pending.length})
            </h3>
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
        ) : (
          <Card className="text-center py-8 text-zinc-500 text-sm">
            No hay pagos pendientes
          </Card>
        )}

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
            Historial reciente
          </h3>
          <Card className="p-0 overflow-hidden">
            {allPayments.map((p, i) => {
              const pay = p as typeof p & {
                client?: { profile?: { full_name?: string | null } }
                plan?: { name: string } | null
              }
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < allPayments.length - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">
                      {pay.client?.profile?.full_name ?? "Cliente"}
                    </p>
                    <p className="text-xs text-zinc-500">
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
