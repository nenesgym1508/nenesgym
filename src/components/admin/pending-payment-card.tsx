"use client"

import { useState } from "react"
import { Check, X, Loader2, Eye } from "lucide-react"
import { approvePaymentAction, rejectPaymentAction } from "@/actions/admin.actions"
import { Card } from "@/components/ui/card"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { PaymentMethod } from "@/types/payment"

interface PendingPayment {
  id: string
  amount_cents: number
  method: PaymentMethod
  receipt_path: string | null
  created_at: string
  plan?: {
    name: string
    days: number
    duration_days: number
  } | null
  client?: {
    id: string
    profile?: {
      full_name: string | null
      email: string | null
      phone: string | null
    } | null
  } | null
}

interface PendingPaymentCardProps {
  payment: PendingPayment
}

export function PendingPaymentCard({ payment }: PendingPaymentCardProps) {
  const [status, setStatus] = useState<"idle" | "approving" | "rejecting" | "done" | "error">("idle")
  const [rejectNote, setRejectNote] = useState("")
  const [showReject, setShowReject] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  const totalDays = payment.plan?.days ?? 20
  const durationDays = payment.plan?.duration_days ?? 30

  const handleApprove = async () => {
    setStatus("approving")
    const result = await approvePaymentAction(payment.id, totalDays, durationDays)
    if (result.error) {
      setErrorMsg(result.error)
      setStatus("error")
    } else {
      setStatus("done")
    }
  }

  const handleReject = async () => {
    if (!rejectNote.trim()) return
    setStatus("rejecting")
    const result = await rejectPaymentAction(payment.id, rejectNote)
    if (result.error) {
      setErrorMsg(result.error)
      setStatus("error")
    } else {
      setStatus("done")
    }
  }

  if (status === "done") {
    return (
      <Card className="text-center py-4">
        <p className="text-sm text-zinc-400">✓ Pago procesado</p>
      </Card>
    )
  }

  return (
    <Card className="space-y-3">
      {/* Info cliente */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            {payment.client?.profile?.full_name ?? "Sin nombre"}
          </p>
          <p className="text-xs text-zinc-500">
            {payment.client?.profile?.email ?? ""}
          </p>
          {payment.client?.profile?.phone && (
            <p className="text-xs text-zinc-500">{payment.client.profile.phone}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-zinc-100">{formatCOP(payment.amount_cents)}</p>
          <p className="text-xs text-zinc-500">{PAYMENT_METHOD_LABELS[payment.method]}</p>
        </div>
      </div>

      {/* Plan */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">
          {payment.plan?.name ?? "Plan personalizado"}
        </span>
        <span className="text-zinc-500">{formatDate(payment.created_at)}</span>
      </div>

      {/* Detalles del plan a activar */}
      <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400">
        Membresía: <strong className="text-zinc-200">{totalDays} días</strong> durante{" "}
        <strong className="text-zinc-200">{durationDays} días</strong> calendario
      </div>

      {/* Comprobante */}
      {payment.receipt_path && (
        <a
          href={`/api/receipt?path=${encodeURIComponent(payment.receipt_path)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
        >
          <Eye className="size-3" />
          Ver comprobante
        </a>
      )}

      {/* Error */}
      {status === "error" && (
        <p className="text-xs text-red-400">{errorMsg}</p>
      )}

      {/* Formulario de rechazo */}
      {showReject && (
        <div className="space-y-2">
          <textarea
            placeholder="Motivo del rechazo (requerido)..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-red-600"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowReject(false)}
              className="flex-1 rounded-lg border border-white/10 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              onClick={handleReject}
              disabled={!rejectNote.trim() || status === "rejecting"}
              className="flex-1 rounded-lg bg-red-600/20 border border-red-600/40 py-2 text-sm text-red-400 hover:bg-red-600/30 disabled:opacity-50"
            >
              {status === "rejecting" ? (
                <Loader2 className="size-3.5 animate-spin mx-auto" />
              ) : (
                "Confirmar rechazo"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Botones principales */}
      {!showReject && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowReject(true)}
            disabled={status === "approving"}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/30 py-2.5 text-sm text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
          >
            <X className="size-4" />
            Rechazar
          </button>
          <button
            onClick={handleApprove}
            disabled={status === "approving"}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {status === "approving" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Check className="size-4" />
                Aprobar
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  )
}
