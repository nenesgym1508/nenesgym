import { cn } from "@/lib/utils"

// El rojo se reserva para lo que ya se perdió. Los días de entrenamiento que
// todavía no han llegado usan un gris neutro: antes compartían el rojo de
// "Falta" y el cliente que estrenaba plan abría la app viendo todo el mes por
// delante marcado como perdido.
const LEGEND = [
  { label: "Asistido", dot: "bg-green-600/60 border border-green-500/50" },
  { label: "Hoy", dot: "bg-transparent ring-1 ring-white ring-offset-1 ring-offset-zinc-950" },
  { label: "Falta", dot: "bg-red-500/25 border border-red-500/40" },
  { label: "Programado", dot: "bg-white/5 border border-white/20" },
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
