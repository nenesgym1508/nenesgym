"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Check, X, ChevronDown, ChevronUp } from "lucide-react"
import { approvePaymentAction } from "@/actions/admin.actions"
import { PendingPaymentCard } from "@/components/admin/pending-payment-card"
import { Card } from "@/components/ui/card"
import { LoadingButton } from "@/components/ui/loading-button"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import type { PaymentMethod } from "@/types/payment"

interface PendingPaymentPreview {
  id: string
  amount_cents: number
  method: PaymentMethod
  receipt_path: string | null
  created_at: string
  ai_valido?: boolean | null
  ai_razon?: string | null
  ai_monto?: number | null
  ai_referencia?: string | null
  ai_entidad?: string | null
  ai_nombre?: string | null
  ai_numero_destino?: string | null
  auto_aprobado?: boolean
  client?: { id: string; profile?: { full_name: string | null; email: string | null; phone: string | null } | null } | null
  plan?: { name: string; days: number; duration_days: number } | null
}

export function PendingPaymentsPreview({ payments }: { payments: PendingPaymentPreview[] }) {
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [errorId, setErrorId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const visible = payments.filter((p) => !approvedIds.has(p.id))

  if (visible.length === 0) return null

  const handleApprove = (p: PendingPaymentPreview) => {
    setErrorId(null)
    setApprovingId(p.id)
    startTransition(async () => {
      const res = await approvePaymentAction(p.id, p.plan?.days ?? 20, p.plan?.duration_days ?? 30)
      setApprovingId(null)
      if (res.error) {
        setErrorId(p.id)
      } else {
        setApprovedIds((prev) => new Set(prev).add(p.id))
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Pagos por aprobar</h3>
        <Link href={ROUTES.ADMIN_PAGOS} className="text-xs text-red-500 hover:text-red-400 font-semibold">
          Ver todos
        </Link>
      </div>
      
      <div className="flex flex-col gap-4">
        {visible.slice(0, 3).map((p) => {
          const isExpanded = expandedId === p.id
          const clientName = p.client?.profile?.full_name ?? "Cliente"
          const initials = clientName
            .split(" ")
            .map((n) => n.charAt(0))
            .slice(0, 2)
            .join("")
            .toUpperCase()

          return (
            <Card key={p.id} className="p-0 overflow-hidden relative bg-zinc-900/60 border border-white/8 rounded-3xl">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none"></div>
              
              <div className="p-5 space-y-4">
                {/* Fila superior: Info Cliente + Monto */}
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-sm font-bold bg-zinc-950 text-zinc-300">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm tracking-tight text-zinc-100 truncate">{clientName}</h4>
                      <p className="text-zinc-500 text-xs mt-0.5 font-medium">
                        {PAYMENT_METHOD_LABELS[p.method]} • {formatDate(p.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-sm block mb-1 text-zinc-100">{formatCOP(p.amount_cents)}</span>
                    <span className="text-[10px] text-white bg-red-600 border border-red-600/30 rounded-full px-2.5 py-0.5 inline-block font-bold">
                      Pendiente
                    </span>
                  </div>
                </div>

                {/* Mostrar error si falla */}
                {errorId === p.id && (
                  <p className="text-xs text-red-400 mt-1">No se pudo aprobar. Intenta desde el panel de Pagos.</p>
                )}

                {/* Fila inferior: Botones de Acción */}
                <div className="flex gap-2 relative z-10">
                  {/* Botón Rechazar (X) */}
                  <button
                    onClick={() => {
                      const isCurrentlyRejecting = isExpanded && rejectingId === p.id
                      setExpandedId(isCurrentlyRejecting ? null : p.id)
                      setRejectingId(isCurrentlyRejecting ? null : p.id)
                    }}
                    className={`w-12 h-10 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                      isExpanded && rejectingId === p.id
                        ? "bg-red-600/20 border-red-600/40 text-red-400"
                        : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                    aria-label="Rechazar pago"
                  >
                    <X className="size-4" />
                  </button>

                  {/* Botón Aprobar (Aprobar) */}
                  <LoadingButton
                    onClick={() => handleApprove(p)}
                    pending={approvingId === p.id}
                    pendingText="Aprobando..."
                    className="flex-1 h-10 btn-glossy-green text-white rounded-xl flex items-center justify-center gap-2 text-sm font-bold disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="size-4" strokeWidth={2.5} />
                    Aprobar
                  </LoadingButton>

                  {/* Botón Expandir (Chevron) */}
                  <button
                    onClick={() => {
                      const isCurrentlyExpanded = isExpanded && rejectingId !== p.id
                      setExpandedId(isCurrentlyExpanded ? null : p.id)
                      setRejectingId(null)
                    }}
                    className={`w-12 h-10 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${
                      isExpanded && rejectingId !== p.id
                        ? "bg-zinc-800 border-white/20 text-zinc-200"
                        : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                    }`}
                    aria-label="Ver detalles"
                  >
                    {isExpanded && rejectingId !== p.id ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-white/8 p-4 bg-zinc-950/40">
                  <PendingPaymentCard payment={p as any} initialShowReject={rejectingId === p.id} />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
