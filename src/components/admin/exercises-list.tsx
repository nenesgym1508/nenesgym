"use client"

import { useState, useMemo } from "react"
import { Plus, Pencil, Star, Trash2, Search } from "lucide-react"
import { ExerciseImageThumbnail } from "@/components/ui/exercise-image-thumbnail"
import { toggleExerciseAction, deleteExerciseAction } from "@/actions/exercises.actions"
import { ExerciseForm } from "@/components/admin/exercise-form"
import { ExerciseDetailModal } from "@/components/cliente/exercise-detail-modal"
import {
  MUSCLE_GROUP_LABELS,
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type MuscleGroup,
} from "@/types/exercise"

interface ExercisesListProps {
  initialExercises: Exercise[]
}

type FavTab = "todos" | "favoritos" | "creados"

export function ExercisesList({ initialExercises }: ExercisesListProps) {
  const [exercises, setExercises] = useState(initialExercises)
  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState<MuscleGroup | "">("")
  const [favTab, setFavTab] = useState<FavTab>("todos")
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Exercise | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewTarget, setViewTarget] = useState<Exercise | null>(null)

  const filtered = useMemo(() => {
    let list = exercises
    if (favTab === "favoritos") list = list.filter((e) => e.is_active)
    // "Creados por mí": los que el admin dio de alta a mano (botón Nuevo),
    // a diferencia de los importados del catálogo base (source distinto de "manual").
    if (favTab === "creados") list = list.filter((e) => e.source === "manual")
    if (filterGroup) list = list.filter((e) => e.muscle_group === filterGroup)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((e) => e.name.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, search, filterGroup, favTab])

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

  // is_active hace de "favorito": el admin lo usa para separar los ejercicios
  // que más usa (favoritos) del resto de la biblioteca.
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

  const handleDelete = async (ex: Exercise) => {
    if (!confirm(`¿Eliminar "${ex.name}"? Esta acción no se puede deshacer.`)) return
    setDeletingId(ex.id)
    const result = await deleteExerciseAction(ex.id)
    setDeletingId(null)
    if (result.error) {
      alert(result.error)
      return
    }
    setExercises((prev) => prev.filter((e) => e.id !== ex.id))
  }

  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
  const favoritesCount = exercises.filter((e) => e.is_active).length
  const createdCount = exercises.filter((e) => e.source === "manual").length

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

        {/* Pestañas: mismo patrón visual que "Explorar todos / Mis favoritos / Creados por mí" del panel de clientes */}
        <div className="flex gap-2">
          <TabButton active={favTab === "todos"} onClick={() => setFavTab("todos")}>
            Todos ({exercises.length})
          </TabButton>
          <TabButton active={favTab === "favoritos"} onClick={() => setFavTab("favoritos")}>
            Favoritos ({favoritesCount})
          </TabButton>
          <TabButton active={favTab === "creados"} onClick={() => setFavTab("creados")}>
            Creados por mí ({createdCount})
          </TabButton>
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
            Todos
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
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/50 py-10 text-center">
          <p className="text-sm text-zinc-500">
            {exercises.length === 0
              ? "No hay ejercicios. Crea el primero."
              : favTab === "favoritos"
                ? "Aún no marcaste ejercicios como favoritos."
                : favTab === "creados"
                  ? "Aún no has creado ningún ejercicio a mano."
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
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
          {filtered.map((ex, i) => (
            <ExerciseRow
              key={ex.id}
              ex={ex}
              isLast={i === filtered.length - 1}
              togglingId={togglingId}
              deletingId={deletingId}
              onEdit={openEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onView={setViewTarget}
            />
          ))}
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

      {/* Detalle del ejercicio (imagen completa + descripción) */}
      {viewTarget && (
        <ExerciseDetailModal
          exercise={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </>
  )
}

interface ExerciseRowProps {
  ex: Exercise
  isLast: boolean
  togglingId: string | null
  deletingId: string | null
  onEdit: (ex: Exercise) => void
  onToggle: (ex: Exercise) => void
  onDelete: (ex: Exercise) => void
  onView: (ex: Exercise) => void
}

function ExerciseRow({ ex, isLast, togglingId, deletingId, onEdit, onToggle, onDelete, onView }: ExerciseRowProps) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${!isLast ? "border-b border-white/5" : ""}`}>
      <button
        onClick={() => onView(ex)}
        className="flex flex-1 items-center gap-3 min-w-0 text-left cursor-pointer"
        aria-label={`Ver detalle de ${ex.name}`}
      >
        <ExerciseImageThumbnail src={ex.media_url} alt={ex.name} className="h-10 w-10 shrink-0 rounded-lg object-cover bg-zinc-800" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-zinc-100">
            {ex.name}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-1.5">
            {ex.muscle_group && (
              <span className="text-[10px] font-medium rounded px-1.5 py-0.5 text-zinc-400 bg-zinc-800">
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
      </button>
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
            ex.is_active
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : "bg-zinc-800 text-zinc-600 hover:bg-amber-500/15 hover:text-amber-400"
          }`}
          aria-label={ex.is_active ? "Quitar de favoritos" : "Marcar como favorito"}
        >
          <Star className="size-3.5" fill={ex.is_active ? "currentColor" : "none"} />
        </button>
        <button
          onClick={() => onDelete(ex)}
          disabled={deletingId === ex.id}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 hover:bg-red-600/15 hover:text-red-400 transition-colors disabled:opacity-50"
          aria-label="Eliminar"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// Mismo componente/estilo que usa el panel de clientes para sus pestañas
// (client-exercises-manager.tsx), por consistencia visual.
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
        active ? "btn-glossy-red text-white" : "border border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  )
}
