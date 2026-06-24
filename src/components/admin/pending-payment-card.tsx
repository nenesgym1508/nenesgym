"use client"

import { useState } from "react"
import { Check, X, Loader2, Eye, Sparkles, AlertTriangle, CheckCircle, Zap } from "lucide-react"
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
  // Campos IA (opcionales — pueden no existir en pagos antiguos)
  ai_valido?: boolean | null
  ai_razon?: string | null
  ai_monto?: number | null
  ai_referencia?: string | null
  ai_entidad?: string | null
  ai_nombre?: string | null
  ai_numero_destino?: string | null
  auto_aprobado?: boolean
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
  const hasAI = payment.ai_valido !== undefined && payment.ai_valido !== null
  const aiValido = payment.ai_valido === true

  const handleApprove = async () => {
    setStatus("approving")
    const result = await approvePaymentAction(payment.id, totalDays, durationDays)
    if (result.error) { setErrorMsg(result.error); setStatus("error") }
    else setStatus("done")
  }

  const handleReject = async () => {
    if (!rejectNote.trim()) return
    setStatus("rejecting")
    const result = await rejectPaymentAction(payment.id, rejectNote)
    if (result.error) { setErrorMsg(result.error); setStatus("error") }
    else setStatus("done")
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
          <p className="text-xs text-zinc-500">{payment.client?.profile?.email ?? ""}</p>
          {payment.client?.profile?.phone && (
            <p className="text-xs text-zinc-500">{payment.client.profile.phone}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-base font-bold text-zinc-100">{formatCOP(payment.amount_cents)}</p>
          <p className="text-xs text-zinc-500">{PAYMENT_METHOD_LABELS[payment.method]}</p>
        </div>
      </div>

      {/* Plan + fecha */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{payment.plan?.name ?? "Plan personalizado"}</span>
        <span className="text-zinc-500">{formatDate(payment.created_at)}</span>
      </div>

      {/* Detalles del plan */}
      <div className="rounded-lg bg-zinc-800/60 px-3 py-2 text-xs text-zinc-400">
        Membresía: <strong className="text-zinc-200">{totalDays} días</strong> durante{" "}
        <strong className="text-zinc-200">{durationDays} días</strong> calendario
      </div>

      {/* ── Análisis IA ──────────────────────────────────────────────────────────── */}
      {hasAI && (
        <div
          className={`rounded-xl border p-3 space-y-2 ${
            aiValido
              ? "border-green-800/40 bg-green-950/15"
              : "border-yellow-800/40 bg-yellow-950/15"
          }`}
        >
          {/* Header IA */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-zinc-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Análisis IA
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {aiValido ? (
                <>
                  <CheckCircle className="size-3.5 text-green-400" />
                  <span className="text-xs font-semibold text-green-400">Válido</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400">Revisar</span>
                </>
              )}
              {payment.auto_aprobado && (
                <span className="ml-1 flex items-center gap-1 rounded bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                  <Zap className="size-2.5" />
                  Auto
                </span>
              )}
            </div>
          </div>

          {/* Motivo si no es válido */}
          {!aiValido && payment.ai_razon && (
            <p className="text-xs text-yellow-400/80">{payment.ai_razon}</p>
          )}

          {/* Datos detectados */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {payment.ai_monto != null && (
              <AiDataRow label="Monto detectado" value={`$${payment.ai_monto.toLocaleString("es-CO")}`} />
            )}
            {payment.ai_entidad && (
              <AiDataRow label="Entidad" value={payment.ai_entidad} />
            )}
            {payment.ai_referencia && (
              <AiDataRow label="Referencia" value={payment.ai_referencia} />
            )}
            {payment.ai_nombre && (
              <AiDataRow label="Destinatario" value={payment.ai_nombre} />
            )}
          </div>
        </div>
      )}

      {/* Comprobante — imagen inline */}
      {payment.receipt_path && (
        <a
          href={`/api/receipt?path=${encodeURIComponent(payment.receipt_path)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl overflow-hidden border border-white/8 bg-zinc-900 hover:border-white/20 transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/receipt?path=${encodeURIComponent(payment.receipt_path)}`}
            alt="Comprobante de pago"
            className="w-full max-h-52 object-contain block"
          />
          <div className="flex items-center gap-1.5 px-3 py-2 border-t border-white/8">
            <Eye className="size-3 text-zinc-500" />
            <span className="text-xs text-zinc-500">Ver completo</span>
          </div>
        </a>
      )}

      {/* Error */}
      {status === "error" && <p className="text-xs text-red-400">{errorMsg}</p>}

      {/* Formulario rechazo */}
      {showReject && (
        <div className="space-y-2">
          <textarea
            placeholder="Motivo del rechazo (requerido)…"
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

function AiDataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-600">{label}</p>
      <p className="text-[11px] text-zinc-400 truncate">{value}</p>
    </div>
  )
}
