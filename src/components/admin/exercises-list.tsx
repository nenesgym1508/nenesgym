"use client"

import { useState, useMemo } from "react"
import { Plus, Pencil, Power, Search, ChevronDown, ChevronUp } from "lucide-react"
import { toggleExerciseAction } from "@/actions/exercises.actions"
import { ExerciseForm } from "@/components/admin/exercise-form"
import {
  MUSCLE_GROUP_LABELS,
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type MuscleGroup,
} from "@/types/exercise"

interface ExercisesListProps {
  initialExercises: Exercise[]
}

export function ExercisesList({ initialExercises }: ExercisesListProps) {
  const [exercises, setExercises] = useState(initialExercises)
  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | "">("")
  const [inactiveExpanded, setInactiveExpanded] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Exercise | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const { active, inactive } = useMemo(() => {
    let list = exercises
    if (filterGroup) list = list.filter((e) => e.muscle_group === filterGroup)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((e) => e.name.toLowerCase().includes(q))
    }
    return {
      active: list.filter((e) => e.is_active).sort((a, b) => a.name.localeCompare(b.name)),
      inactive: list.filter((e) => !e.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    }
  }, [exercises, search, filterGroup])

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit = (ex: Exercise) => { setEditTarget(ex); setFormOpen(true) }

  const onFormSuccess = (updated: Exercise) => {
    setExercises((prev) => {
      const exists = prev.find((e) => e.id === updated.id)
      if (exists) return prev.map((e) => (e.id === updated.id ? updated : e))
      return [updated, ...prev]
    })
    setFormOpen(false)
  }

  const handleToggle = async (ex: Exercise) => {
    setTogglingId(ex.id)
    const result = await toggleExerciseAction(ex.id, !ex.is_active)
    if (!result.error) {
      setExercises((prev) =>
        prev.map((e) => (e.id === ex.id ? { ...e, is_active: !e.is_active } : e))
      )
    }
    setTogglingId(null)
  }

  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
  const total = active.length + inactive.length

  return (
    <>
      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar ejercicio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/20"
            />
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
          >
            <Plus className="size-4" />
            Nuevo
          </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterGroup("")}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterGroup === ""
                ? "bg-red-600/20 text-red-400"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Todos ({total})
          </button>
          {muscleGroups.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGroup(filterGroup === g ? "" : g)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                filterGroup === g
                  ? "bg-red-600/20 text-red-400"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {MUSCLE_GROUP_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {total === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/50 py-10 text-center">
          <p className="text-sm text-zinc-500">
            {exercises.length === 0
              ? "No hay ejercicios. Crea el primero."
              : "Sin resultados para esta búsqueda."}
          </p>
          {exercises.length === 0 && (
            <button
              onClick={openCreate}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Crear ejercicio
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Sección activos */}
          {active.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-green-600/25 bg-green-950/10">
              {active.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  ex={ex}
                  isLast={i === active.length - 1}
                  togglingId={togglingId}
                  onEdit={openEdit}
                  onToggle={handleToggle}
                  variant="active"
                />
              ))}
            </div>
          )}

          {active.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-2">
              Ningún ejercicio activo — activa los que uses en este gym
            </p>
          )}

          {/* Separador inactivos */}
          {inactive.length > 0 && (
            <>
              <button
                onClick={() => setInactiveExpanded((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-zinc-900/40 px-3.5 py-2 text-left transition-colors hover:bg-zinc-800/40"
              >
                <span className="text-xs font-medium text-zinc-500">
                  Inactivos ({inactive.length})
                </span>
                {inactiveExpanded ? (
                  <ChevronUp className="size-3.5 text-zinc-600" />
                ) : (
                  <ChevronDown className="size-3.5 text-zinc-600" />
                )}
              </button>

              {inactiveExpanded && (
                <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
                  {inactive.map((ex, i) => (
                    <ExerciseRow
                      key={ex.id}
                      ex={ex}
                      isLast={i === inactive.length - 1}
                      togglingId={togglingId}
                      onEdit={openEdit}
                      onToggle={handleToggle}
                      variant="inactive"
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal de formulario */}
      {formOpen && (
        <ExerciseForm
          exercise={editTarget}
          onSuccess={onFormSuccess}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  )
}

interface ExerciseRowProps {
  ex: Exercise
  isLast: boolean
  togglingId: string | null
  onEdit: (ex: Exercise) => void
  onToggle: (ex: Exercise) => void
  variant: "active" | "inactive"
}

function ExerciseRow({ ex, isLast, togglingId, onEdit, onToggle, variant }: ExerciseRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        !isLast
          ? variant === "active"
            ? "border-b border-green-600/15"
            : "border-b border-white/5"
          : ""
      }`}
    >
      {ex.media_url ? (
        <img
          src={ex.media_url}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover bg-zinc-800"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
        />
      ) : (
        <div className="h-10 w-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs font-bold">
          {ex.muscle_group?.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${variant === "active" ? "text-zinc-100" : "text-zinc-400"}`}>
          {ex.name}
        </p>
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {ex.muscle_group && (
            <span className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${
              variant === "active" ? "text-green-300 bg-green-900/40" : "text-zinc-400 bg-zinc-800"
            }`}>
              {MUSCLE_GROUP_LABELS[ex.muscle_group as MuscleGroup]}
            </span>
          )}
          {ex.exercise_type && (
            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/50 rounded px-1.5 py-0.5">
              {EXERCISE_TYPE_LABELS[ex.exercise_type as keyof typeof EXERCISE_TYPE_LABELS]}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onEdit(ex)}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
          aria-label="Editar"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          onClick={() => onToggle(ex)}
          disabled={togglingId === ex.id}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
            variant === "active"
              ? "bg-green-600/20 text-green-400 hover:bg-red-600/15 hover:text-red-400"
              : "bg-zinc-800 text-zinc-600 hover:bg-green-600/15 hover:text-green-400"
          }`}
          aria-label={variant === "active" ? "Desactivar" : "Activar"}
        >
          <Power className="size-3.5" />
        </button>
      </div>
    </div>
  )
}
