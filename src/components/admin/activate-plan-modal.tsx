"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { UserCheck, X, CheckCircle } from "lucide-react"
import { createManualPaymentAction, createCustomPlanAction } from "@/actions/admin.actions"
import {
  CustomPlanCard,
  PLAN_MEDIDA_INICIAL,
  ID_PLAN_MEDIDA,
  type PlanAMedida,
} from "@/components/admin/custom-plan-card"
import { LoadingButton } from "@/components/ui/loading-button"
import { UsedDaysField, useUsedDays } from "@/components/admin/used-days-field"
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

  const [medida, setMedida] = useState<PlanAMedida>(PLAN_MEDIDA_INICIAL)

  // El plan a medida se comporta como uno del catálogo para todo lo de abajo
  // (descuento de días, resumen, botón). Así no hay que duplicar esa lógica.
  const esMedida = planId === ID_PLAN_MEDIDA
  const selectedPlan = esMedida
    ? { id: ID_PLAN_MEDIDA, name: "Plan a medida", days: medida.days, duration_days: medida.durationDays, price_cents: medida.priceCents }
    : plans.find((p) => p.id === planId)

  // Descuento por días ya entrenados sin plan (ver used-days-field.tsx).
  const used = useUsedDays(selectedPlan)
  const { totalDays, durationDays } = used

  const reset = () => {
    setPlanId("")
    setMedida(PLAN_MEDIDA_INICIAL)
    setMethod("cash")
    setStatus("idle")
    setErrorMsg("")
    used.reset()
  }

  const handleActivate = async () => {
    if (!selectedPlan) return
    if (esMedida && (medida.days < 1 || medida.durationDays < 1)) {
      setErrorMsg("El plan a medida necesita días y vigencia")
      setStatus("error")
      return
    }
    setStatus("loading")
    setErrorMsg("")

    // Plan a medida "para él": se crea ANTES de cobrar, para poder cobrar con
    // su id. Si falla, no se cobra nada — mejor eso que un pago suelto sin el
    // plan que el cliente esperaba poder renovar.
    let planIdFinal: string | undefined = esMedida ? undefined : selectedPlan.id
    if (esMedida && medida.guardar) {
      const nombre = `${medida.days} días · ${clientName.trim().split(/\s+/)[0] || "cliente"}`
      let creado: Awaited<ReturnType<typeof createCustomPlanAction>>
      try {
        creado = await createCustomPlanAction({
          name: nombre,
          priceCents: medida.priceCents,
          days: medida.days,
          durationDays: medida.durationDays,
        })
      } catch {
        setErrorMsg("No se pudo conectar. Revisa la conexión e intenta de nuevo.")
        setStatus("error")
        return
      }
      if ("error" in creado) {
        setErrorMsg(creado.error)
        setStatus("error")
        return
      }
      planIdFinal = creado.id
    }

    let result: Awaited<ReturnType<typeof createManualPaymentAction>>
    try {
      result = await createManualPaymentAction({
        clientId,
        // Sin plan (undefined) = cobro suelto: la RPC usa los días que le
        // pasamos y la membresía queda sin plan asociado. Es lo que hace
        // "Solo esta vez", y por eso no ensucia el catálogo.
        planId: planIdFinal,
        // El precio NO se descuenta: el cliente paga el plan completo y este pasa a
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
          {/* ⚠️ max-h + flex-col es lo que impide que el modal se salga de la
              pantalla. Este modal NO lo tenía —NewClientModal sí— y con 8
              planes en la lista se cortaba por abajo sin poder desplazarlo: el
              botón de activar quedaba fuera y no había forma de llegar a él.
              La cabecera y el pie se quedan fijos; solo el centro se desplaza,
              así el botón está SIEMPRE a la vista. */}
          <div
            className="relative flex max-h-[90vh] w-full max-w-sm flex-col rounded-2xl bg-zinc-900 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} className="absolute right-4 top-4 z-10 text-zinc-500 hover:text-zinc-300">
              <X className="size-5" />
            </button>

            {status === "done" ? (
              <div className="flex flex-col items-center gap-3 p-5 py-8 text-center">
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
                {/* Cabecera fija */}
                <div className="shrink-0 px-5 pt-5 pb-3">
                  <h3 className="text-base font-bold text-zinc-100">Activar plan</h3>
                  <p className="text-xs text-zinc-500">{clientName}</p>
                </div>

                {/* Zona con desplazamiento: es la que crece con el catálogo */}
                <div className="min-h-0 flex-1 overflow-y-auto px-5">
                {/* Selección de plan */}
                <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-zinc-400">Plan</label>
                  <div className="space-y-2">
                    {/* Primero de la lista: es lo que se usa cuando el catálogo
                        no sirve — cobrarle a alguien unos días sueltos a un
                        precio pactado. */}
                    <CustomPlanCard
                      seleccionado={esMedida}
                      onSelect={() => setPlanId(ID_PLAN_MEDIDA)}
                      valor={medida}
                      onChange={setMedida}
                      clientName={clientName}
                    />

                    {(() => {
                      const singleDayPlan = plans.find(p => p.days === 1 || p.name.toLowerCase().includes('suelto'))
                      const singleDayPrice = singleDayPlan ? singleDayPlan.price_cents : 500000

                      return plans.map((p) => {
                        const discountPercent = computePlanDiscount(p.price_cents, p.days, singleDayPrice)

                        return (
                          <button
                            key={p.id}
                            onClick={() => {
                              setPlanId(p.id)
                              used.clampToPlan(Math.max(0, p.days - 1))
                            }}
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
                    sin plan no hay tope contra el que validar.
                    El vencimiento solo se menciona si NO hay plan vigente: con
                    uno activo la fecha sale de acumular sobre el actual, y eso
                    ya lo explica la caja azul de abajo. */}
                {selectedPlan && (
                  <UsedDaysField
                    planDays={selectedPlan.days}
                    raw={used.raw}
                    onRawChange={used.setRaw}
                    maxUsedDays={used.maxUsedDays}
                    appliedUsed={used.appliedUsed}
                    totalDays={totalDays}
                    endDate={isActive ? null : addDays(todayInBogota(), durationDays - 1)}
                  />
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
                </div>

                {/* Pie fijo: el botón de cobrar tiene que estar SIEMPRE a la
                    vista, por larga que sea la lista de planes. */}
                <div className="shrink-0 border-t border-white/8 px-5 pb-5 pt-4">
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
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
