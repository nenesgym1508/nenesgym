"use client"

import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, Scale, Ruler, Activity, Flame, Calendar, ChevronRight } from "lucide-react"
import { getBmiCategory } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { BMI_CATEGORIES } from "@/constants/plans"
import {
  type ProgressRecord,
  type BodyMetricKey,
  BODY_METRIC_LABELS,
  BODY_METRIC_COLUMN,
  BODY_METRIC_UNIT,
} from "@/types/progress"

interface ProgressHistoryProps {
  records: ProgressRecord[]
}

type ChartFilter = "30d" | "3m" | "all"

const METRIC_ORDER: BodyMetricKey[] = ["weight", "waist", "chest", "arm", "leg"]

export function ProgressHistory({ records }: ProgressHistoryProps) {
  const [filter, setFilter] = useState<ChartFilter>("3m")
  const [metric, setMetric] = useState<BodyMetricKey>("weight")

  // Métricas con al menos un dato registrado (para el selector).
  const availableMetrics = useMemo(
    () => METRIC_ORDER.filter((m) => records.some((r) => r[BODY_METRIC_COLUMN[m]] != null)),
    [records]
  )

  const activeMetric: BodyMetricKey = availableMetrics.includes(metric)
    ? metric
    : availableMetrics[0] ?? "weight"

  const filteredRecords = useMemo(() => {
    if (filter === "all") return records
    const days = filter === "30d" ? 30 : 90
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return records.filter((r) => new Date(r.measured_date ?? r.recorded_at) >= cutoff)
  }, [records, filter])

  const metricCol = BODY_METRIC_COLUMN[activeMetric]
  const { metricRecords, metricValues } = useMemo(() => {
    const recs = filteredRecords.filter((r) => r[metricCol] != null).slice().reverse()
    return { metricRecords: recs, metricValues: recs.map((r) => r[metricCol] as number) }
  }, [filteredRecords, metricCol])

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 py-10 text-center shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-600 bg-zinc-950">
          <Activity className="size-5 text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-300">Sin registros aún</p>
          <p className="mt-0.5 text-xs text-zinc-600">Añadí tu primera medición arriba</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── EVOLUCIÓN ── */}
      <div className="space-y-3">
        {/* Cabecera estilo mockup */}
        <div className="flex items-center justify-between border-l-2 border-red-600 pl-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Evolución
          </h3>
          <div className="flex gap-1.5">
            {(["30d", "3m", "all"] as ChartFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold transition-all cursor-pointer ${
                  filter === f
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {f === "30d" ? "30 días" : f === "3m" ? "3 meses" : "Todo"}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
          {/* Selector de métrica en formato de píldoras (pills) */}
          {availableMetrics.length > 1 && (
            <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
              {availableMetrics.map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`shrink-0 rounded-full px-3.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-all cursor-pointer ${
                    activeMetric === m
                      ? "bg-red-600 text-white"
                      : "bg-zinc-800/80 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {BODY_METRIC_LABELS[m]}
                </button>
              ))}
            </div>
          )}

          {metricValues.length >= 2 ? (
            <>
              <MetricLineChart values={metricValues} />
              <div className="mt-2.5 flex items-center justify-between text-[10px] text-zinc-600 font-medium px-1">
                <span>{formatDate(metricRecords[0]!.measured_date ?? metricRecords[0]!.recorded_at)}</span>
                <span className="text-zinc-500 uppercase tracking-wider">{BODY_METRIC_LABELS[activeMetric]} ({BODY_METRIC_UNIT[activeMetric]})</span>
                <span>{formatDate(metricRecords[metricRecords.length - 1]!.measured_date ?? metricRecords[metricRecords.length - 1]!.recorded_at)}</span>
              </div>
            </>
          ) : (
            <p className="py-6 text-center text-xs text-zinc-500">
              Aún no hay suficientes datos para graficar esta medida.
            </p>
          )}
        </div>
      </div>

      {/* ── HISTORIAL ── */}
      <div className="space-y-3">
        {/* Cabecera estilo mockup */}
        <div className="flex items-center border-l-2 border-red-600 pl-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Historial
          </h3>
        </div>
        
        <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
          {(() => {
            const visibleRecords = records.slice(0, 20)
            return visibleRecords.map((r, i) => {
              const bmiCat = r.bmi != null ? getBmiCategory(r.bmi) : null
              const bmiInfo = bmiCat ? BMI_CATEGORIES[bmiCat] : null
              
              // Construimos el resumen de métricas en una sola línea elegante: "100 kg  |  170 cm  |  Brazo 37 cm"
              const summaryParts: string[] = []
              if (r.weight_kg != null) summaryParts.push(`${r.weight_kg} kg`)
              if (r.height_cm != null) summaryParts.push(`${r.height_cm} cm`)
              if (r.waist_cm != null) summaryParts.push(`Cintura ${r.waist_cm} cm`)
              if (r.chest_cm != null) summaryParts.push(`Pecho ${r.chest_cm} cm`)
              if (r.arm_cm != null) summaryParts.push(`Brazo ${r.arm_cm} cm`)
              if (r.leg_cm != null) summaryParts.push(`Pierna ${r.leg_cm} cm`)
              const summaryText = summaryParts.join("  |  ")

              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3.5 px-5 py-4 ${
                    i < visibleRecords.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  {/* Icono de calendario estilo mockup */}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-zinc-950">
                    <Calendar className="size-4.5 text-zinc-500" />
                  </div>
                  
                  {/* Detalles en el medio */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-200 leading-tight">
                      {formatDate(r.measured_date ?? r.recorded_at)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 leading-none truncate">
                      {summaryText}
                    </p>
                  </div>
                  
                  {/* IMC a la derecha */}
                  <div className="flex items-center gap-2 shrink-0">
                    {r.bmi != null && bmiInfo && (
                      <span className={`text-xs font-bold uppercase tracking-wider ${bmiInfo.color}`}>
                        IMC {r.bmi.toFixed(1)}
                      </span>
                    )}
                    <ChevronRight className="size-4 text-zinc-600" />
                  </div>
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}

// ─── MetricLineChart ─────────────────────────────────────────

function MetricLineChart({ values }: { values: number[] }) {
  const W = 500
  const H = 90
  const PAD = { top: 16, right: 12, bottom: 4, left: 12 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const minW = Math.min(...values)
  const maxW = Math.max(...values)
  const spread = maxW - minW || 1
  const yMin = minW - spread * 0.4
  const yMax = maxW + spread * 0.4
  const yRange = yMax - yMin

  const getX = (i: number) =>
    PAD.left + (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW)
  const getY = (w: number) =>
    PAD.top + innerH - ((w - yMin) / yRange) * innerH

  const pts = values.map((w, i) => ({ x: getX(i), y: getY(w), w }))

  const pathD = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]!
    const cpX = (prev.x + p.x) / 2
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`
  }, "")

  const areaD =
    pathD +
    ` L ${pts[pts.length - 1]!.x} ${H - PAD.bottom}` +
    ` L ${pts[0]!.x} ${H - PAD.bottom} Z`

  const last = pts[pts.length - 1]!

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: 90, overflow: "visible" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#wg)" />
      <path
        d={pathD}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3f3f46" stroke="#52525b" strokeWidth="1.5" />
      ))}
      <circle cx={last.x} cy={last.y} r="5" fill="#ef4444" stroke="#18181b" strokeWidth="2" />
      <circle cx={last.x} cy={last.y} r="9" fill="none" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.3" />
    </svg>
  )
}
