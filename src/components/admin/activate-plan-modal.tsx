"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, X, Loader2, CheckCircle } from "lucide-react"
import { createManualPaymentAction } from "@/actions/admin.actions"
import { formatCOP } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { PaymentMethod } from "@/types/payment"

interface Plan {
  id: string
  name: string
  days: number
  duration_days: number
  price_cents: number
}

interface ActivatePlanModalProps {
  clientId: string
  clientName: string
  plans: Plan[]
}

const METHODS: PaymentMethod[] = ["cash", "transfer", "nequi", "daviplata", "other"]

export function ActivatePlanModal({ clientId, clientName, plans }: ActivatePlanModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [planId, setPlanId] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const selectedPlan = plans.find((p) => p.id === planId)

  const reset = () => {
    setPlanId("")
    setMethod("cash")
    setStatus("idle")
    setErrorMsg("")
  }

  const handleActivate = async () => {
    if (!selectedPlan) return
    setStatus("loading")
    setErrorMsg("")
    const result = await createManualPaymentAction({
      clientId,
      planId: selectedPlan.id,
      amountCents: selectedPlan.price_cents,
      method,
      totalDays: selectedPlan.days,
      durationDays: selectedPlan.duration_days,
    })
    if (result.error) {
      setErrorMsg(result.error)
      setStatus("error")
    } else {
      setStatus("done")
      router.refresh()
    }
  }

  const close = () => {
    setOpen(false)
    setTimeout(reset, 200)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 transition-colors shrink-0"
      >
        <Zap className="size-3.5" />
        Activar plan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
              <X className="size-5" />
            </button>

            {status === "done" ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="size-14 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle className="size-7 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-400">¡Plan activado!</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {clientName} ya tiene su membresía activa
                  </p>
                </div>
                <button
                  onClick={close}
                  className="mt-2 text-sm text-red-500 hover:text-red-400"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-zinc-100">Activar plan</h3>
                  <p className="text-xs text-zinc-500">{clientName}</p>
                </div>

                {/* Selección de plan */}
                <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-zinc-400">Plan</label>
                  <div className="space-y-2">
                    {(() => {
                      const singleDayPlan = plans.find(p => p.days === 1 || p.name.toLowerCase().includes('suelto'))
                      const singleDayPrice = singleDayPlan ? singleDayPlan.price_cents : 500000

                      return plans.map((p) => {
                        const isSingleDay = p.days === 1
                        const expectedFullPrice = p.days * singleDayPrice
                        const discountPercent = !isSingleDay && expectedFullPrice > 0
                          ? Math.round((1 - (p.price_cents / expectedFullPrice)) * 100)
                          : 0

                        return (
                          <button
                            key={p.id}
                            onClick={() => setPlanId(p.id)}
                            className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                              planId === p.id
                                ? "border-red-500 bg-red-950/20 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                                : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/20"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-semibold text-zinc-200">{p.name}</p>
                              <p className="text-[11px] text-zinc-500">
                                {p.days} días en {p.duration_days} días calendario
                              </p>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className="text-sm font-bold text-zinc-100">
                                {formatCOP(p.price_cents)}
                              </span>
                              {discountPercent > 0 && (
                                <span className="rounded bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[9px] font-bold text-green-400 uppercase tracking-wider">
                                  Ahorra {discountPercent}%
                                </span>
                              )}
                            </div>
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Método de pago */}
                <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-zinc-400">Método de pago</label>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          method === m
                            ? "border-red-600 bg-red-600/10 text-red-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
                        }`}
                      >
                        {PAYMENT_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>

                {status === "error" && (
                  <p className="text-xs text-red-400 mb-3">{errorMsg}</p>
                )}

                <button
                  onClick={handleActivate}
                  disabled={!selectedPlan || status === "loading"}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {status === "loading" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="size-4" />
                      {selectedPlan
                        ? `Activar ${selectedPlan.days} días`
                        : "Selecciona un plan"}
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-zinc-600 mt-3">
                  Se registrará un pago aprobado y se activará la membresía de inmediato
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
