import { cn } from "@/lib/utils"

const LEGEND = [
  { label: "Asistido", dot: "bg-green-600/60 border border-green-500/50" },
  { label: "Hoy", dot: "bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.6)]" },
  { label: "Falta", dot: "bg-red-500/25 border border-red-500/40" },
]

export function AttendanceLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] font-medium text-zinc-400",
        className
      )}
    >
      {LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", item.dot)} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
