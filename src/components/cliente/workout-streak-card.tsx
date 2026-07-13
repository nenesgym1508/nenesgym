import { Flame, Trophy } from "lucide-react"

interface WorkoutStreakCardProps {
  streak: number
  monthlyCount: number
}

export function WorkoutStreakCard({ streak, monthlyCount }: WorkoutStreakCardProps) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
      <div className="flex flex-col gap-1 p-5">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Flame className="size-4 text-red-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Racha</span>
        </div>
        <p className="font-bebas text-3xl tracking-wide text-white leading-none mt-1">
          <span data-stat>{streak}</span>{" "}
          <span className="text-sm font-sans font-medium text-zinc-500">
            {streak === 1 ? "día" : "días"}
          </span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          {streak > 0 ? "consecutivos" : "Empieza hoy"}
        </p>
      </div>
      <div className="flex flex-col gap-1 border-l border-white/5 p-5">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Trophy className="size-4 text-amber-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Este mes</span>
        </div>
        <p className="font-bebas text-3xl tracking-wide text-white leading-none mt-1">
          <span data-stat>{monthlyCount}</span>
        </p>
        <p className="text-xs text-zinc-500 mt-1">entrenamientos</p>
      </div>
    </div>
  )
}
