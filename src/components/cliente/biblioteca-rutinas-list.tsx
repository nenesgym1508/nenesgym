"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Calendar, Dumbbell, Layers, Library, Star } from "lucide-react"
import { toggleTrainingRoutineFavoriteAction } from "@/actions/training-routines.actions"
import { clienteRutinaBibliotecaDetalle } from "@/constants/routes"
import { formatRoutineGoal, ROUTINE_LEVEL_LABELS, type RoutineLevel } from "@/types/routine"
import type { TrainingRoutine } from "@/services/training-routines.service"

interface BibliotecaRutinasListProps {
  routines: TrainingRoutine[]
}

type FavTab = "todos" | "favoritos"

export function BibliotecaRutinasList({ routines: initialRoutines }: BibliotecaRutinasListProps) {
  const [routines, setRoutines] = useState(initialRoutines)
  const [tab, setTab] = useState<FavTab>("todos")
  const [pendingId, setPendingId] = useState<string | null>(null)

  const favoritesCount = useMemo(() => routines.filter((r) => r.is_favorite).length, [routines])
  const filtered = tab === "favoritos" ? routines.filter((r) => r.is_favorite) : routines

  const handleToggleFavorite = async (e: React.MouseEvent, routine: TrainingRoutine) => {
    e.preventDefault()
    e.stopPropagation()
    if (pendingId) return
    setPendingId(routine.id)
    const nextFavorite = !routine.is_favorite
    const res = await toggleTrainingRoutineFavoriteAction(routine.id, nextFavorite)
    if (!("error" in res)) {
      setRoutines((prev) => prev.map((r) => (r.id === routine.id ? { ...r, is_favorite: nextFavorite } : r)))
    }
    setPendingId(null)
  }

  if (routines.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 text-xs rounded-3xl border border-zinc-800 bg-zinc-900/20 flex flex-col items-center gap-2">
        <Library className="size-6 text-zinc-700" />
        Tu gimnasio todavía no publicó rutinas públicas.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("todos")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            tab === "todos" ? "btn-glossy-red text-white" : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          Todos ({routines.length})
        </button>
        <button
          onClick={() => setTab("favoritos")}
          className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
            tab === "favoritos" ? "btn-glossy-red text-white" : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          Favoritos ({favoritesCount})
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 text-xs rounded-3xl border border-zinc-800 bg-zinc-900/20">
          Aún no marcaste ninguna rutina como favorita.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((r) => (
            <Link
              key={r.id}
              href={clienteRutinaBibliotecaDetalle(r.id)}
              className="block rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)] space-y-3.5 hover:border-red-600/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-950 shrink-0">
                  <Dumbbell className="size-5 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bebas font-bold text-xl tracking-wide uppercase text-white truncate">
                    {r.name}
                  </h4>
                  {r.level && (
                    <span className="text-[10px] text-zinc-400 bg-zinc-800 border border-white/5 rounded-md px-2.5 py-0.5 mt-1 inline-block font-semibold">
                      {ROUTINE_LEVEL_LABELS[r.level as RoutineLevel] ?? r.level}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => handleToggleFavorite(e, r)}
                  disabled={pendingId === r.id}
                  aria-label={r.is_favorite ? "Quitar de favoritos" : "Marcar como favorito"}
                  className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${
                    r.is_favorite
                      ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      : "bg-zinc-900 text-zinc-600 hover:bg-amber-500/15 hover:text-amber-400"
                  }`}
                >
                  <Star className="size-4" fill={r.is_favorite ? "currentColor" : "none"} />
                </button>
              </div>

              <div className="border-t border-white/5" />

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl border border-white/5 bg-zinc-950 flex items-center justify-center shrink-0">
                  <Calendar className="size-5 text-red-500" />
                </div>
                <div className="min-w-0 text-xs text-zinc-400 space-y-0.5 flex-1">
                  <p className="truncate">
                    <span className="text-zinc-500 font-medium">Objetivo:</span>{" "}
                    {r.goal ? formatRoutineGoal(r.goal, r.custom_goal) : "Sin definir"}
                  </p>
                  <p className="truncate">
                    <span className="text-zinc-500 font-medium">Frecuencia:</span>{" "}
                    {r.days_per_week ? `${r.days_per_week} días/sem` : "Sin definir"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-500 shrink-0">
                  <Layers className="size-3.5" /> {r.exercise_count ?? 0}
                </span>
              </div>

              <div className="w-full flex items-center justify-center rounded-xl border border-white/8 bg-zinc-900/60 py-2.5 text-xs font-semibold text-zinc-300">
                Ver rutina
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
