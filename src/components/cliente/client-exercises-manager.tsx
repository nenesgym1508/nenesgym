"use client"

import { useMemo, useState, useTransition } from "react"
import { Search, Plus, Check, X, Pencil, Trash2, Dumbbell } from "lucide-react"
import {
  addToMyLibraryAction,
  removeFromMyLibraryAction,
  deleteMyExerciseAction,
} from "@/actions/exercises.actions"
import { ClientExerciseForm } from "@/components/cliente/client-exercise-form"
import { ExerciseDetailModal } from "@/components/cliente/exercise-detail-modal"
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  type Exercise,
} from "@/types/exercise"

type Tab = "mine" | "explore" | "created"

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  mine: "Estos son los ejercicios que vas a poder usar para armar tus rutinas.",
  explore: 'Todo el catálogo del gimnasio. Añade los que quieras a "Mis ejercicios" para usarlos en tus rutinas.',
  created: "Ejercicios que creaste tú mismo, solo visibles para ti.",
}

interface ClientExercisesManagerProps {
  initialLibrary: Exercise[]
  initialGymExercises: Exercise[]
  initialMyCreated: Exercise[]
}

export function ClientExercisesManager({
  initialLibrary,
  initialGymExercises,
  initialMyCreated,
}: ClientExercisesManagerProps) {
  const [library, setLibrary] = useState(initialLibrary)
  const [gymExercises] = useState(initialGymExercises)
  const [myCreated, setMyCreated] = useState(initialMyCreated)
  const [tab, setTab] = useState<Tab>("explore")
  const [search, setSearch] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Exercise | null>(null)
  const [viewTarget, setViewTarget] = useState<Exercise | null>(null)
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const libraryExerciseIds = useMemo(() => new Set(library.map((e) => e.id)), [library])

  const filteredLibrary = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? library.filter((e) => e.name.toLowerCase().includes(q)) : library
  }, [library, search])

  const filteredGym = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? gymExercises.filter((e) => e.name.toLowerCase().includes(q)) : gymExercises
  }, [gymExercises, search])

  const filteredCreated = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? myCreated.filter((e) => e.name.toLowerCase().includes(q)) : myCreated
  }, [myCreated, search])

  const handleAdd = (exerciseId: string) => {
    setPendingId(exerciseId)
    startTransition(async () => {
      const res = await addToMyLibraryAction(exerciseId)
      if (res.success) {
        const ex = gymExercises.find((e) => e.id === exerciseId)
        if (ex) setLibrary((prev) => [ex, ...prev])
      }
      setPendingId(null)
    })
  }

  const handleRemove = (exerciseId: string) => {
    setPendingId(exerciseId)
    startTransition(async () => {
      const res = await removeFromMyLibraryAction(exerciseId)
      if (res.success) {
        setLibrary((prev) => prev.filter((e) => e.id !== exerciseId))
      }
      setPendingId(null)
    })
  }

  const handleDelete = (ex: Exercise) => {
    if (!confirm(`¿Eliminar "${ex.name}"?`)) return
    setPendingId(ex.id)
    startTransition(async () => {
      const res = await deleteMyExerciseAction(ex.id)
      if (res.success) {
        setMyCreated((prev) => prev.filter((e) => e.id !== ex.id))
      }
      setPendingId(null)
    })
  }

  const openCreate = () => { setEditTarget(null); setFormOpen(true) }
  const openEdit = (ex: Exercise) => { setEditTarget(ex); setFormOpen(true) }

  const onFormSuccess = (updated: Exercise) => {
    setMyCreated((prev) => {
      const exists = prev.find((e) => e.id === updated.id)
      if (exists) return prev.map((e) => (e.id === updated.id ? updated : e))
      return [updated, ...prev]
    })
    setFormOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/20"
        />
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "explore"} onClick={() => setTab("explore")}>
          Explorar todos
        </TabButton>
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          Mis ejercicios
        </TabButton>
        <TabButton active={tab === "created"} onClick={() => setTab("created")}>
          Creados por mí
        </TabButton>
      </div>

      <p className="text-xs text-zinc-500 px-1">{TAB_DESCRIPTIONS[tab]}</p>

      {tab === "mine" && (
        filteredLibrary.length === 0 ? (
          <EmptyState
            text="Aún no has añadido ejercicios a tu biblioteca."
            subtext="Ve a Explorar todos y agrega los que quieras usar."
            actionLabel="Explorar todos"
            onAction={() => setTab("explore")}
          />
        ) : (
          <RowList>
            {filteredLibrary.map((ex) => (
              <ExerciseRowItem
                key={ex.id}
                ex={ex}
                pending={isPending && pendingId === ex.id}
                onView={setViewTarget}
                action={
                  <button
                    onClick={() => handleRemove(ex.id)}
                    disabled={isPending && pendingId === ex.id}
                    className="shrink-0 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-950/40 transition-colors"
                  >
                    Quitar
                  </button>
                }
              />
            ))}
          </RowList>
        )
      )}

      {tab === "explore" && (
        filteredGym.length === 0 ? (
          <EmptyState text="No hay ejercicios en la biblioteca del gimnasio." />
        ) : (
          <RowList>
            {filteredGym.map((ex) => {
              const alreadyIn = libraryExerciseIds.has(ex.id)
              return (
                <ExerciseRowItem
                  key={ex.id}
                  ex={ex}
                  pending={isPending && pendingId === ex.id}
                  onView={setViewTarget}
                  action={
                    alreadyIn ? (
                      <button
                        onClick={() => handleRemove(ex.id)}
                        disabled={isPending && pendingId === ex.id}
                        className="group shrink-0 flex items-center gap-1 rounded-lg bg-green-900/30 px-2.5 py-1.5 text-[11px] font-semibold text-green-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                      >
                        <Check className="size-3.5 group-hover:hidden" />
                        <X className="size-3.5 hidden group-hover:block" />
                        <span className="group-hover:hidden">Añadido</span>
                        <span className="hidden group-hover:inline">Quitar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAdd(ex.id)}
                        disabled={isPending && pendingId === ex.id}
                        className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-red-700 transition-colors"
                      >
                        + Añadir
                      </button>
                    )
                  }
                />
              )
            })}
          </RowList>
        )
      )}

      {tab === "created" && (
        <div className="space-y-3">
          <button
            onClick={openCreate}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <Plus className="size-4" />
            Crear ejercicio propio
          </button>
          {filteredCreated.length === 0 ? (
            <EmptyState text="Aún no has creado ningún ejercicio propio." />
          ) : (
            <RowList>
              {filteredCreated.map((ex) => (
                <ExerciseRowItem
                  key={ex.id}
                  ex={ex}
                  pending={isPending && pendingId === ex.id}
                  onView={setViewTarget}
                  action={
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => openEdit(ex)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                        aria-label="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ex)}
                        disabled={isPending && pendingId === ex.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-red-400 hover:bg-red-950/40 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  }
                />
              ))}
            </RowList>
          )}
        </div>
      )}

      {formOpen && (
        <ClientExerciseForm
          exercise={editTarget}
          onSuccess={onFormSuccess}
          onClose={() => setFormOpen(false)}
        />
      )}

      {viewTarget && (
        <ExerciseDetailModal
          exercise={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
        active ? "bg-red-600 text-white" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  )
}

function RowList({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 divide-y divide-white/5">
      {children}
    </div>
  )
}

function ExerciseRowItem({
  ex,
  action,
  pending,
  onView,
}: {
  ex: Exercise
  action: React.ReactNode
  pending: boolean
  onView: (ex: Exercise) => void
}) {
  const subtitle = [
    ex.muscle_group ? MUSCLE_GROUP_LABELS[ex.muscle_group] : null,
    ex.equipment ? EQUIPMENT_LABELS[ex.equipment] : null,
  ].filter(Boolean).join(" · ")

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onView(ex)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onView(ex) }}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-white/5 transition-colors ${pending ? "opacity-50" : ""}`}
    >
      {ex.media_url ? (
        <img
          src={ex.media_url}
          alt=""
          loading="lazy"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 rounded-lg object-cover bg-zinc-800"
          onError={(e) => { e.currentTarget.style.display = "none" }}
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-600">
          <Dumbbell className="size-4" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200 truncate">{ex.name}</p>
        {subtitle && <p className="text-[11px] text-zinc-500 truncate">{subtitle}</p>}
      </div>
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        {action}
      </div>
    </div>
  )
}

function EmptyState({
  text,
  subtext,
  actionLabel,
  onAction,
}: {
  text: string
  subtext?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center px-6">
      <Dumbbell className="size-8 text-zinc-700 mb-2" />
      <p className="text-xs text-zinc-500">{text}</p>
      {subtext && <p className="text-xs text-zinc-500 mt-1">{subtext}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="mt-3 text-xs text-red-500 font-semibold hover:text-red-400">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
