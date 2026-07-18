"use client"

import { useState, useMemo } from "react"
import { TrendingUp, TrendingDown, Minus, Scale, Ruler, Activity, Ruler as WaistIcon } from "lucide-react"
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

  const latest = records[0]
  const previous = records[1] ?? null

  const weightDiff =
    previous?.weight_kg != null && latest.weight_kg != null
      ? +(latest.weight_kg - previous.weight_kg).toFixed(1)
      : null

  const bmiCategory = latest.bmi != null ? getBmiCategory(latest.bmi) : null
  const bmiInfo = bmiCategory ? BMI_CATEGORIES[bmiCategory] : null



  return (
    <div className="space-y-4">

      {/* ── STATS DUO ── */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Scale}
          label="Peso"
          value={latest.weight_kg != null ? `${latest.weight_kg}` : "—"}
          unit="kg"
          delta={weightDiff}
        />
        <StatCard
          icon={Ruler}
          label="Altura"
          value={latest.height_cm != null ? `${latest.height_cm}` : "—"}
          unit="cm"
        />
      </div>

      {latest.waist_cm != null && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 px-4 py-2.5">
          <WaistIcon className="size-3.5 text-zinc-500 shrink-0" />
          <span className="text-xs text-zinc-500">Cintura</span>
          <span className="text-sm font-bold text-zinc-200 ml-auto">{latest.waist_cm} cm</span>
        </div>
      )}

      {/* ── IMC GAUGE ── */}
      {latest.bmi != null && bmiInfo && (
        <div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Índice de masa corporal
            </p>
            <span className={`text-xs font-bold ${bmiInfo.color}`}>
              {bmiInfo.label} ({latest.bmi.toFixed(1)})
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, #3b82f6 0%, #22c55e 30%, #eab308 60%, #ef4444 100%)",
              }}
            />
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white shadow-lg"
              style={{
                left: `${Math.min(Math.max(((latest.bmi - 15) / 25) * 100, 2), 97)}%`,
              }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
            <span>15</span>
            <span className="text-blue-400">18.5</span>
            <span className="text-green-400">25</span>
            <span className="text-yellow-400">30</span>
            <span className="text-red-400">40</span>
          </div>
          <p className="mt-2.5 text-[11px] text-zinc-500">
            Dato orientativo. Tu progreso también depende de tu constancia y fuerza.
          </p>
        </div>
      )}

      {/* ── METRIC CHART ── */}
      {availableMetrics.length > 0 && (
        <div className="rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-4 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Evolución
            </p>
            <div className="flex gap-1">
              {(["30d", "3m", "all"] as ChartFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                    filter === f
                      ? "bg-red-600/20 text-red-400"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {f === "30d" ? "30 días" : f === "3m" ? "3 meses" : "Todo"}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de métrica (solo las que tienen datos) */}
          {availableMetrics.length > 1 && (
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
              {availableMetrics.map((m) => (
                <button
                  key={m}
                  onClick={() => setMetric(m)}
                  className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    activeMetric === m
                      ? "bg-red-600/20 text-red-400"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
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
              <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-600">
                <span>{formatDate(metricRecords[0]!.measured_date ?? metricRecords[0]!.recorded_at)}</span>
                <span className="text-zinc-500">{BODY_METRIC_LABELS[activeMetric]} ({BODY_METRIC_UNIT[activeMetric]})</span>
                <span>{formatDate(metricRecords[metricRecords.length - 1]!.measured_date ?? metricRecords[metricRecords.length - 1]!.recorded_at)}</span>
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-xs text-zinc-600">
              Aún no hay suficientes datos para graficar esta medida.
            </p>
          )}
        </div>
      )}

      {/* ── HISTORY LIST ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Historial
        </p>
        <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
          {(() => {
            const visibleRecords = records.slice(0, 20)
            return visibleRecords.map((r, i) => (
              <div
                key={r.id}
                className={`px-5 py-3.5 ${
                  i < visibleRecords.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-zinc-200">
                  {formatDate(r.measured_date ?? r.recorded_at)}
                </span>
                {r.bmi != null && (
                  <span
                    className={`text-xs font-medium ${
                      BMI_CATEGORIES[getBmiCategory(r.bmi)].color
                    }`}
                  >
                    IMC {r.bmi.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="mt-1 flex gap-4 flex-wrap">
                {r.weight_kg != null && (
                  <span className="text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">{r.weight_kg}</span> kg
                  </span>
                )}
                {r.height_cm != null && (
                  <span className="text-xs text-zinc-400">
                    <span className="text-zinc-300 font-medium">{r.height_cm}</span> cm
                  </span>
                )}
                {r.waist_cm != null && (
                  <span className="text-xs text-zinc-400">
                    Cintura <span className="text-zinc-300 font-medium">{r.waist_cm}</span> cm
                  </span>
                )}
                {r.chest_cm != null && (
                  <span className="text-xs text-zinc-400">
                    Pecho <span className="text-zinc-300 font-medium">{r.chest_cm}</span> cm
                  </span>
                )}
                {r.arm_cm != null && (
                  <span className="text-xs text-zinc-400">
                    Brazo <span className="text-zinc-300 font-medium">{r.arm_cm}</span> cm
                  </span>
                )}
                {r.leg_cm != null && (
                  <span className="text-xs text-zinc-400">
                    Pierna <span className="text-zinc-300 font-medium">{r.leg_cm}</span> cm
                  </span>
                )}
              </div>
              {r.note && (
                <p className="mt-1 text-[11px] italic text-zinc-600">{r.note}</p>
              )}
            </div>
          ))
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

// ─── StatCard ────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  delta,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  unit: string
  delta?: number | null
  accent?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 px-3 py-3 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-zinc-500" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-1 leading-none">
        <span className={`font-bebas text-3xl tracking-wide ${accent ?? "text-white"}`}>{value}</span>
        {unit && <span className="mb-0.5 text-[11px] font-medium text-zinc-500">{unit}</span>}
      </div>
      {delta != null && (
        <div className="flex items-center gap-0.5">
          {delta < 0 ? (
            <TrendingDown className="size-3 text-green-400" />
          ) : delta > 0 ? (
            <TrendingUp className="size-3 text-red-400" />
          ) : (
            <Minus className="size-3 text-zinc-500" />
          )}
          <span
            className={`text-[10px] font-semibold ${
              delta < 0 ? "text-green-400" : delta > 0 ? "text-red-400" : "text-zinc-500"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta} kg
          </span>
        </div>
      )}
    </div>
  )
}
