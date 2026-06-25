import { Target, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ProgressBar } from "@/components/ui/progress-bar"

interface MonthlyGoalCardProps {
  current: number
  goal: number
}

export function MonthlyGoalCard({ current, goal }: MonthlyGoalCardProps) {
  const reached = goal > 0 && current >= goal
  const remaining = Math.max(0, goal - current)

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Target className="size-4 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Meta mensual</span>
        </div>
        <span className="text-sm font-semibold text-zinc-200">
          <span data-stat>{Math.min(current, goal)}</span> / <span data-stat>{goal}</span>
        </span>
      </div>

      <ProgressBar value={current} max={goal} />

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400">
          {reached
            ? "Excelente trabajo 💪"
            : remaining === 1
              ? "Solo falta 1 entrenamiento."
              : `Solo faltan ${remaining} entrenamientos.`}
        </p>
        {!reached && <ChevronRight className="size-4 shrink-0 text-zinc-600" />}
      </div>
    </Card>
  )
}
