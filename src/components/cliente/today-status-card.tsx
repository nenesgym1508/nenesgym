"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronRight, Clock, Hourglass, AlertTriangle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { formatDatetime } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"
import { SuccessToast } from "@/components/ui/success-toast"
import { clientCheckInAction } from "@/actions/client.actions"

interface PaymentAlert {
  status: "pending" | "rejected"
}

interface TodayStatusCardProps {
  trainedToday: boolean
  sessionsToday?: number
  lastCheckInAt?: string | null
  paymentAlert?: PaymentAlert | null
  showRegisterCta?: boolean
  hasActivePlan?: boolean
}

export function TodayStatusCard({
  trainedToday,
  sessionsToday = 0,
  lastCheckInAt,
  paymentAlert,
  showRegisterCta = false,
  hasActivePlan = true,
}: TodayStatusCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ title: string; subtitle: string; message: string } | null>(null)

  async function handleCheckIn() {
    setLoading(true)
    setErrorMsg(null)
    setConfirmOpen(false)

    const result = await clientCheckInAction()
    setLoading(false)

    if (result.error) {
      setErrorMsg(result.error)
    } else if (result.success) {
      const now = new Date()
      const timeStr = format(now, "h:mm a", { locale: es })
      const dateStr = format(now, "d MMM yyyy", { locale: es })
      const remainingDays = result.remainingDays
      const daysText = remainingDays !== undefined ? ` · Te quedan ${remainingDays} días` : ""

      setSuccessData({
        title: "¡Entrada registrada!",
        subtitle: `${dateStr} · ${timeStr}`,
        message: `Buen entrenamiento 💪${daysText}`,
      })
      router.refresh()
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border shadow-[0_4px_25px_rgba(0,0,0,0.65)] ${
        showRegisterCta && hasActivePlan ? "pt-4" : ""
      } ${
        trainedToday && hasActivePlan
          ? "border-green-700/40 bg-gradient-to-b from-green-900/20 via-zinc-900/50 to-zinc-950/90"
          : "border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90"
      }`}
    >
      {successData && (
        <SuccessToast
          open={!!successData}
          title={successData.title}
          subtitle={successData.subtitle}
          message={successData.message}
          onClose={() => setSuccessData(null)}
        />
      )}

      {/* Registrar entrada — convertido de enlace a botón de acción con confirmación (solo si tiene plan activo) */}
      {showRegisterCta && hasActivePlan && (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading}
          className="w-full text-left block -mt-[4%] -mb-[6%] animate-btn-heartbeat cursor-pointer outline-none focus:outline-none border-none bg-transparent p-0 disabled:opacity-50"
        >
          <Image
            src="/btn-registrar.webp"
            alt="Registrar entrada"
            width={2172}
            height={724}
            className="w-full h-auto"
            priority
          />
        </button>
      )}

      {/* Vista condicional según si el plan está activo o no */}
      {hasActivePlan ? (
        /* Estado de ingreso del día */
        <Link href={ROUTES.CLIENTE_ASISTENCIA} className="block">
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="shrink-0">
              {trainedToday ? (
                <div className="flex size-11 items-center justify-center rounded-full border border-green-500/40 bg-zinc-950 shadow-[0_0_10px_rgba(34,197,94,0.15)]">
                  <CheckCircle2 className="size-5 text-green-400" />
                </div>
              ) : (
                <div className="flex size-11 items-center justify-center rounded-full border border-red-500/40 bg-zinc-950 shadow-[0_0_10px_rgba(220,38,38,0.15)]">
                  <Clock className="size-5 text-red-500" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bebas text-lg tracking-wide uppercase text-white">
                {trainedToday ? "Entrenaste hoy" : "Aún no registras tu ingreso"}
                {trainedToday && sessionsToday > 0 && (
                  <span className="font-sans text-xs font-normal normal-case tracking-normal text-zinc-500"> · {sessionsToday} de 2 ingresos</span>
                )}
              </p>
              {trainedToday && lastCheckInAt ? (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="size-3 shrink-0" />
                  Último ingreso: {formatDatetime(lastCheckInAt)}
                </p>
              ) : !trainedToday ? (
                <p className="mt-0.5 text-xs text-zinc-500">Te esperamos.</p>
              ) : null}
            </div>
            <ChevronRight className="size-4 shrink-0 text-zinc-500" />
          </div>
        </Link>
      ) : (
        /* Mensaje de plan inactivo con botón para dirigir a pagos */
        <div className="flex items-center justify-between gap-4 p-4 text-left">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <AlertTriangle className="size-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bebas text-base tracking-wide uppercase text-white">No tienes un plan activo</p>
              <p className="text-xs text-zinc-500 leading-tight">
                Activa o renueva tu membresía para poder registrar tus ingresos.
              </p>
            </div>
          </div>
          <Link
            href={ROUTES.CLIENTE_PAGOS}
            className="btn-glossy-red shrink-0 inline-flex items-center justify-center gap-2 rounded-xl h-10 px-5 text-sm font-bold text-white cursor-pointer"
          >
            Ver planes
          </Link>
        </div>
      )}

      {/* Alerta de pago — fusionada en la misma card */}
      {paymentAlert && (
        <Link href={ROUTES.CLIENTE_PAGOS} className="block">
          <div className={`flex items-center gap-2 border-t px-5 py-2.5 text-xs ${
            paymentAlert.status === "pending"
              ? "border-yellow-600/20 bg-yellow-500/8 text-yellow-400"
              : "border-red-600/20 bg-red-500/8 text-red-400"
          }`}>
            {paymentAlert.status === "pending"
              ? <Hourglass className="size-3.5 shrink-0" />
              : <AlertTriangle className="size-3.5 shrink-0" />}
            <span className="flex-1 font-medium">
              {paymentAlert.status === "pending"
                ? "Pago pendiente de aprobación"
                : "Pago rechazado — toca para ver el detalle"}
            </span>
            <ChevronRight className="size-3.5 shrink-0 opacity-50" />
          </div>
        </Link>
      )}

      {/* Modal de Confirmación Directo */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4 text-left"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-3">
              <h3 className="text-xl font-bold text-zinc-100 uppercase font-bebas tracking-wide">Confirmar ingreso</h3>
              <p className="text-sm text-zinc-400">
                ¿Confirmas que estás ingresando al gimnasio en este momento?
              </p>
              
              {/* Vista precisa de fecha y hora */}
              <div className="rounded-xl bg-zinc-950/80 border border-white/5 p-3.5 space-y-1">
                <p className="text-xs font-semibold text-red-500 uppercase tracking-wider">Fecha y hora de registro</p>
                <p className="text-sm font-medium text-zinc-200 capitalize">
                  {format(new Date(), "eeee, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
                <p className="text-base font-bold text-white tracking-wide">
                  {format(new Date(), "h:mm a", { locale: es })}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-400 text-center">
                {errorMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
                className="flex-1 h-11 rounded-lg border border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={loading}
                className="flex-1 h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Sí, ingresar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
