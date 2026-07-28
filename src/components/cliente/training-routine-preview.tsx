"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { ROUTES, clienteRutinaDetalle } from "@/constants/routes"
import { DayTabBar } from "@/components/admin/day-tab-bar"
import { BlockCard } from "@/components/admin/class-editor"
import { saveTrainingRoutineToMyRoutinesAction } from "@/actions/training-routines.actions"
import { ROUTINE_LEVEL_LABELS, formatRoutineGoal, type RoutineLevel } from "@/types/routine"
import type { TrainingRoutine, TrainingRoutineDay } from "@/services/training-routines.service"

interface TrainingRoutinePreviewProps {
  routine: TrainingRoutine & { days: TrainingRoutineDay[] }
}

export function TrainingRoutinePreview({ routine }: TrainingRoutinePreviewProps) {
  const router = useRouter()
  const [activeDayId, setActiveDayId] = useState<string | null>(routine.days[0]?.id ?? null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const activeDay = routine.days.find((d) => d.id === activeDayId)

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await saveTrainingRoutineToMyRoutinesAction(routine.id)
      if (res.success && res.id) {
        router.push(clienteRutinaDetalle(res.id))
      } else {
        setError(res.error ?? "No se pudo guardar la rutina.")
      }
    })
  }

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
              {routine.name}
            </h1>
            <p className="text-[10px] text-zinc-500">Rutina pública del gimnasio · Solo lectura</p>
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
                Nivel: {ROUTINE_LEVEL_LABELS[routine.level as RoutineLevel] ?? routine.level}
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
                Este día no tiene ejercicios.
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
            Esta rutina no tiene días configurados.
          </div>
        )}
      </div>

      {/* Botón fijo: guardar copia independiente en "Mis rutinas" */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-white/8 bg-zinc-950/95 backdrop-blur-md p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {error && <p className="text-xs text-red-400 text-center mb-2">{error}</p>}
        <button
          onClick={handleSave}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-red py-3.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Guardar en mis rutinas
        </button>
      </div>
    </div>
  )
}
