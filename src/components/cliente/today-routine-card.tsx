"use client"

import Link from "next/link"
import { ClipboardList, ChevronRight } from "lucide-react"

interface TodayRoutineCardProps {
  hasRoutine: boolean
}

export function TodayRoutineCard({ hasRoutine }: TodayRoutineCardProps) {
  if (!hasRoutine) {
    return (
      <div className="rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)] space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-950 shrink-0">
            <ClipboardList className="size-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="font-bebas text-lg tracking-wide uppercase text-white">Rutinas personales</h3>
            <p className="text-xs text-zinc-500">Diseña tu propio plan o pídele uno a tu profesor</p>
          </div>
        </div>
        <div className="border-t border-white/5" />
        <Link
          href="/cliente/rutinas"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-950 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-colors"
        >
          Ver mis rutinas
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <Link
      href="/cliente/rutinas"
      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 py-3.5 text-sm font-semibold text-zinc-200 hover:text-white hover:border-zinc-600 transition-colors shadow-[0_4px_25px_rgba(0,0,0,0.65)]"
    >
      Ver rutina y ejercicios
      <ChevronRight className="size-4" />
    </Link>
  )
}
