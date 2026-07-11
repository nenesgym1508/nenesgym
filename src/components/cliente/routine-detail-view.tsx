"use client"

import { useState } from "react"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/constants/routes"
import { DayTabBar } from "@/components/admin/day-tab-bar"
import { BlockCard } from "@/components/admin/class-editor"
import { ROUTINE_STATUS_LABELS, ROUTINE_LEVEL_LABELS, formatRoutineGoal, type ClientRoutineWithDays } from "@/types/routine"
import { MarkDoneTodayBar } from "@/components/cliente/mark-done-today-bar"

interface RoutineDetailViewProps {
  routine: ClientRoutineWithDays
  isDoneToday: boolean
  todayStr: string
}

export function RoutineDetailView({ routine, isDoneToday, todayStr }: RoutineDetailViewProps) {
  const [activeDayId, setActiveDayId] = useState<string | null>(
    routine.days[0]?.id ?? null
  )

  const activeDay = routine.days.find((d) => d.id === activeDayId)

  return (
    <div className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.CLIENTE_RUTINAS}
            className="rounded-lg p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-sm font-semibold text-zinc-200 truncate max-w-[240px]">
              {routine.title}
            </h1>
            <p className="text-[10px] text-zinc-500">
              {ROUTINE_STATUS_LABELS[routine.status] || routine.status} · Rutina Asignada
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Metadatos informativos */}
        <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-4 space-y-2">
          {routine.description && (
            <p className="text-xs text-zinc-400">{routine.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
            {routine.goal && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 border border-white/5">
                Objetivo: {formatRoutineGoal(routine.goal, routine.custom_goal)}
              </span>
            )}
            {routine.level && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 border border-white/5">
                Nivel: {ROUTINE_LEVEL_LABELS[routine.level] ?? routine.level}
              </span>
            )}
            {routine.days_per_week && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 border border-white/5">
                {routine.days_per_week} días/semana
              </span>
            )}
          </div>
        </div>

        {/* Pestañas de día (modo lectura) */}
        <DayTabBar
          days={routine.days}
          activeDayId={activeDayId}
          readOnly={true}
          onSelectDay={setActiveDayId}
          onAddDay={() => {}}
          onUpdateDay={() => {}}
          onDeleteDay={() => {}}
        />

        {/* Bloques del día activo */}
        {activeDay ? (
          <div className="space-y-4">
            {activeDay.blocks.length === 0 ? (
              <div className="text-center py-10 text-xs text-zinc-500">
                Este día no tiene ejercicios asignados.
              </div>
            ) : (
              <div className="space-y-4">
                {activeDay.blocks.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    isFirst={false}
                    isLast={false}
                    isPending={false}
                    readOnly={true}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-10 text-xs text-zinc-500">
            No hay días configurados en esta rutina.
          </div>
        )}
      </div>

      <MarkDoneTodayBar
        routineId={routine.id}
        activeDayId={activeDayId}
        initialHasSession={isDoneToday}
        sessionDate={todayStr}
      />
    </div>
  )
}
