import { redirect } from "next/navigation"
import { Flame, Calendar, ChevronRight } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientProgress, getActiveGoal } from "@/services/progress.service"
import { getMonthlyAttendance } from "@/services/attendance.service"
import { ProgressForm } from "@/components/cliente/progress-form"
import { ProgressHistory } from "@/components/cliente/progress-history"
import { GoalCard } from "@/components/cliente/progress-goal-card"
import { Card } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { nowInBogota, todayInBogota } from "@/lib/dates"
import { getBmiCategory, getChangeMeaning } from "@/lib/utils"
import { BMI_CATEGORIES } from "@/constants/plans"
import { type ProgressRecord } from "@/types/progress"

export const dynamic = "force-dynamic"

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

// Iconos customizados vectoriales en SVG para las métricas corporales
const WeightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="12" cy="13" r="3" />
    <path d="M12 9v1" />
  </svg>
)

const ArmIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 14c-1.5-1-2.5-2.5-2.5-4.5 0-3.5 3-5 5.5-3 1.5 1.2 2 2.5 3.5 2.5 2 0 3-1.5 4.5-1.5 2 0 3.5 1.5 3.5 3.5 0 3-3 6.5-6 8-2.5 1.2-5.5 0-7-2.5" />
    <path d="M10.5 9.5c1 1.5 2.5 2 4.5 1" />
  </svg>
)

const WaistIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4c2 3 3 5 3 8 0 4-1 6-3 8" />
    <path d="M20 4c-2 3-3 5-3 8 0 4 1 6 3 8" />
    <path d="M7 12h10" />
    <path d="M10 12v-2" />
    <path d="M14 12v-2" />
  </svg>
)

const LegIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h5v9c0 2.5 1.5 4.5 1.5 6.5v2.5M18 3h-5v9c0 2.5-1.5 4.5-1.5 6.5v2.5" />
  </svg>
)

const ChestIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5c3 1 5 1 9 0 4 1 6 1 9 0v3c0 4-3 7-9 7s-9-3-9-7V5z" />
    <path d="M6 9c2 1 4 2 6 0 2 2 4 1 6 0" />
    <path d="M12 9v5" />
  </svg>
)

const HeightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="20" rx="2" />
    <line x1="12" y1="6" x2="16" y2="6" />
    <line x1="12" y1="10" x2="16" y2="10" />
    <line x1="12" y1="14" x2="16" y2="14" />
    <line x1="12" y1="18" x2="16" y2="18" />
  </svg>
)

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

  // Helper para obtener datos y deltas
  const getMetricData = (col: keyof ProgressRecord, unit: string) => {
    const latestRec = records.find((r) => r[col] != null)
    const val = latestRec ? (latestRec[col] as number) : null
    const prevRec = records.filter((r) => r[col] != null)[1] ?? null
    const prevVal = prevRec ? (prevRec[col] as number) : null
    const diff = val != null && prevVal != null ? +(val - prevVal).toFixed(1) : null
    return { val, diff, unit }
  }

  const pesoData = getMetricData("weight_kg", "kg")
  const brazoData = getMetricData("arm_cm", "cm")
  const cinturaData = getMetricData("waist_cm", "cm")
  const piernaData = getMetricData("leg_cm", "cm")
  const pechoData = getMetricData("chest_cm", "cm")
  const alturaData = getMetricData("height_cm", "cm")

  // Filtramos las métricas de forma que solo se muestren las que han sido registradas por el usuario
  const metricsList = [
    { key: "weight", label: "Peso", data: pesoData, Icon: WeightIcon },
    { key: "arm", label: "Brazo", data: brazoData, Icon: ArmIcon },
    { key: "waist", label: "Cintura", data: cinturaData, Icon: WaistIcon },
    { key: "leg", label: "Pierna", data: piernaData, Icon: LegIcon },
    { key: "chest", label: "Pecho", data: pechoData, Icon: ChestIcon },
    { key: "height", label: "Altura", data: alturaData, Icon: HeightIcon },
  ].filter((m) => m.data.val !== null)

  return (
    <div>
      {/* Cabecera unificada estilo mockup */}
      <div className="mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Mi progreso</h1>
        <p className="text-zinc-500 text-sm">Tu constancia, tu transformación.</p>
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-6">
        {/* Objetivo */}
        <GoalCard goal={goal} />

        {/* CTA (Botón registrar de ancho completo abajo del objetivo) */}
        <ProgressForm todayRecord={todayRecord} latestHeightCm={latest?.height_cm} />

        {records.length > 0 && (
          <>
            {/* ── RESUMEN ACTUAL (Lista vertical elegante adaptativa con Flexbox robusto) ── */}
            {metricsList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-l-2 border-red-600 pl-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Resumen actual</h3>
                  <span className="text-[10px] text-zinc-500 italic">vs. medición anterior</span>
                </div>
                
                <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)] divide-y divide-white/5">
                  {metricsList.map(({ key, label, data, Icon }) => {
                    const { val, diff, unit } = data
                    const meaning = getChangeMeaning(goal?.goal_type, key, diff)
                    const deltaColor =
                      meaning === "positive" ? "text-green-500" :
                      meaning === "negative" ? "text-red-500" :
                      "text-zinc-500 font-semibold"
                    return (
                      <div key={label} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                        {/* Izquierda: Icono y Nombre */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5 text-red-500">
                            <Icon className="size-5" />
                          </div>
                          <span className="text-sm font-semibold text-zinc-200 truncate">{label}</span>
                        </div>
                        
                        {/* Derecha: Valor, Delta y Chevron */}
                        <div className="flex items-center gap-3 shrink-0">
                          {/* Cifra */}
                          <div className="flex items-baseline gap-0.5">
                            <span className="font-bebas text-2xl tracking-wide text-white">{val}</span>
                            <span className="text-[10px] text-zinc-500 lowercase">{unit}</span>
                          </div>
                          
                          {/* Divisor vertical sutil */}
                          <div className="h-3.5 w-px bg-white/10" />
                          
                          {/* Delta de cambio */}
                          <div className="min-w-[68px] text-right">
                            {diff !== null && diff !== 0 ? (
                              <span className={`text-[11px] font-bold ${deltaColor}`}>
                                {diff > 0 ? "↑" : "↓"} {Math.abs(diff)} {unit}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-zinc-500">
                                — sin cambio
                              </span>
                            )}
                          </div>
                          
                          {/* Chevron */}
                          <ChevronRight className="size-4 text-zinc-600" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── ÍNDICE DE MASA CORPORAL (IMC Slider Visual estilo mockup) ── */}
            {latest?.bmi != null && bmiInfo && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-l-2 border-red-600 pl-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Índice de masa corporal</h3>
                </div>
                
                <Card className="border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)] space-y-5">
                  <div className="flex items-center gap-3 sm:gap-6">
                    {/* IMC actual (grande, izquierda) */}
                    <div className="shrink-0 pr-4 sm:pr-6 border-r border-white/5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">IMC Actual</p>
                      <p className="font-bebas text-4xl sm:text-5xl font-bold text-red-500 tracking-wide leading-none">{latest.bmi.toFixed(1)}</p>
                    </div>
                    
                    {/* Categoría y consejo (derecha) */}
                    <div className="min-w-0 flex-1 pl-1">
                      <p className={`text-base sm:text-lg font-bold tracking-wide uppercase leading-tight ${bmiInfo.color}`}>
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

            {/* ── ACTIVIDAD (Barra horizontal estilo mockup) ── */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-l-2 border-red-600 pl-3.5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Actividad</h3>
              </div>
              
              <div className="flex items-center gap-4 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-lg">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
                  <Flame className="size-5 text-red-500" />
                </div>
                <div className="flex-1 flex items-center justify-around gap-2 text-xs md:text-sm min-w-0">
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Este mes</p>
                    <p className="font-bold text-white mt-0.5 text-xs sm:text-sm">
                      {monthlyCount} {monthlyCount === 1 ? "día entrenado" : "días entrenados"}
                    </p>
                  </div>
                  
                  <div className="h-6 w-px bg-white/10 shrink-0" />
                  
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Racha</p>
                    <p className="font-bold text-white mt-0.5 text-xs sm:text-sm">
                      {streak} {streak === 1 ? "día" : "días"}
                    </p>
                  </div>
                </div>
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-zinc-950/50">
                  <Calendar className="size-4.5 text-zinc-500" />
                </div>
              </div>
            </div>

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
