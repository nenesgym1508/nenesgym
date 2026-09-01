"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, X, CheckCircle, Minus, Plus } from "lucide-react"
import { createManualPaymentAction } from "@/actions/admin.actions"
import { LoadingButton } from "@/components/ui/loading-button"
import { formatCOP, computePlanDiscount } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { PaymentMethod } from "@/types/payment"
import { formatDate, addDays, todayInBogota } from "@/lib/dates"

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
  triggerVariant?: 'default' | 'card'
  isActive?: boolean
  currentEndDate?: string
}

const METHODS: PaymentMethod[] = ["cash", "transfer", "nequi", "daviplata", "other"]

export function ActivatePlanModal({ clientId, clientName, plans, triggerVariant, isActive, currentEndDate }: ActivatePlanModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [planId, setPlanId] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  // Días que el socio ya lleva entrenando sin plan. Se descuentan del plan que
  // se le vende ahora: el plan pasa a cubrir, retroactivamente, esos días.
  const [usedDays, setUsedDays] = useState(0)

  // Idempotencia del cobro: un doble clic reutiliza este id y la RPC devuelve
  // ALREADY_APPLIED en vez de cobrar dos veces.
  //
  // ⚠️ REGENERARLO al abrir el modal y tras cada éxito es obligatorio, no
  // higiene. Si se reutilizara entre cobros, la segunda RENOVACIÓN del mismo
  // cliente devolvería ALREADY_APPLIED y **no se cobraría** — el mismo bug del
  // doble cobro, pero al revés y mucho más difícil de detectar.
  const requestIdRef = useRef<string>("")

  const openModal = () => {
    requestIdRef.current = crypto.randomUUID()
    setOpen(true)
  }

  const selectedPlan = plans.find((p) => p.id === planId)

  // Tope: siempre debe quedarle al menos 1 día. Descontar el plan entero sería
  // cobrar por nada, y `apply_membership_purchase` crearía una membresía que
  // nace vencida.
  const maxUsedDays = selectedPlan ? Math.max(0, selectedPlan.days - 1) : 0
  const appliedUsed = Math.min(usedDays, maxUsedDays)

  // El descuento se hace restando a los DOS números, no solo a los días:
  // el plan es "N días dentro de una ventana de M días de calendario". Si solo
  // se restaran los días, la ventana seguiría siendo la completa y el socio
  // acabaría con el mismo plazo para menos días — un plan distinto al vendido.
  //
  // ⚠️ No se toca `start_date` ni `occurred_at` para conseguir esto. Retroceder
  // la fecha de inicio parece más natural, pero el consumo se cuenta por días
  // HÁBILES (`eligible_days_elapsed`): retroceder 5 días de calendario podría
  // descontar solo 3. Restando a los números, lo que el admin teclea es
  // exactamente lo que se descuenta.
  const totalDays = selectedPlan ? selectedPlan.days - appliedUsed : 0
  const durationDays = selectedPlan ? Math.max(1, selectedPlan.duration_days - appliedUsed) : 0

  const reset = () => {
    setPlanId("")
    setMethod("cash")
    setStatus("idle")
    setErrorMsg("")
    setUsedDays(0)
  }

  const handleActivate = async () => {
    if (!selectedPlan) return
    setStatus("loading")
    setErrorMsg("")
    let result: Awaited<ReturnType<typeof createManualPaymentAction>>
    try {
      result = await createManualPaymentAction({
        clientId,
        planId: selectedPlan.id,
        // El precio NO se descuenta: el socio paga el plan completo y este pasa a
        // cubrir los días que ya entrenó. Descontar días es ajustar lo que le
        // queda, no hacerle una rebaja.
        amountCents: selectedPlan.price_cents,
        method,
        totalDays,
        durationDays,
        clientRequestId: requestIdRef.current,
      })
    } catch {
      // Un Server Action que falla RECHAZA la promesa: sin este catch el estado
      // se quedaba en "loading" y LoadingButton dejaba el botón muerto.
      setErrorMsg("No se pudo conectar. Revisa la conexión e intenta de nuevo.")
      setStatus("error")
      return
    }
    if (result.error) {
      setErrorMsg(result.error)
      setStatus("error")
    } else {
      setStatus("done")
      // Cobro consumido: el siguiente necesita una intención nueva.
      requestIdRef.current = crypto.randomUUID()
      router.refresh()
    }
  }

  const close = () => {
    setOpen(false)
    setTimeout(reset, 200)
  }

  return (
    <>
      {triggerVariant === 'card' ? (
        <button
          onClick={openModal}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl btn-glossy-red py-3 text-xs font-semibold text-white cursor-pointer hover:scale-[1.01] transition-transform"
        >
          <UserCheck className="size-4" />
          {isActive ? "Expandir plan" : "Activar plan"}
        </button>
      ) : (
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/40 transition-colors shrink-0 cursor-pointer"
        >
          <UserCheck className="size-3.5" />
          {isActive ? "Expandir plan" : "Activar plan"}
        </button>
      )}

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
                        const discountPercent = computePlanDiscount(p.price_cents, p.days, singleDayPrice)

                        return (
                          <button
                            key={p.id}
                            onClick={() => setPlanId(p.id)}
                            className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-[border-color,background-color,color,box-shadow] ${
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

                {/* Días ya entrenados sin plan. Solo aparece con plan elegido:
                    sin plan no hay tope contra el que validar. */}
                {selectedPlan && (
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-medium text-zinc-400">
                      Días que ya lleva viniendo{" "}
                      <span className="text-zinc-600">(opcional)</span>
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
                      <button
                        type="button"
                        onClick={() => setUsedDays((d) => Math.max(0, d - 1))}
                        disabled={appliedUsed === 0}
                        aria-label="Quitar un día"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 disabled:opacity-30 cursor-pointer"
                      >
                        <Minus className="size-4" />
                      </button>

                      <div className="flex-1 text-center">
                        <p className="text-xl font-bold tabular-nums text-zinc-100">{appliedUsed}</p>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                          {appliedUsed === 1 ? "día usado" : "días usados"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setUsedDays((d) => Math.min(maxUsedDays, d + 1))}
                        disabled={appliedUsed >= maxUsedDays}
                        aria-label="Sumar un día"
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 disabled:opacity-30 cursor-pointer"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>

                    {appliedUsed > 0 ? (
                      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] leading-normal text-amber-200 space-y-1">
                        <p>
                          Se le descuentan <strong className="text-zinc-100">{appliedUsed}</strong>{" "}
                          {appliedUsed === 1 ? "día" : "días"} de los{" "}
                          <strong className="text-zinc-100">{selectedPlan.days}</strong> del plan:
                          le quedan <strong className="text-zinc-100">{totalDays}</strong> días
                          {!isActive && (
                            <>
                              {" "}y vencerá el{" "}
                              <strong className="text-zinc-100">
                                {formatDate(addDays(todayInBogota(), durationDays - 1))}
                              </strong>
                            </>
                          )}
                          .
                        </p>
                        <p className="text-amber-400/70">
                          Paga el precio completo del plan. Úsalo para el socio que ya llevaba
                          días entrenando sin haberlo comprado.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] leading-normal text-zinc-500">
                        Si el socio ya llevaba días entrenando sin plan, súmalos aquí y se
                        descontarán del plan que le vendes ahora.
                      </p>
                    )}
                  </div>
                )}

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

                {isActive && currentEndDate && selectedPlan && (
                  <div className="rounded-xl border border-blue-500/20 bg-blue-950/20 p-3 text-[11px] text-blue-300 leading-normal mb-3 space-y-1">
                    <p className="font-semibold flex items-center gap-1">
                      ℹ️ Plan acumulativo
                    </p>
                    <p>
                      El cliente tiene un plan activo que vence el <strong className="text-zinc-200">{formatDate(currentEndDate)}</strong>.
                    </p>
                    <p>
                      Al activar este plan, se sumarán <strong className="text-zinc-200">{totalDays} días</strong> y el nuevo vencimiento será el <strong className="text-zinc-200 font-bold">{formatDate(addDays(currentEndDate, durationDays))}</strong>.
                    </p>
                  </div>
                )}

                {status === "error" && (
                  <p className="text-xs text-red-400 mb-3">{errorMsg}</p>
                )}

                <LoadingButton
                  onClick={handleActivate}
                  pending={status === "loading"}
                  pendingText={isActive ? "Expandiendo..." : "Activando..."}
                  disabled={!selectedPlan}
                  className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-green py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <UserCheck className="size-4" />
                  {selectedPlan
                    ? isActive
                      ? `Expandir ${totalDays} días`
                      : `Activar ${totalDays} días`
                    : "Selecciona un plan"}
                </LoadingButton>
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
