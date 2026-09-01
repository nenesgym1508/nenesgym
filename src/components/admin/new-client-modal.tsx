"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserPlus, X, CheckCircle, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react"
import { createClientAction, checkClientPhoneAction, createCustomPlanAction } from "@/actions/admin.actions"
import {
  CustomPlanCard,
  PLAN_MEDIDA_INICIAL,
  ID_PLAN_MEDIDA,
  type PlanAMedida,
} from "@/components/admin/custom-plan-card"
import { createInvitationAction } from "@/actions/invitations.actions"
import { Input } from "@/components/ui/input"
import { PhoneField, usePhoneField } from "@/components/ui/phone-field"
import { LoadingButton } from "@/components/ui/loading-button"
import { InvitationActions } from "@/components/admin/invitation-actions"
import { UsedDaysField, useUsedDays } from "@/components/admin/used-days-field"
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
  const [email, setEmail] = useState("")
  // Teléfono con indicativo de país. `phone.value` ya sale en la forma canónica
  // que espera el servidor (ver canonicalPhone en phone-field.tsx).
  const phone = usePhoneField()

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
  // cliente) y la RPC del pago devuelve ALREADY_APPLIED (no se cobra dos veces).
  //
  // ⚠️ Un requestId = UNA intención de cobro. Se regenera al ABRIR el modal y
  // tras cada éxito — nunca en un render ni en cada submit.
  const requestIdRef = useRef<string>("")

  const [medida, setMedida] = useState<PlanAMedida>(PLAN_MEDIDA_INICIAL)

  // El plan a medida se comporta como uno del catálogo para el resumen, el
  // descuento de días y el botón: así no se duplica esa lógica.
  const esMedida = planId === ID_PLAN_MEDIDA
  const selectedPlan = esMedida
    ? { id: ID_PLAN_MEDIDA, name: "Plan a medida", days: medida.days, duration_days: medida.durationDays, price_cents: medida.priceCents }
    : plans.find((p) => p.id === planId)
  const nameOk = fullName.trim().length >= 2

  // ── Aviso de cliente duplicado, EN EL PASO 1 ────────────────────────────────
  // Antes esta comprobación solo ocurría al guardar: el admin rellenaba todo,
  // elegía plan y método de pago, y solo al final le decíamos que ese WhatsApp
  // ya era de otro cliente. Ahora salta en cuanto el número está completo.
  //
  // El resultado guarda PARA QUÉ número es (`para`). Con eso, el estado que se
  // pinta se DERIVA en cada render en vez de escribirse desde el efecto:
  //   · evita el setState síncrono dentro del efecto, que dispara renders en
  //     cascada (la regla react-hooks/set-state-in-effect lo prohíbe), y
  //   · garantiza que una respuesta que llega tarde, para un número que el
  //     admin ya cambió, no se muestre nunca.
  const [respuesta, setRespuesta] = useState<
    { para: string; ocupado: boolean; nombre?: string; error?: boolean } | null
  >(null)

  useEffect(() => {
    if (!phone.isValid) return
    const numero = phone.value
    let vigente = true
    // Espera antes de preguntar: sin esto se consultaría en cada tecla.
    const t = setTimeout(async () => {
      try {
        const r = await checkClientPhoneAction(numero)
        if (vigente) setRespuesta({ para: numero, ocupado: r.taken, nombre: r.name })
      } catch {
        // Un fallo de red no puede bloquear el alta: `createClientAction` vuelve
        // a comprobarlo al guardar, y esa es la defensa de verdad.
        if (vigente) setRespuesta({ para: numero, ocupado: false, error: true })
      }
    }, 450)
    return () => {
      vigente = false
      clearTimeout(t)
    }
  }, [phone.isValid, phone.value])

  const dup: { estado: "no" | "buscando" | "libre" | "ocupado"; nombre?: string } = !phone.isValid
    ? { estado: "no" }
    : respuesta?.para !== phone.value
      ? { estado: "buscando" }
      : respuesta.error
        ? { estado: "no" }
        : respuesta.ocupado
          ? { estado: "ocupado", nombre: respuesta.nombre }
          : { estado: "libre" }

  // El WhatsApp es obligatorio. `phone.isValid` aplica exactamente la misma
  // regla que el servidor, sobre el número ya canonizado.
  const canContinue = nameOk && phone.isValid && dup.estado !== "ocupado"

  // Descuento por días ya entrenados sin plan (ver used-days-field.tsx).
  const used = useUsedDays(selectedPlan)
  const { totalDays, durationDays } = used

  // Vista previa del plan. ⚠️ El vencimiento lleva `- 1` porque
  // apply_membership_purchase calcula `start_date + duration_days - 1` al crear
  // una membresía NUEVA, que es siempre el caso de un cliente recién dado de
  // alta. No copiar la fórmula de ActivatePlanModal: esa es la de acumulación.
  const startDate = todayInBogota()
  const endDate = selectedPlan ? addDays(startDate, durationDays - 1) : null

  const openModal = () => {
    requestIdRef.current = crypto.randomUUID()
    setOpen(true)
  }

  const reset = () => {
    setStep(1)
    setFullName("")
    phone.reset()
    setEmail("")
    setPlanId("")
    setMedida(PLAN_MEDIDA_INICIAL)
    setMethod("cash")
    used.reset()
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
    if (withPlan && esMedida && (medida.days < 1 || medida.durationDays < 1)) {
      setErrorMsg("El plan a medida necesita días y vigencia")
      setStatus("error")
      return
    }
    setStatus("loading")
    setErrorMsg("")
    setPlanWarning("")

    // Plan a medida "para él": se crea ANTES de dar de alta, para poder cobrar
    // con su id. Si falla, no se crea el cliente — mejor eso que un alta a medias
    // con un cobro que no corresponde al plan pactado.
    let planIdFinal: string | undefined = esMedida ? undefined : selectedPlan?.id
    if (withPlan && esMedida && medida.guardar) {
      const nombre = `${medida.days} días · ${fullName.trim().split(/\s+/)[0] || "cliente"}`
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

    let result: Awaited<ReturnType<typeof createClientAction>>
    try {
      result = await createClientAction({
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.value,
      clientRequestId: requestIdRef.current,
      plan:
        withPlan && selectedPlan
          ? {
              // Sin plan = cobro suelto ("solo esta vez"): la membresía queda
              // sin plan asociado y el catálogo no se ensucia.
              planId: planIdFinal,
              // El precio no se descuenta: el cliente paga el plan completo y este
              // pasa a cubrir los días que ya entrenó. No es una rebaja.
              amountCents: selectedPlan.price_cents,
              method,
              totalDays,
              durationDays,
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
                  <p className="text-xs text-zinc-500">+{phone.dial} {phone.national}</p>
                </div>

                {selectedPlan && !planWarning && (
                  <div className="w-full rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                      Plan actual
                    </p>
                    <p className="mt-1 text-sm font-semibold text-zinc-100">
                      {selectedPlan.name} · {daysPerWeekForPlan(totalDays)} días/semana
                    </p>
                    <dl className="mt-2 space-y-1 text-[11px]">
                      <div className="flex justify-between"><dt className="text-zinc-500">Inicio</dt><dd className="text-zinc-300">{formatDate(startDate)}</dd></div>
                      {endDate && <div className="flex justify-between"><dt className="text-zinc-500">Vence</dt><dd className="text-zinc-300">{formatDate(endDate)}</dd></div>}
                      <div className="flex justify-between"><dt className="text-zinc-500">Días</dt><dd className="text-zinc-300">{totalDays}</dd></div>
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
                    <span className="text-zinc-300">Paso 1 de 2</span> · Datos del cliente
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
                  {/* Obligatorio: identifica al cliente, evita duplicados y es el canal
                      por el que se le hará llegar el enlace para vincular su correo. */}
                  <PhoneField
                    id="nc_phone"
                    dial={phone.dial}
                    onDialChange={phone.setDial}
                    national={phone.national}
                    onInput={phone.handleInput}
                    error={
                      phone.national.length > 0 && !phone.isValid
                        ? `Ese país usa ${phone.largoEsperado} dígitos (llevas ${phone.national.length})`
                        : dup.estado === "ocupado"
                          ? `Ese WhatsApp ya es de ${dup.nombre ?? "otro cliente"}`
                          : undefined
                    }
                    hint={
                      dup.estado === "buscando"
                        ? "Comprobando si ya está registrado..."
                        : dup.estado === "libre"
                          ? "✓ Ese WhatsApp está libre"
                          : "Puedes pegar el número con +indicativo y el país se elige solo."
                    }
                  />

                  {dup.estado === "ocupado" && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 text-[11px] leading-normal text-amber-200">
                      <p>
                        <strong className="text-zinc-100">{dup.nombre ?? "Un cliente"}</strong> ya
                        está registrado con ese número. Si quieres venderle un plan, búscalo en
                        Clientes y usa <strong className="text-zinc-100">Activar plan</strong>.
                      </p>
                      <p className="mt-1 text-amber-400/70">
                        Si de verdad es otra persona, usa su WhatsApp propio.
                      </p>
                    </div>
                  )}
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
                    Sin correo el cliente queda registrado (membresía, ingresos e historial),
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
                    {/* Primero: al dar de alta a alguien es cuando más se pacta
                        una tarifa propia, no una del catálogo. */}
                    <CustomPlanCard
                      seleccionado={esMedida}
                      onSelect={() => setPlanId(ID_PLAN_MEDIDA)}
                      valor={medida}
                      onChange={setMedida}
                      clientName={fullName || "el cliente"}
                    />

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
                            onClick={() => {
                              setPlanId(p.id)
                              // Cambiar a un plan más corto puede dejar el
                              // descuento por encima de su tope.
                              used.clampToPlan(Math.max(0, p.days - 1))
                            }}
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

                {/* Días ya entrenados sin plan. Solo con plan elegido: sin plan
                    no hay tope contra el que validar. */}
                {selectedPlan && (
                  <UsedDaysField
                    planDays={selectedPlan.days}
                    raw={used.raw}
                    onRawChange={used.setRaw}
                    maxUsedDays={used.maxUsedDays}
                    appliedUsed={used.appliedUsed}
                    totalDays={totalDays}
                    endDate={endDate}
                  />
                )}

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
                      {selectedPlan.name} · {daysPerWeekForPlan(totalDays)} días/semana
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      {totalDays} días disponibles · {durationDays} días de vigencia
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
