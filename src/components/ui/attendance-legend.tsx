import { cn } from "@/lib/utils"

// Sin "Falta": no venir un día ya no cuesta nada, porque los días del plan se
// gastan solo al marcar entrada (ver membershipRemainingDays). Marcar en rojo
// los días sin asistencia era además engañoso con planes de 3 o 4 días por
// semana: pintaba como fallos los días que el cliente nunca tuvo que venir.
const LEGEND = [
  { label: "Asistido", dot: "bg-green-600/60 border border-green-500/50" },
  { label: "Hoy", dot: "bg-transparent ring-1 ring-white ring-offset-1 ring-offset-zinc-950" },
  { label: "Plan vigente", dot: "bg-white/5 border border-white/20" },
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
