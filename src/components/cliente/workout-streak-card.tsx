import { Flame, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"

interface WorkoutStreakCardProps {
  streak: number
  monthlyCount: number
}

export function WorkoutStreakCard({ streak, monthlyCount }: WorkoutStreakCardProps) {
  return (
    <Card className="grid grid-cols-2 overflow-hidden p-0">
      <div className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Flame className="size-4 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Racha</span>
        </div>
        <p className="text-2xl font-black text-zinc-100">
          <span data-stat>{streak}</span>{" "}
          <span className="text-sm font-medium text-zinc-500">
            {streak === 1 ? "día" : "días"}
          </span>
        </p>
        <p className="text-xs text-zinc-500">
          {streak > 0 ? "consecutivos" : "Empieza hoy"}
        </p>
      </div>
      <div className="flex flex-col gap-1 border-l border-white/5 p-4">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Trophy className="size-4 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Este mes</span>
        </div>
        <p className="text-2xl font-black text-zinc-100">
          <span data-stat>{monthlyCount}</span>
        </p>
        <p className="text-xs text-zinc-500">entrenamientos</p>
      </div>
    </Card>
  )
}
