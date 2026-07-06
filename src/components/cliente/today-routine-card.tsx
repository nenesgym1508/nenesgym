"use client"

import Link from "next/link"
import { Check, ClipboardList, ChevronRight } from "lucide-react"

interface TodayRoutineCardProps {
  hasRoutine: boolean
  routineId?: string
  routineTitle?: string
  isDoneToday: boolean
}

export function TodayRoutineCard({
  hasRoutine,
  routineId,
  routineTitle,
  isDoneToday
}: TodayRoutineCardProps) {
  if (!hasRoutine) {
    return (
      <div className="rounded-3xl border border-white/8 bg-zinc-900/40 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400">
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200">Rutinas personales</h3>
            <p className="text-xs text-zinc-500">Diseña tu propio plan o pídele uno a tu profesor</p>
          </div>
        </div>
        <Link
          href="/cliente/rutinas"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-850 hover:text-white transition-colors"
        >
          Ver mis rutinas
          <ChevronRight className="size-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/8 bg-zinc-900/40 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex size-10 items-center justify-center rounded-2xl ${isDoneToday ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"}`}>
            <ClipboardList className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-200 truncate max-w-[180px]">{routineTitle}</h3>
            <p className="text-xs text-zinc-500">Rutina activa de hoy</p>
          </div>
        </div>
        {isDoneToday && (
          <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[10px] font-bold text-green-400">
            <Check className="size-3" /> Hecho
          </span>
        )}
      </div>

      <Link
        href={`/cliente/rutinas/${routineId}`}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 py-2.5 text-xs font-semibold text-zinc-200 hover:text-white transition-colors"
      >
        Ver rutina y ejercicios
        <ChevronRight className="size-3.5" />
      </Link>
    </div>
  )
}
