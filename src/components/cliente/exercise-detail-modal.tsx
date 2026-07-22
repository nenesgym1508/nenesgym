"use client"

import Image from "next/image"
import { Dumbbell, X } from "lucide-react"
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  type Exercise,
} from "@/types/exercise"

interface ExerciseDetailModalProps {
  exercise: Exercise
  onClose: () => void
}

export function ExerciseDetailModal({ exercise, onClose }: ExerciseDetailModalProps) {
  const details = [
    exercise.muscle_group ? { label: "Músculo", value: MUSCLE_GROUP_LABELS[exercise.muscle_group] } : null,
    exercise.equipment ? { label: "Equipo", value: EQUIPMENT_LABELS[exercise.equipment] } : null,
    exercise.exercise_type ? { label: "Tipo", value: EXERCISE_TYPE_LABELS[exercise.exercise_type] } : null,
  ].filter((d): d is { label: string; value: string } => d !== null)

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 md:backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl md:rounded-2xl border border-white/10 bg-zinc-900 flex flex-col max-h-[90dvh] md:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <p className="text-sm font-bold text-zinc-100">Detalle del ejercicio</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300" aria-label="Cerrar">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {exercise.media_url ? (
            <div className="relative w-full h-56 bg-zinc-800">
              {exercise.media_url.includes("supabase.co") ? (
                <Image
                  src={exercise.media_url}
                  alt={exercise.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 512px"
                  className="object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none" }}
                />
              ) : (
                <img
                  src={exercise.media_url}
                  alt={exercise.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none" }}
                />
              )}
            </div>
          ) : (
            <div className="flex h-40 w-full items-center justify-center bg-zinc-800 text-zinc-600">
              <Dumbbell className="size-12" />
            </div>
          )}

          <div className="p-4 space-y-4">
            <p className="text-lg font-bold text-zinc-100">{exercise.name}</p>

            {details.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {details.map((d) => (
                  <span key={d.label} className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                    <span className="text-zinc-500">{d.label}:</span> {d.value}
                  </span>
                ))}
              </div>
            )}

            {exercise.instructions ? (
              <p className="text-sm text-zinc-400 whitespace-pre-line">{exercise.instructions}</p>
            ) : (
              <p className="text-sm text-zinc-600">Este ejercicio no tiene descripción.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
