import Link from "next/link"
import { TrendingUp, ArrowUp, ArrowDown, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"

interface QuickProgressCardProps {
  weightKg?: number | null
  bmi?: number | null
  weightDelta?: number | null
}

export function QuickProgressCard({ weightKg, bmi, weightDelta }: QuickProgressCardProps) {
  const hasDelta = weightDelta != null && weightDelta !== 0

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-4 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
          <TrendingUp className="size-5 text-zinc-300" />
        </div>
        <div className="flex flex-1 items-start gap-5">
          {weightKg != null && (
            <div>
              <p className="text-sm font-bold text-zinc-100">{weightKg} kg</p>
              <p className="text-xs text-zinc-500">Peso</p>
            </div>
          )}
          {bmi != null && (
            <div>
              <p className="text-sm font-bold text-zinc-100">{bmi.toFixed(1)}</p>
              <p className="text-xs text-zinc-500">IMC</p>
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
    </Card>
  )
}
