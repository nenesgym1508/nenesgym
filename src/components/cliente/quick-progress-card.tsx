import Link from "next/link"
import { TrendingUp, ArrowUp, ArrowDown, ChevronRight } from "lucide-react"
import { ROUTES } from "@/constants/routes"

interface QuickProgressCardProps {
  weightKg?: number | null
  bmi?: number | null
  weightDelta?: number | null
}

export function QuickProgressCard({ weightKg, bmi, weightDelta }: QuickProgressCardProps) {
  const hasDelta = weightDelta != null && weightDelta !== 0

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
      <div className="flex items-center gap-4 p-5">
        <div className="w-11 h-11 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-950 shrink-0">
          <TrendingUp className="size-5 text-red-500" />
        </div>
        <div className="flex flex-1 items-start gap-5">
          {weightKg != null && (
            <div>
              <p className="font-bebas text-2xl tracking-wide text-white leading-none">{weightKg} <span className="text-xs font-sans text-zinc-500">kg</span></p>
              <p className="text-xs text-zinc-500 mt-1">Peso</p>
            </div>
          )}
          {bmi != null && (
            <div>
              <p className="font-bebas text-2xl tracking-wide text-white leading-none">{bmi.toFixed(1)}</p>
              <p className="text-xs text-zinc-500 mt-1">IMC</p>
            </div>
          )}
          {hasDelta && (
            <div className="ml-auto">
              <p
                className={`flex items-center gap-0.5 text-sm font-bold ${
                  weightDelta! < 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {weightDelta! < 0 ? (
                  <ArrowDown className="size-3.5" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
                {weightDelta! > 0 && "+"}
                {weightDelta!.toFixed(1)} kg
              </p>
              <p className="text-xs text-zinc-500">Variación</p>
            </div>
          )}
        </div>
      </div>
      <Link
        href={ROUTES.CLIENTE_PROGRESO}
        className="flex items-center justify-center gap-1 border-t border-white/5 py-2.5 text-xs font-medium text-red-400 hover:bg-white/5"
      >
        Ver progreso
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  )
}
