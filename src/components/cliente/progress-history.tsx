import { TrendingUp, TrendingDown, Minus, Scale, Ruler, Activity } from "lucide-react"
import { getBmiCategory } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { BMI_CATEGORIES } from "@/constants/plans"
import type { ProgressRecord } from "@/types/progress"

interface ProgressHistoryProps {
  records: ProgressRecord[]
}

export function ProgressHistory({ records }: ProgressHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/50 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
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

  // Weight values for mini chart (newest last in chart = left to right oldest→newest)
  const weightRecords = records
    .filter((r) => r.weight_kg != null)
    .slice(0, 10)
    .reverse()

  const weights = weightRecords.map((r) => r.weight_kg as number)
  return (
    <div className="space-y-4">

      {/* ── STATS TRIO ── */}
      <div className="grid grid-cols-3 gap-2">
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
        <StatCard
          icon={Activity}
          label="IMC"
          value={latest.bmi != null ? latest.bmi.toFixed(1) : "—"}
          unit=""
          accent={bmiInfo?.color}
        />
      </div>

      {/* ── IMC GAUGE ── */}
      {latest.bmi != null && bmiInfo && (
        <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Índice de masa corporal
            </p>
            <span className={`text-xs font-bold ${bmiInfo.color}`}>{bmiInfo.label}</span>
          </div>

          {/* Gauge bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full">
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to right, #3b82f6 0%, #22c55e 30%, #eab308 60%, #ef4444 100%)",
              }}
            />
            {/* Indicator */}
            <div
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-white shadow-lg"
              style={{
                left: `${Math.min(Math.max(((latest.bmi - 15) / 25) * 100, 2), 97)}%`,
              }}
            />
          </div>

          {/* Scale labels */}
          <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
            <span>15</span>
            <span className="text-blue-400">18.5</span>
            <span className="text-green-400">25</span>
            <span className="text-yellow-400">30</span>
            <span className="text-red-400">40</span>
          </div>

          <p className="mt-2.5 text-[11px] text-zinc-500">
            Rango saludable:{" "}
            <span className="font-medium text-zinc-300">18.5 – 24.9</span>
          </p>
        </div>
      )}

      {/* ── WEIGHT CHART ── */}
      {weights.length >= 2 && (
        <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Evolución de peso
            </p>
            <span className="text-xs font-bold text-red-400">
              {weights[weights.length - 1]} kg
            </span>
          </div>

          <WeightLineChart weights={weights} />

          {/* X-axis labels */}
          {(() => {
            const first = formatDate(weightRecords[0].recorded_at)
            const last = formatDate(weightRecords[weightRecords.length - 1].recorded_at)
            return first === last ? (
              <p className="mt-2 text-center text-[10px] text-zinc-600">{first}</p>
            ) : (
              <div className="mt-2 flex justify-between text-[10px] text-zinc-600">
                <span>{first}</span>
                <span>{last}</span>
              </div>
            )
          })()}
        </div>
      )}

      {/* ── HISTORY LIST ── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Historial
        </p>
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
          {records.map((r, i) => (
            <div
              key={r.id}
              className={`px-4 py-3.5 ${
                i < records.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-zinc-200">
                  {formatDate(r.recorded_at)}
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
              <div className="mt-1 flex gap-4">
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
              </div>
              {r.note && (
                <p className="mt-1 text-[11px] italic text-zinc-600">{r.note}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── WeightLineChart ─────────────────────────────────────────

function WeightLineChart({ weights }: { weights: number[] }) {
  const W = 500
  const H = 90
  const PAD = { top: 16, right: 12, bottom: 4, left: 12 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const spread = maxW - minW || 1
  // Padding vertical para que la línea no quede pegada al borde
  const yMin = minW - spread * 0.4
  const yMax = maxW + spread * 0.4
  const yRange = yMax - yMin

  const getX = (i: number) =>
    PAD.left + (weights.length === 1 ? innerW / 2 : (i / (weights.length - 1)) * innerW)
  const getY = (w: number) =>
    PAD.top + innerH - ((w - yMin) / yRange) * innerH

  const pts = weights.map((w, i) => ({ x: getX(i), y: getY(w), w }))

  // Smooth polyline via cubic bezier
  const pathD = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = pts[i - 1]
    const cpX = (prev.x + p.x) / 2
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${p.y}, ${p.x} ${p.y}`
  }, "")

  // Area fill — mismo path pero cierra por abajo
  const areaD =
    pathD +
    ` L ${pts[pts.length - 1].x} ${H - PAD.bottom}` +
    ` L ${pts[0].x} ${H - PAD.bottom} Z`

  const last = pts[pts.length - 1]

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

      {/* Area fill */}
      <path d={areaD} fill="url(#wg)" />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Dots — todos los puntos intermedios */}
      {pts.slice(0, -1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3f3f46" stroke="#52525b" strokeWidth="1.5" />
      ))}

      {/* Último punto — destacado */}
      <circle cx={last.x} cy={last.y} r="5" fill="#ef4444" stroke="#18181b" strokeWidth="2" />
      {/* Pulso exterior */}
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
    <div className="flex flex-col gap-1.5 rounded-2xl border border-white/8 bg-zinc-900/60 px-3 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3.5 text-zinc-500" />
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-1 leading-none">
        <span className={`text-2xl font-black ${accent ?? "text-zinc-100"}`}>{value}</span>
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
