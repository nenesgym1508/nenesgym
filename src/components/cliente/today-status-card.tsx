import Link from "next/link"
import { CheckCircle2, ChevronRight, Clock, Hourglass, AlertTriangle } from "lucide-react"
import { Card } from "@/components/ui/card"
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
}

export function TodayStatusCard({
  trainedToday,
  sessionsToday = 0,
  lastCheckInAt,
  paymentAlert,
}: TodayStatusCardProps) {
  return (
    <Card className={`overflow-hidden p-0 ${trainedToday ? "border-green-700/30 bg-green-500/5" : ""}`}>
      {/* Estado de ingreso del día */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="shrink-0">
          {trainedToday ? (
            <div className="flex size-10 items-center justify-center rounded-xl bg-green-500/15">
              <CheckCircle2 className="size-5 text-green-400" />
            </div>
          ) : (
            <div className="size-10 rounded-full border-[3px] border-red-500/40" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-100">
            {trainedToday ? "Entrenaste hoy" : "Aún no registras tu ingreso de hoy."}
            {trainedToday && sessionsToday > 0 && (
              <span className="font-normal text-zinc-500"> · {sessionsToday} de 2 ingresos</span>
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
        <ChevronRight className="size-4 shrink-0 text-zinc-600" />
      </div>

      {/* Alerta de pago — fusionada en la misma card */}
      {paymentAlert && (
        <Link href={ROUTES.CLIENTE_PAGOS} className="block">
          <div className={`flex items-center gap-2 border-t px-4 py-2.5 text-xs ${
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
    </Card>
  )
}
