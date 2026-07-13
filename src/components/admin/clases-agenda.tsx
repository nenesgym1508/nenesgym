import Link from "next/link"
import { Plus, Dumbbell, ChevronRight, CheckCircle2 } from "lucide-react"
import { getDailyClasses, getWeekMuscleBalance, CLASS_OBJECTIVE_LABELS } from "@/services/classes.service"
import { Card } from "@/components/ui/card"
import { ROUTES, adminClaseDetalle } from "@/constants/routes"
import { todayInBogota } from "@/lib/dates"
import { MUSCLE_GROUP_LABELS } from "@/types/exercise"

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

function getMondayDate(today: string): string {
  const d = new Date(today + "T12:00:00")
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]!
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const AGENDA_DAYS = 14

export async function ClasesAgenda() {
  const today = todayInBogota()
  const monday = getMondayDate(today)
  const agendaDates = Array.from({ length: AGENDA_DAYS }, (_, i) => addDays(today, i))

  // Una sola consulta por rango en vez de una por día.
  const [balance, rangeClasses] = await Promise.all([
    getWeekMuscleBalance(monday),
    getDailyClasses({ from: agendaDates[0]!, to: agendaDates[agendaDates.length - 1]! }),
  ])

  const classesByDate = new Map<string, typeof rangeClasses>()
  for (const cls of rangeClasses) {
    if (cls.status === "archived") continue
    const list = classesByDate.get(cls.class_date) ?? []
    list.push(cls)
    classesByDate.set(cls.class_date, list)
  }

  const agenda = agendaDates.map((date) => ({ date, classes: classesByDate.get(date) ?? [] }))

  const maxCount = balance.items[0]?.count ?? 0
  const balanceRows = balance.items.map((it) => {
    const ratio = maxCount > 0 ? it.count / maxCount : 0
    const level = ratio >= 0.66 ? "Alto" : ratio >= 0.33 ? "Medio" : "Bajo"
    return { ...it, level }
  })
  const topGroup = balanceRows[0]
  const lowGroup = [...balanceRows].reverse().find((r) => r.level === "Bajo")
  const balanceMessage =
    balance.classCount < 2 || balanceRows.length === 0
      ? "Aún no hay suficientes clases para calcular balance."
      : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={ROUTES.ADMIN_CLASES_EJERCICIOS}
          className="flex items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
        >
          <Dumbbell className="size-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Ejercicios</span>
        </Link>
        <Link
          href={`${ROUTES.ADMIN_CLASES_NUEVA}?date=${today}`}
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="size-4" />
          Añadir rutina
        </Link>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
          Próximos {AGENDA_DAYS} días
        </p>
        <Card className="p-0 overflow-hidden">
          {agenda.map(({ date, classes }, i) => {
            const dayDate = new Date(date + "T12:00:00")
            const dayName = DAY_NAMES[dayDate.getDay()] ?? ""
            const dayNum = dayDate.getDate()
            const isToday = date === today
            return (
              <div
                key={date}
                className={`flex items-start gap-3 px-4 py-3 ${i < agenda.length - 1 ? "border-b border-white/5" : ""}`}
              >
                <div className={`flex flex-col items-center w-8 shrink-0 pt-0.5 ${isToday ? "text-red-400" : "text-zinc-500"}`}>
                  <span className="text-[10px] font-medium">{isToday ? "Hoy" : dayName}</span>
                  <span className="text-sm font-bold leading-none">{dayNum}</span>
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  {classes.length === 0 ? (
                    <p className="text-sm text-zinc-600 py-1">Sin rutina programada</p>
                  ) : (
                    classes.map((cls) => (
                      <Link
                        key={cls.id}
                        href={adminClaseDetalle(cls.id)}
                        className="flex items-center gap-2 rounded-lg -mx-1 px-1 py-1 hover:bg-zinc-800/50 transition-colors"
                      >
                        <CheckCircle2 className="size-3.5 text-green-500/60 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{cls.title}</p>
                          <p className="text-[11px] text-zinc-500">
                            {cls.objective ? CLASS_OBJECTIVE_LABELS[cls.objective] : ""}
                            {cls.estimated_duration_minutes ? ` · ${cls.estimated_duration_minutes} min` : ""}
                          </p>
                        </div>
                        <ChevronRight className="size-3.5 text-zinc-700 shrink-0 ml-auto" />
                      </Link>
                    ))
                  )}
                </div>

                <Link
                  href={`${ROUTES.ADMIN_CLASES_NUEVA}?date=${date}`}
                  aria-label="Añadir rutina este día"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  <Plus className="size-4" />
                </Link>
              </div>
            )
          })}
        </Card>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Balance semanal</p>
        <Card className="p-3">
          {balanceMessage ? (
            <p className="text-xs text-zinc-500 text-center py-1">{balanceMessage}</p>
          ) : (
            <>
              <div className="space-y-1">
                {balanceRows.slice(0, 4).map((r) => (
                  <div key={r.group} className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">{MUSCLE_GROUP_LABELS[r.group]}</span>
                    <span
                      className={`text-[11px] font-semibold ${
                        r.level === "Alto" ? "text-green-400" : r.level === "Medio" ? "text-yellow-400" : "text-zinc-500"
                      }`}
                    >
                      {r.level}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t border-white/5 pt-2 space-y-0.5">
                {topGroup && (
                  <p className="text-[11px] text-zinc-500">
                    Esta semana has trabajado bastante {MUSCLE_GROUP_LABELS[topGroup.group].toLowerCase()}.
                  </p>
                )}
                {lowGroup && lowGroup.group !== topGroup?.group && (
                  <p className="text-[11px] text-zinc-500">
                    {MUSCLE_GROUP_LABELS[lowGroup.group]} aparece poco esta semana.
                  </p>
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
