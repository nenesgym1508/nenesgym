import { CreditCard } from "lucide-react"
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
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Historial de pagos
      </h3>
      <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
        {payments.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-start gap-3 px-5 py-3.5 ${
              i < payments.length - 1 ? "border-b border-white/5" : ""
            }`}
          >
            <div className="w-10 h-10 rounded-full border border-zinc-600 bg-zinc-950 flex items-center justify-center shrink-0 mt-0.5">
              <CreditCard className="size-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bebas text-base tracking-wide uppercase text-white truncate">
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
      </div>
    </div>
  )
}
