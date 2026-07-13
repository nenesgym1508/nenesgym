import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientProgress, getActiveGoal } from "@/services/progress.service"
import { getMonthlyAttendance } from "@/services/attendance.service"
import { PageHeader } from "@/components/layout/page-header"
import { ProgressForm } from "@/components/cliente/progress-form"
import { ProgressHistory } from "@/components/cliente/progress-history"
import { GoalCard } from "@/components/cliente/progress-goal-card"
import { ROUTES } from "@/constants/routes"
import { nowInBogota, todayInBogota } from "@/lib/dates"
import { getBmiCategory } from "@/lib/utils"
import { BMI_CATEGORIES } from "@/constants/plans"
import {
  type ProgressRecord,
  type ProgressMetricKey,
  GOAL_HIGHLIGHT_METRICS,
  DEFAULT_HIGHLIGHT_METRICS,
  BODY_METRIC_LABELS,
  BODY_METRIC_COLUMN,
  BODY_METRIC_UNIT,
  type BodyMetricKey,
} from "@/types/progress"

export const dynamic = "force-dynamic"

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

// Última medida no-nula de una columna + su variación contra la anterior no-nula.
function latestMetric(
  records: ProgressRecord[],
  col: keyof ProgressRecord
): { value: number; delta: number | null } | null {
  const vals = records.filter((r) => r[col] != null)
  if (vals.length === 0) return null
  const value = vals[0]![col] as number
  const prev = vals[1] ? (vals[1]![col] as number) : null
  return { value, delta: prev != null ? +(value - prev).toFixed(1) : null }
}

const BODY_KEYS: ProgressMetricKey[] = ["weight", "waist", "chest", "arm", "leg"]

export default async function ClienteProgresoPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  const now = nowInBogota()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const today = todayInBogota()

  const [records, goal, monthlyAttendance] = await Promise.all([
    client ? getClientProgress(client.id, 100) : Promise.resolve([] as ProgressRecord[]),
    client ? getActiveGoal(client.id) : Promise.resolve(null),
    client ? getMonthlyAttendance(client.id, year, month) : Promise.resolve([]),
  ])

  const todayRecord = records.find((r) => (r as ProgressRecord).measured_date === today) ?? null
  const attendanceDates = new Set(monthlyAttendance.map((a) => a.check_in_date))
  const monthlyCount = attendanceDates.size
  const latest = records[0] ?? null

  // Racha (días seguidos) y últimos 7 días
  const last7 = Array.from({ length: 7 }, (_, i) => shiftDate(today, -i)).filter((d) =>
    attendanceDates.has(d)
  ).length
  let streak = 0
  let i = attendanceDates.has(today) ? 0 : 1
  while (attendanceDates.has(shiftDate(today, -i))) {
    streak++
    i++
  }

  const bmiCategory = latest?.bmi != null ? getBmiCategory(latest.bmi) : null
  const bmiInfo = bmiCategory ? BMI_CATEGORIES[bmiCategory] : null

  const daysSinceLast = latest && !todayRecord
    ? Math.floor(
        (new Date().getTime() - new Date(latest.measured_date ?? latest.recorded_at).getTime()) /
          86400000
      )
    : null

  // Métricas priorizadas por objetivo — solo se muestran las que tienen dato real.
  const highlightKeys = goal ? GOAL_HIGHLIGHT_METRICS[goal.goal_type] : DEFAULT_HIGHLIGHT_METRICS

  type Card = { key: string; label: string; value: string; unit: string; delta: number | null; sub?: string }
  const cards: Card[] = []
  for (const key of highlightKeys) {
    if (BODY_KEYS.includes(key)) {
      const bk = key as BodyMetricKey
      const m = latestMetric(records, BODY_METRIC_COLUMN[bk])
      if (!m) continue // sin dato → no se muestra la tarjeta
      cards.push({
        key,
        label: BODY_METRIC_LABELS[bk],
        value: String(m.value),
        unit: BODY_METRIC_UNIT[bk],
        delta: m.delta,
      })
    } else if (key === "consistency") {
      cards.push({ key, label: "Este mes", value: String(monthlyCount), unit: "días", delta: null, sub: "entrenados" })
    } else if (key === "streak") {
      cards.push({ key, label: "Racha", value: String(streak), unit: "días", delta: null, sub: "seguidos" })
    } else if (key === "last7") {
      cards.push({ key, label: "Últimos 7 días", value: String(last7), unit: "días", delta: null })
    } else if (key === "measurements") {
      cards.push({ key, label: "Mediciones", value: String(records.length), unit: "", delta: null, sub: "registradas" })
    }
  }

  return (
    <div>
      <PageHeader title="Mi progreso" />
      <div className="p-4 md:px-10 md:py-8 space-y-4">

        {/* CTA */}
        <ProgressForm todayRecord={todayRecord} latestHeightCm={latest?.height_cm} />

        {/* Objetivo */}
        <GoalCard goal={goal} />

        {records.length > 0 && (
          <>
            {/* Métricas priorizadas por objetivo */}
            {cards.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {cards.map((c) => (
                  <div key={c.key} className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-3.5 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">
                      {c.label}
                    </p>
                    <div className="flex items-end gap-1 leading-none">
                      <span className="font-bebas text-3xl tracking-wide text-white">{c.value}</span>
                      {c.unit && <span className="mb-0.5 text-[11px] text-zinc-500">{c.unit}</span>}
                    </div>
                    {c.delta != null && c.delta !== 0 ? (
                      <p className="mt-1 text-[11px] font-medium text-zinc-400">
                        {c.delta > 0 ? "+" : ""}
                        {c.delta} {c.unit} desde la anterior
                      </p>
                    ) : c.sub ? (
                      <p className="mt-1 text-[11px] text-zinc-600">{c.sub}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* IMC — dato secundario */}
            {bmiInfo && latest?.bmi != null && (
              <div className="flex items-center gap-3 rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 px-4 py-2.5">
                <span className="text-xs text-zinc-500">IMC</span>
                <span className="text-sm font-bold text-zinc-200">{latest.bmi.toFixed(1)}</span>
                <span className={`text-xs font-semibold ml-auto ${bmiInfo.color}`}>
                  {bmiInfo.label}
                </span>
              </div>
            )}

            {/* Mensajes de seguimiento (lenguaje neutral) */}
            {daysSinceLast !== null && daysSinceLast > 0 && (
              <p className="text-[11px] text-zinc-600 text-center">
                Tu última medición fue hace{" "}
                <span className="text-zinc-400 font-medium">
                  {daysSinceLast} {daysSinceLast === 1 ? "día" : "días"}
                </span>
                . Registra hoy para ver tu avance.
              </p>
            )}
            {records.length >= 3 && (
              <p className="text-[11px] text-zinc-600 text-center">
                Llevas{" "}
                <span className="text-zinc-400 font-medium">{records.length} mediciones</span>{" "}
                registradas. Sigue así.
              </p>
            )}
          </>
        )}

        {/* Gráfica e historial */}
        <ProgressHistory records={records} />
      </div>
    </div>
  )
}
