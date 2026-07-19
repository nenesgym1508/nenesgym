"use client"

import { useState } from "react"
import { CreditCard, ChevronLeft, ChevronRight } from "lucide-react"
import { PaymentBadge } from "@/components/ui/badge"
import { RefreshButton } from "@/components/ui/refresh-button"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { Payment } from "@/types/payment"

interface PaymentHistoryProps {
  payments: (Payment & { plan?: { name: string; days: number } | null })[]
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  const [page, setPage] = useState(1)
  const itemsPerPage = 5

  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 text-sm">
        Aún no tienes pagos registrados
      </div>
    )
  }

  const totalPages = Math.ceil(payments.length / itemsPerPage)
  // Si la lista se redujo (revalidación) y "page" quedó fuera de rango, se recorta
  // en vez de mostrar una página vacía.
  const safePage = Math.min(page, totalPages)
  const paginatedPayments = payments.slice((safePage - 1) * itemsPerPage, safePage * itemsPerPage)

  return (
    <div className="space-y-3">
      {/* Título de sección con borde rojo */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center border-l-2 border-red-600 pl-3.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Historial de pagos
          </h3>
          <span className="ml-2 text-[10px] text-zinc-600 font-medium">
            ({payments.length} {payments.length === 1 ? "registro" : "registros"})
          </span>
        </div>
        <RefreshButton />
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
        {paginatedPayments.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-start gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${
              i < paginatedPayments.length - 1 ? "border-b border-white/5" : ""
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

        {/* Controles de paginación al pie */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5 bg-zinc-950/40">
            <span className="text-[11px] text-zinc-500 font-medium">
              Página <span className="text-zinc-300">{safePage}</span> de <span className="text-zinc-300">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-white/5 text-zinc-400 text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 hover:text-white transition-all"
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-800 border border-white/5 text-zinc-400 text-[11px] font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-700 hover:text-white transition-all"
              >
                Siguiente
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
