"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserPlus, X, CheckCircle, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react"
import { createClientAction } from "@/actions/admin.actions"
import { createInvitationAction } from "@/actions/invitations.actions"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { InvitationActions } from "@/components/admin/invitation-actions"
import { formatCOP, computePlanDiscount } from "@/lib/utils"
import { formatDate, todayInBogota, addDays, daysPerWeekForPlan } from "@/lib/dates"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import { adminClienteDetalle } from "@/constants/routes"
import type { PaymentMethod } from "@/types/payment"

interface Plan {
  id: string
  name: string
  days: number
  duration_days: number
  price_cents: number
}

interface NewClientModalProps {
  plans: Plan[]
  /** 'primary' = botón rojo destacado (Inicio). 'secondary' = borde discreto (cabecera de Clientes). */
  variant?: "primary" | "secondary"
}

const METHODS: PaymentMethod[] = ["cash", "transfer", "nequi", "daviplata", "other"]

export function NewClientModal({ plans, variant = "primary" }: NewClientModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")

  const [planId, setPlanId] = useState("")
  const [method, setMethod] = useState<PaymentMethod>("cash")

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")
  const [planWarning, setPlanWarning] = useState("")
  const [createdId, setCreatedId] = useState("")
  // Enlace de invitación del paso 3. Se genera aquí, ya con el cliente y el pago
  // creados, y NO en un efecto del componente hijo: generar revoca el enlace
  // anterior, así que tiene que dispararlo el flujo, no un render.
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [inviteWaUrl, setInviteWaUrl] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)

  // Idempotencia del alta. Un doble clic o un reintento tras un fallo de red
  // reutilizan este id: el correo marcador sale determinista (no se duplica el
  // socio) y la RPC del pago devuelve ALREADY_APPLIED (no se cobra dos veces).
  //
  // ⚠️ Un requestId = UNA intención de cobro. Se regenera al ABRIR el modal y
  // tras cada éxito — nunca en un render ni en cada submit.
  const requestIdRef = useRef<string>("")

  const selectedPlan = plans.find((p) => p.id === planId)
  const nameOk = fullName.trim().length >= 2
  // El celular es obligatorio: se valida igual que en el servidor (solo dígitos).
  const phoneOk = phone.replace(/\D/g, "").length >= 10
  const canContinue = nameOk && phoneOk

  // Vista previa del plan. ⚠️ El vencimiento lleva `- 1` porque
  // apply_membership_purchase calcula `start_date + duration_days - 1` al crear
  // una membresía NUEVA, que es siempre el caso de un cliente recién dado de
  // alta. No copiar la fórmula de ActivatePlanModal: esa es la de acumulación.
  const startDate = todayInBogota()
  const endDate = selectedPlan ? addDays(startDate, selectedPlan.duration_days - 1) : null

  const openModal = () => {
    requestIdRef.current = crypto.randomUUID()
    setOpen(true)
  }

  const reset = () => {
    setStep(1)
    setFullName("")
    setPhone("")
    setEmail("")
    setPlanId("")
    setMethod("cash")
    setStatus("idle")
    setErrorMsg("")
    setPlanWarning("")
    setCreatedId("")
    setInviteUrl(null)
    setInviteWaUrl(null)
    setInviteLoading(false)
  }

  const close = () => {
    setOpen(false)
    setTimeout(reset, 200)
  }

  const submit = async (withPlan: boolean) => {
    if (!canContinue) return
    if (withPlan && !selectedPlan) return
    setStatus("loading")
    setErrorMsg("")
    setPlanWarning("")

    let result: Awaited<ReturnType<typeof createClientAction>>
    try {
      result = await createClientAction({
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim(),
      clientRequestId: requestIdRef.current,
      plan:
        withPlan && selectedPlan
          ? {
              planId: selectedPlan.id,
              amountCents: selectedPlan.price_cents,
              method,
              totalDays: selectedPlan.days,
              durationDays: selectedPlan.duration_days,
            }
          : undefined,
      })
    } catch {
      // Un Server Action que falla RECHAZA la promesa: sin este catch el estado
      // se quedaba en "loading" y LoadingButton (disabled={pending}) dejaba el
      // botón muerto hasta recargar la página.
      setErrorMsg("No se pudo conectar. Revisa la conexión e intenta de nuevo.")
      setStatus("error")
      return
    }

    if ("error" in result) {
      setErrorMsg(result.error)
      setStatus("error")
      return
    }
    setCreatedId(result.clientId)
    if (result.planWarning) setPlanWarning(result.planWarning)
    setStatus("done")
    // Alta consumida: el siguiente cobro necesita una intención nueva.
    requestIdRef.current = crypto.randomUUID()
    router.refresh()

    // La invitación va DESPUÉS y es independiente: si falla, el cliente, el pago
    // y la membresía siguen intactos y el admin puede invitarlo desde la ficha.
    setInviteLoading(true)
    const invite = await createInvitationAction(result.clientId)
    setInviteLoading(false)
    if (!("error" in invite)) {
      setInviteUrl(invite.url)
      setInviteWaUrl(invite.waUrl)
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className={
          variant === "primary"
            ? "flex w-full items-center justify-center gap-2 rounded-2xl btn-glossy-red px-4 md:px-10 py-4 text-sm font-semibold text-white cursor-pointer"
            : "flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900/90 hover:bg-zinc-800/90 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition-colors cursor-pointer shrink-0"
        }
      >
        <UserPlus className={variant === "primary" ? "size-5" : "size-4 text-red-500"} />
        Registrar cliente
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <div
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
              <X className="size-5" />
            </button>

            {status === "done" ? (
              <div className="flex flex-col items-center gap-3 py-2 text-center">
                <div className="size-14 rounded-full bg-green-500/15 flex items-center justify-center">
                  <CheckCircle className="size-7 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-400">Cliente registrado</p>
                  <p className="text-base font-bold text-zinc-100 mt-1">{fullName.trim()}</p>
                  <p className="text-xs text-zinc-500">{phone.trim()}</p>
                </div>

                {selectedPlan && !planWarning && (
                  <div className="w-full rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Plan actual
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {selectedPlan.name} · {daysPerWeekForPlan(selectedPlan.days)} días/semana
                    </p>
                    <dl className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between"><dt className="text-zinc-500">Inicio</dt><dd className="text-zinc-300">{formatDate(startDate)}</dd></div>
                      {endDate && <div className="flex justify-between"><dt className="text-zinc-500">Vence</dt><dd className="text-zinc-300">{formatDate(endDate)}</dd></div>}
                      <div className="flex justify-between"><dt className="text-zinc-500">Días</dt><dd className="text-zinc-300">{selectedPlan.days}</dd></div>
                      <div className="flex justify-between"><dt className="text-zinc-500">Pago</dt><dd className="text-zinc-300">{formatCOP(selectedPlan.price_cents)} · {PAYMENT_METHOD_LABELS[method]}</dd></div>
                    </dl>
                  </div>
                )}

                {!selectedPlan && !planWarning && (
                  <p className="text-xs text-zinc-500">Todavía sin membresía</p>
                )}

                {planWarning && (
                  <div className="w-full rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 text-left text-[11px] leading-normal text-amber-300">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5" /> El plan no se activó
                    </p>
                    <p className="mt-1">{planWarning}</p>
                    <p className="mt-1 text-amber-200/80">
                      El cliente sí quedó creado. Actívale el plan desde su ficha.
                    </p>
                  </div>
                )}

                {/* La invitación es OPCIONAL y va después del alta: si el admin
                    cierra aquí sin enviarla, el cliente, el pago y la membresía
                    siguen intactos y podrá invitarlo luego desde la ficha. */}
                <div className="w-full border-t border-white/5 pt-3">
                  <p className="mb-2 text-[11px] leading-normal text-zinc-400">
                    Invítalo a NENE&apos;S GYM para que pueda consultar su membresía,
                    rutinas, pagos y progreso.
                  </p>
                  <InvitationActions
                    clientId={createdId}
                    initialUrl={inviteUrl}
                    initialWaUrl={inviteWaUrl}
                    initialLoading={inviteLoading}
                  />
                </div>

                <div className="flex w-full items-center justify-between pt-1">
                  <Link
                    href={adminClienteDetalle(createdId)}
                    className="text-xs font-medium text-red-500 hover:text-red-400"
                  >
                    Ver ficha del cliente
                  </Link>
                  <button
                    onClick={close}
                    className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-1.5 text-xs font-medium text-zinc-300 hover:border-white/20 cursor-pointer"
                  >
                    Finalizar
                  </button>
                </div>
              </div>
            ) : step === 1 ? (
              <>
                {/* El indicador de pasos no es decoración: sin él, el admin no sabe
                    que el plan viene después y cree que la pantalla no lo incluye. */}
                <div className="mb-4">
                  <h3 className="text-base font-bold text-zinc-100">Registrar cliente</h3>
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-300">Paso 1 de 2</span> · Datos del socio
                  </p>
                </div>

                <div className="space-y-3">
                  <Input
                    id="nc_full_name"
                    label="Nombre completo"
                    placeholder="Juan Pérez"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                  />
                  {/* Obligatorio: identifica al socio, evita duplicados y es el canal
                      por el que se le hará llegar el enlace para vincular su correo. */}
                  <Input
                    id="nc_phone"
                    type="tel"
                    inputMode="numeric"
                    label="WhatsApp"
                    placeholder="3001234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={phone.length > 0 && !phoneOk ? "Al menos 10 dígitos" : undefined}
                  />
                  <Input
                    id="nc_email"
                    type="email"
                    label="Correo (opcional)"
                    placeholder="hola@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                {!email.trim() && (
                  <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-[11px] leading-normal text-zinc-400">
                    Sin correo el socio queda registrado (membresía, ingresos e historial),
                    pero <strong className="text-zinc-300">no podrá entrar a la app</strong>.
                    Podrás agregarle un correo más adelante.
                  </p>
                )}

                {status === "error" && <p className="mt-3 text-xs text-red-400">{errorMsg}</p>}

                <button
                  onClick={() => {
                    setStatus("idle")
                    setErrorMsg("")
                    setStep(2)
                  }}
                  disabled={!canContinue}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-red py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Continuar y elegir plan
                  <ArrowRight className="size-4" />
                </button>
              </>
            ) : (
              <>
                <div className="mb-4 flex items-start gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="mt-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    aria-label="Volver a los datos"
                  >
                    <ArrowLeft className="size-4" />
                  </button>
                  <div>
                    <h3 className="text-base font-bold text-zinc-100">Plan del cliente</h3>
                    <p className="text-xs text-zinc-500">
                      <span className="text-zinc-300">Paso 2 de 2</span> · {fullName.trim()}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-zinc-400">Plan</label>
                  <div className="space-y-2">
                    {(() => {
                      const singleDayPlan = plans.find(
                        (p) => p.days === 1 || p.name.toLowerCase().includes("suelto")
                      )
                      const singleDayPrice = singleDayPlan ? singleDayPlan.price_cents : 500000

                      return plans.map((p) => {
                        const discountPercent = computePlanDiscount(p.price_cents, p.days, singleDayPrice)
                        return (
                          <button
                            key={p.id}
                            onClick={() => setPlanId(p.id)}
                            className={`w-full flex items-center justify-between rounded-xl border p-3.5 text-left transition-[border-color,background-color,color,box-shadow] cursor-pointer ${
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
                              <span className="text-sm font-bold text-zinc-100">{formatCOP(p.price_cents)}</span>
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

                <div className="space-y-2 mb-4">
                  <label className="text-xs font-medium text-zinc-400">Método de pago</label>
                  <div className="flex flex-wrap gap-1.5">
                    {METHODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
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

                {/* Resumen antes de confirmar: el admin ve exactamente lo que va
                    a quedar grabado, con las mismas fórmulas que usa la base. */}
                {selectedPlan && endDate && (
                  <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Plan seleccionado
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {selectedPlan.name} · {daysPerWeekForPlan(selectedPlan.days)} días/semana
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {selectedPlan.days} días disponibles · {selectedPlan.duration_days} días de vigencia
                    </p>
                    <dl className="mt-2.5 space-y-1 border-t border-white/5 pt-2.5 text-[11px]">
                      <div className="flex justify-between"><dt className="text-zinc-500">Inicio</dt><dd className="text-zinc-300">{formatDate(startDate)}</dd></div>
                      <div className="flex justify-between"><dt className="text-zinc-500">Vence</dt><dd className="text-zinc-300">{formatDate(endDate)}</dd></div>
                      <div className="flex justify-between"><dt className="text-zinc-500">Método de pago</dt><dd className="text-zinc-300">{PAYMENT_METHOD_LABELS[method]}</dd></div>
                      <div className="flex justify-between pt-1"><dt className="font-semibold text-zinc-400">Total</dt><dd className="font-bold text-zinc-100">{formatCOP(selectedPlan.price_cents)}</dd></div>
                    </dl>
                  </div>
                )}

                {status === "error" && <p className="text-xs text-red-400 mb-3">{errorMsg}</p>}

                <LoadingButton
                  onClick={() => submit(true)}
                  pending={status === "loading"}
                  pendingText="Registrando..."
                  disabled={!selectedPlan}
                  className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-green py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="size-4" />
                  {selectedPlan ? "Registrar cliente y activar plan" : "Selecciona un plan"}
                </LoadingButton>

                <button
                  onClick={() => submit(false)}
                  disabled={status === "loading"}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium text-zinc-300 hover:border-white/20 disabled:opacity-50 cursor-pointer"
                >
                  Registrar sin plan por ahora
                </button>

                <p className="text-center text-[10px] text-zinc-600 mt-3">
                  Con plan se registra un pago aprobado y la membresía queda activa de inmediato
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
