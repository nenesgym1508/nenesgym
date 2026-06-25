import { CheckCircle2, ChevronRight, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { formatDatetime } from "@/lib/dates"

interface TodayStatusCardProps {
  trainedToday: boolean
  sessionsToday?: number
  lastCheckInAt?: string | null
}

export function TodayStatusCard({
  trainedToday,
  sessionsToday = 0,
  lastCheckInAt,
}: TodayStatusCardProps) {
  return (
    <Card className={trainedToday ? "border-green-700/30 bg-green-500/5" : ""}>
      <div className="flex items-center gap-3">
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
    </Card>
  )
}
