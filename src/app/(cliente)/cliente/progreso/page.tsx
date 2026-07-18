import { redirect } from "next/navigation"
import { Scale, Dumbbell, Flame, Ruler } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientProgress, getActiveGoal } from "@/services/progress.service"
import { getMonthlyAttendance } from "@/services/attendance.service"
import { ProgressForm } from "@/components/cliente/progress-form"
import { ProgressHistory } from "@/components/cliente/progress-history"
import { GoalCard } from "@/components/cliente/progress-goal-card"
import { Card } from "@/components/ui/card"
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

const BODY_KEYS: BodyMetricKey[] = ["weight", "waist", "chest", "arm", "leg"]

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

  // Racha (días seguidos)
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

  // Métricas priorizadas por objetivo
  const highlightKeys = goal ? GOAL_HIGHLIGHT_METRICS[goal.goal_type] : DEFAULT_HIGHLIGHT_METRICS

  // 1. Peso (Weight)
  const latestWeightRec = records.find((r) => r.weight_kg != null)
  const latestWeight = latestWeightRec?.weight_kg ?? null
  const prevWeightRec = records.filter((r) => r.weight_kg != null)[1] ?? null
  const prevWeight = prevWeightRec?.weight_kg ?? null
  const weightDiff = latestWeight != null && prevWeight != null
    ? +(latestWeight - prevWeight).toFixed(1)
    : null

  // 2. Métrica física priorizada según el objetivo (excluyendo peso)
  const prioritizedBodyKey = (highlightKeys.find((k) => k !== "weight" && BODY_KEYS.includes(k as any)) as BodyMetricKey) || "arm"
  const bodyLabel = BODY_METRIC_LABELS[prioritizedBodyKey]
  const bodyUnit = BODY_METRIC_UNIT[prioritizedBodyKey]
  const bodyCol = BODY_METRIC_COLUMN[prioritizedBodyKey]
  
  const latestBodyRec = records.find((r) => r[bodyCol] != null)
  const latestBodyValue = latestBodyRec ? (latestBodyRec[bodyCol] as number) : null
  const prevBodyRec = records.filter((r) => r[bodyCol] != null)[1] ?? null
  const prevBodyValue = prevBodyRec ? (prevBodyRec[bodyCol] as number) : null
  const bodyDiff = latestBodyValue != null && prevBodyValue != null
    ? +(latestBodyValue - prevBodyValue).toFixed(1)
    : null

  const BodyIcon = prioritizedBodyKey === "waist" ? Ruler : Dumbbell

  return (
    <div>
      {/* Cabecera unificada estilo mockup */}
      <div className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Mi progreso</h1>
          <p className="text-zinc-500 text-sm">Tu constancia, tu transformación.</p>
        </div>
        <ProgressForm todayRecord={todayRecord} latestHeightCm={latest?.height_cm} />
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-6">
        {/* Objetivo */}
        <GoalCard goal={goal} />

        {records.length > 0 && (
          <>
            {/* ── RESUMEN ACTUAL (Cuadrícula 2x2 estilo mockup) ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-2 border-red-600 pl-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Resumen actual</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Card 1: Peso */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-lg">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
                    <Scale className="size-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 leading-none mb-1">Peso</p>
                    <div className="flex items-baseline gap-0.5 leading-none">
                      <span className="font-bebas text-3xl tracking-wide text-white">{latestWeight ?? "—"}</span>
                      {latestWeight != null && <span className="text-[10px] text-zinc-500">{BODY_METRIC_UNIT["weight"]}</span>}
                    </div>
                    {weightDiff !== null && weightDiff !== 0 ? (
                      <p className="mt-1 text-[9px] font-semibold text-red-500 flex items-center gap-0.5 leading-none truncate">
                        {weightDiff > 0 ? "↗" : "↘"} {weightDiff > 0 ? "+" : ""}{weightDiff} kg <span className="text-zinc-500 font-normal normal-case">desde la anterior</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[9px] text-zinc-500 leading-none">Sin cambios</p>
                    )}
                  </div>
                </div>

                {/* Card 2: Métrica priorizada (Brazo, Pecho, Cintura, etc.) */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-lg">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
                    <BodyIcon className="size-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 leading-none mb-1">{bodyLabel}</p>
                    <div className="flex items-baseline gap-0.5 leading-none">
                      <span className="font-bebas text-3xl tracking-wide text-white">{latestBodyValue ?? "—"}</span>
                      {latestBodyValue != null && <span className="text-[10px] text-zinc-500">{bodyUnit}</span>}
                    </div>
                    {bodyDiff !== null && bodyDiff !== 0 ? (
                      <p className="mt-1 text-[9px] font-semibold text-red-500 flex items-center gap-0.5 leading-none truncate">
                        {bodyDiff > 0 ? "↗" : "↘"} {bodyDiff > 0 ? "+" : ""}{bodyDiff} {bodyUnit} <span className="text-zinc-500 font-normal normal-case">desde la anterior</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[9px] text-zinc-500 leading-none">Sin cambios</p>
                    )}
                  </div>
                </div>

                {/* Card 3: IMC */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-lg">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
                    <span className="text-[11px] font-black text-red-500">IMC</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 leading-none mb-1">IMC</p>
                    <div className="flex items-baseline gap-0.5 leading-none">
                      <span className="font-bebas text-3xl tracking-wide text-white">
                        {latest?.bmi != null ? latest.bmi.toFixed(1) : "—"}
                      </span>
                    </div>
                    {bmiInfo ? (
                      <p className={`mt-1 text-[9px] font-bold uppercase leading-none truncate ${bmiInfo.color}`}>
                        {bmiInfo.label} <span className="text-zinc-500 font-normal normal-case block mt-0.5">Categoría actual</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-[9px] text-zinc-500 leading-none">Sin datos</p>
                    )}
                  </div>
                </div>

                {/* Card 4: Actividad (Este mes / Racha) */}
                <div className="flex items-center gap-3.5 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-lg">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
                    <Flame className="size-5 text-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 leading-none mb-1.5">Actividad</p>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="text-[8px] text-zinc-500 font-medium uppercase tracking-wide">Este mes</p>
                        <p className="font-bebas text-xl text-white tracking-wide leading-none my-0.5">{monthlyCount}</p>
                        <p className="text-[7.5px] text-zinc-500 leading-none whitespace-nowrap">días entr.</p>
                      </div>
                      <div className="h-6 w-px bg-white/10 shrink-0 self-center" />
                      <div>
                        <p className="text-[8px] text-zinc-500 font-medium uppercase tracking-wide">Racha</p>
                        <p className="font-bebas text-xl text-white tracking-wide leading-none my-0.5">{streak}</p>
                        <p className="text-[8px] text-zinc-500 leading-none">días</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ESTADO CORPORAL (IMC Slider Visual estilo mockup) ── */}
            {latest?.bmi != null && bmiInfo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-l-2 border-red-600 pl-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Estado corporal</h3>
                </div>
                
                <Card className="border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)] space-y-5">
                  <div className="flex items-center gap-6">
                    {/* IMC actual (grande, izquierda) */}
                    <div className="shrink-0 pr-6 border-r border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">IMC Actual</p>
                      <p className="font-bebas text-5xl font-bold text-red-500 tracking-wide leading-none">{latest.bmi.toFixed(1)}</p>
                    </div>
                    
                    {/* Categoría y consejo (derecha) */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-lg font-bold tracking-wide uppercase leading-tight ${bmiInfo.color}`}>
                        {bmiInfo.label} ({latest.bmi.toFixed(1)})
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Tu progreso depende de tu constancia y fuerza.
                      </p>
                    </div>
                  </div>
                  
                  {/* Barra de progreso deslizante */}
                  <div className="space-y-2">
                    <div className="relative h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(to right, #3b82f6 0%, #22c55e 30%, #eab308 60%, #ef4444 100%)",
                        }}
                      />
                      <div
                        className="absolute top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-full bg-white shadow-lg border border-black/20"
                        style={{
                          left: `${Math.min(Math.max(((latest.bmi - 15) / 25) * 100, 2), 97)}%`,
                        }}
                      />
                    </div>
                    {/* Valores numéricos de escala */}
                    <div className="flex justify-between text-[10px] font-semibold text-zinc-600 px-1 leading-none">
                      <span>15</span>
                      <span className="text-blue-400">18.5</span>
                      <span className="text-green-400">25</span>
                      <span className="text-yellow-400">30</span>
                      <span className="text-red-400">40</span>
                    </div>
                    {/* Categorías textuales alineadas */}
                    <div className="flex justify-between text-[9px] font-bold text-zinc-500 uppercase tracking-wider px-1 pt-0.5 leading-none">
                      <span>Bajo peso</span>
                      <span>Normal</span>
                      <span>Sobrepeso</span>
                      <span>Obesidad</span>
                    </div>
                  </div>
                </Card>
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
          </>
        )}

        {/* Gráfica e historial (Evolución e Historial) */}
        <ProgressHistory records={records} />
      </div>
    </div>
  )
}
