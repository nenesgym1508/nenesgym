import { CreditCard } from "lucide-react"
import { Card } from "@/components/ui/card"
import { PaymentBadge } from "@/components/ui/badge"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { Payment } from "@/types/payment"

interface PaymentHistoryProps {
  payments: (Payment & { plan?: { name: string; days: number } | null })[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Aún no tienes pagos registrados
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Historial de pagos
      </h3>
      <Card className="p-0 overflow-hidden">
        {payments.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-start gap-3 px-4 py-3.5 ${
              i < payments.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div className="size-9 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard className="size-4 text-zinc-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-200 truncate">
                  {p.plan?.name ?? "Pago personalizado"}
                </span>
                <PaymentBadge status={p.status} />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-500">{formatDate(p.created_at)}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-xs text-zinc-500">
                  {PAYMENT_METHOD_LABELS[p.method]}
                </span>
              </div>
              {p.note && (
                <p className="text-xs text-zinc-500 mt-1 italic">{p.note}</p>
              )}
            </div>
            <span className="text-sm font-semibold text-zinc-200 shrink-0">
              {formatCOP(p.amount_cents)}
            </span>
          </div>
        ))}
      </Card>
    </div>
  )
}
