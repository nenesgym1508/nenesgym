import Image from "next/image"
import { Calendar } from "lucide-react"
import { MembershipBadge } from "@/components/ui/badge"
import { formatDate } from "@/lib/dates"
import type { MembershipStatus } from "@/types/membership"

interface MembershipSummaryCardProps {
  status: MembershipStatus
  remainingDays: number
  totalDays: number
  startDate: string
  endDate: string
}

export function MembershipSummaryCard({
  status,
  remainingDays,
  totalDays: _totalDays,
  startDate,
  endDate,
}: MembershipSummaryCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-zinc-700 bg-zinc-950 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
      {/* Imagen de fondo */}
      <Image
        src="/gym-card-bg.webp"
        alt=""
        fill
        sizes="(min-width: 768px) 700px, 100vw"
        className="pointer-events-none object-cover object-right opacity-60 select-none"
        priority
      />
      {/* Overlay para legibilidad del texto */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-transparent" />

      <div className="relative p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Membresía
          </span>
          <MembershipBadge status={status} />
        </div>

        <div className="flex flex-col">
          <span data-stat className="font-bebas text-6xl font-bold leading-none tracking-wide text-white">
            {remainingDays}
          </span>
          <span className="mt-1 text-xs text-zinc-400">entrenamientos restantes</span>
        </div>

        <div className="mt-4 border-t border-white/5 pt-3 flex flex-col gap-1.5 text-xs text-zinc-500">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Activación
            </span>
            <span className="font-medium text-zinc-300">{formatDate(startDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              Vence
            </span>
            <span className="font-medium text-zinc-300">{formatDate(endDate)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
