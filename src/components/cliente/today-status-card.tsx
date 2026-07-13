import Link from "next/link"
import Image from "next/image"
import { CheckCircle2, ChevronRight, Clock, Hourglass, AlertTriangle } from "lucide-react"
import { formatDatetime } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

interface PaymentAlert {
  status: "pending" | "rejected"
}

interface TodayStatusCardProps {
  trainedToday: boolean
  sessionsToday?: number
  lastCheckInAt?: string | null
  paymentAlert?: PaymentAlert | null
  showRegisterCta?: boolean
}

export function TodayStatusCard({
  trainedToday,
  sessionsToday = 0,
  lastCheckInAt,
  paymentAlert,
  showRegisterCta = false,
}: TodayStatusCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border shadow-[0_4px_25px_rgba(0,0,0,0.65)] ${
        showRegisterCta ? "pt-4" : ""
      } ${
        trainedToday
          ? "border-green-700/40 bg-gradient-to-b from-green-900/20 via-zinc-900/50 to-zinc-950/90"
          : "border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90"
      }`}
    >
      {/* Registrar entrada — fusionado en la misma card */}
      {showRegisterCta && (
        <Link
          href={ROUTES.CLIENTE_ASISTENCIA}
          className="block -mt-[4%] -mb-[6%] animate-btn-heartbeat"
        >
          <Image
            src="/btn-registrar.webp"
            alt="Registrar entrada"
            width={2172}
            height={724}
            className="w-full h-auto"
            priority
          />
        </Link>
      )}

      {/* Estado de ingreso del día */}
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
    </div>
  )
}
