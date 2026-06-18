import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { Card } from "@/components/ui/card"
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
      <div className="text-center py-8 text-zinc-500 text-sm">
        Aún no tienes registros de progreso
      </div>
    )
  }

  const latest = records[0]
  const previous = records[1] ?? null

  const weightDiff =
    previous?.weight_kg != null && latest.weight_kg != null
      ? latest.weight_kg - previous.weight_kg
      : null

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Historial
      </h3>

      {/* Resumen IMC */}
      {latest.bmi != null && (
        <Card className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 mb-1">IMC actual</p>
            <p className="text-3xl font-black text-zinc-100">{latest.bmi.toFixed(1)}</p>
            <p className={`text-sm font-medium mt-0.5 ${BMI_CATEGORIES[getBmiCategory(latest.bmi)].color}`}>
              {BMI_CATEGORIES[getBmiCategory(latest.bmi)].label}
            </p>
          </div>
          {weightDiff !== null && (
            <div className="flex items-center gap-1 text-sm">
              {weightDiff < 0 ? (
                <TrendingDown className="size-4 text-green-400" />
              ) : weightDiff > 0 ? (
                <TrendingUp className="size-4 text-red-400" />
              ) : (
                <Minus className="size-4 text-zinc-500" />
              )}
              <span className={weightDiff < 0 ? "text-green-400" : weightDiff > 0 ? "text-red-400" : "text-zinc-500"}>
                {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)} kg
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Lista de registros */}
      <Card className="p-0 overflow-hidden">
        {records.map((r, i) => (
          <div
            key={r.id}
            className={`px-4 py-3.5 ${i < records.length - 1 ? "border-b border-white/5" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">
                {formatDate(r.recorded_at)}
              </span>
              {r.bmi && (
                <span className="text-xs text-zinc-500">IMC {r.bmi.toFixed(1)}</span>
              )}
            </div>
            <div className="flex gap-4 mt-1 text-xs text-zinc-400">
              {r.weight_kg && <span>{r.weight_kg} kg</span>}
              {r.height_cm && <span>{r.height_cm} cm</span>}
            </div>
            {r.note && (
              <p className="text-xs text-zinc-500 mt-1 italic">{r.note}</p>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
