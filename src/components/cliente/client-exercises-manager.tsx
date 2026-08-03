"use client"

import { useMemo, useState, useRef, useTransition } from "react"
import Image from "next/image"
import { Search, Plus, Check, X, Pencil, Trash2, Dumbbell, ChevronLeft, ChevronRight } from "lucide-react"
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
  explore: 'Todo el catálogo del gimnasio. Añade los que quieras a "Mis favoritos" para usarlos en tus rutinas.',
  created: "Ejercicios que creaste tú mismo, solo visibles para ti.",
}

const USAGE_OPTIONS = [
  { id: "todos", label: "Todos" },
  { id: "calentamiento", label: "Calentamiento" },
  { id: "trabajo_principal", label: "Principal" },
  { id: "estiramiento", label: "Estiramiento" },
]

const MUSCLE_OPTIONS = [
  { id: "todos", label: "Todos" },
  { id: "pecho", label: "Pecho" },
  { id: "espalda", label: "Espalda" },
  { id: "pierna", label: "Pierna" },
  { id: "gluteo", label: "Glúteo" },
  { id: "hombro", label: "Hombro" },
  { id: "biceps", label: "Bícep" },
  { id: "triceps", label: "Trícep" },
  { id: "abdomen", label: "Abdomen" },
  { id: "cardio", label: "Cardio" },
]

function ScrollableChipsBar({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const amount = direction === "left" ? -180 : 180
      containerRef.current.scrollBy({ left: amount, behavior: "smooth" })
    }
  }

  return (
    <div className="flex items-center gap-1 relative">
      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 w-14 pl-1">
        {label}:
      </span>
      <button
        type="button"
        onClick={() => scroll("left")}
        className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        title="Deslizar izquierda"
      >
        <ChevronLeft className="size-4" />
      </button>
      <div
        ref={containerRef}
        className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 flex-1"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll("right")}
        className="shrink-0 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        title="Deslizar derecha"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  )
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

  const [usageFilter, setUsageFilter] = useState<string>("todos")
  const [muscleFilter, setMuscleFilter] = useState<string>("todos")

  const libraryExerciseIds = useMemo(() => new Set(library.map((e) => e.id)), [library])

  const filterExerciseList = (list: Exercise[]) => {
    const q = search.trim().toLowerCase()
    return list.filter((e) => {
      // Filtro de búsqueda por texto
      if (q && !e.name.toLowerCase().includes(q)) return false

      // Filtro por Uso
      if (usageFilter !== "todos") {
        const hasTag = e.usage_tags && e.usage_tags.includes(usageFilter as any)
        const typeMatch = e.exercise_type === usageFilter
        if (!hasTag && !typeMatch) return false
      }

      // Filtro por Músculo
      if (muscleFilter !== "todos") {
        const primaryMatch = e.muscle_group === muscleFilter
        const secondaryMatch = e.secondary_muscle_groups && e.secondary_muscle_groups.includes(muscleFilter as any)
        if (!primaryMatch && !secondaryMatch) return false
      }

      return true
    })
  }

  const filteredLibrary = useMemo(() => filterExerciseList(library), [library, search, usageFilter, muscleFilter])
  const filteredGym = useMemo(() => filterExerciseList(gymExercises), [gymExercises, search, usageFilter, muscleFilter])
  const filteredCreated = useMemo(() => filterExerciseList(myCreated), [myCreated, search, usageFilter, muscleFilter])

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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar ejercicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-[#222] bg-[#0a0a0a] py-3 pl-11 pr-4 text-sm text-white placeholder-zinc-500 outline-none focus:border-red-600/50 transition-colors"
        />
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "explore"} onClick={() => setTab("explore")}>
          Explorar todos
        </TabButton>
        <TabButton active={tab === "mine"} onClick={() => setTab("mine")}>
          Mis favoritos
        </TabButton>
        <TabButton active={tab === "created"} onClick={() => setTab("created")}>
          Creados por mí
        </TabButton>
      </div>

      {/* ── FILTROS DE SELECCIÓN RÁPIDA (CON FLECHAS MINIMALISTAS) ── */}
      <div className="space-y-2 pt-1 bg-[#0f0f10] p-3 rounded-2xl border border-white/5">
        {/* Filtro por Uso */}
        <ScrollableChipsBar label="Uso">
          {USAGE_OPTIONS.map((u) => {
            const active = usageFilter === u.id
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => setUsageFilter(u.id)}
                className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                    : "bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {u.label}
              </button>
            )
          })}
        </ScrollableChipsBar>

        {/* Filtro por Músculo */}
        <ScrollableChipsBar label="Músculo">
          {MUSCLE_OPTIONS.map((m) => {
            const active = muscleFilter === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMuscleFilter(m.id)}
                className={`shrink-0 rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-red-600 text-white shadow-[0_0_12px_rgba(220,38,38,0.4)]"
                    : "bg-zinc-900 border border-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {m.label}
              </button>
            )
          })}
        </ScrollableChipsBar>
      </div>

      <p className="text-xs text-zinc-500 px-1">{TAB_DESCRIPTIONS[tab]}</p>

      {tab === "mine" && (
        filteredLibrary.length === 0 ? (
          <EmptyState
            text="Aún no has añadido ejercicios a tus favoritos."
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
                    className="shrink-0 rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
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
          <EmptyState
            text="No se encontraron ejercicios."
            subtext="Prueba con otro término de búsqueda o crea uno personalizado."
            actionLabel="+ Crear mi propio ejercicio"
            onAction={openCreate}
          />
        ) : (
          <RowList>
            {filteredGym.map((ex) => {
              const added = libraryExerciseIds.has(ex.id)
              return (
                <ExerciseRowItem
                  key={ex.id}
                  ex={ex}
                  pending={isPending && pendingId === ex.id}
                  onView={setViewTarget}
                  action={
                    added ? (
                      <span className="shrink-0 inline-flex items-center gap-1 rounded-md border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-[11px] font-semibold text-green-400">
                        <Check className="size-3" /> Añadido
                      </span>
                    ) : (
                      <button
                        onClick={() => handleAdd(ex.id)}
                        disabled={isPending && pendingId === ex.id}
                        className="shrink-0 rounded-md btn-glossy-red px-3 py-1 text-[11px] font-semibold text-white cursor-pointer"
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
          <div className="flex justify-end">
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl btn-glossy-red px-3.5 py-2 text-xs font-semibold text-white cursor-pointer"
            >
              <Plus className="size-3.5" /> Crear ejercicio nuevo
            </button>
          </div>

          {filteredCreated.length === 0 ? (
            <EmptyState
              text="No tienes ejercicios creados por ti todavía."
              subtext="Puedes crear tus propios ejercicios personalizados si no los encuentras en el catálogo."
              actionLabel="+ Crear ejercicio nuevo"
              onAction={openCreate}
            />
          ) : (
            <RowList>
              {filteredCreated.map((ex) => (
                <ExerciseRowItem
                  key={ex.id}
                  ex={ex}
                  pending={isPending && pendingId === ex.id}
                  onView={setViewTarget}
                  action={
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(ex)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ex)}
                        disabled={isPending && pendingId === ex.id}
                        className="p-1.5 text-red-400 hover:text-red-300 transition-colors"
                        title="Eliminar"
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

      {/* Modal de Crear/Editar */}
      {formOpen && (
        <ClientExerciseForm
          exercise={editTarget}
          onSuccess={onFormSuccess}
          onClose={() => setFormOpen(false)}
        />
      )}

      {/* Modal de Detalle */}
      {viewTarget && (
        <ExerciseDetailModal
          exercise={viewTarget}
          onClose={() => setViewTarget(null)}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-full py-2.5 text-xs font-semibold transition-all cursor-pointer ${
        active
          ? "btn-glossy-red text-white shadow-lg shadow-red-600/20"
          : "border border-white/5 bg-[#121214] text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]"
      }`}
    >
      {children}
    </button>
  )
}

function EmptyState({
  text,
  subtext,
  actionLabel,
  onAction,
}: {
  text: string
  subtext: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0f0f10] p-8 text-center space-y-2">
      <p className="text-sm font-semibold text-zinc-300">{text}</p>
      <p className="text-xs text-zinc-500 max-w-sm mx-auto">{subtext}</p>
      {actionLabel && onAction && (
        <div className="pt-2">
          <button
            onClick={onAction}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-400 transition-colors cursor-pointer"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  )
}

function RowList({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>
}

function ExerciseRowItem({
  ex,
  pending,
  onView,
  action,
}: {
  ex: Exercise
  pending?: boolean
  onView: (ex: Exercise) => void
  action?: React.ReactNode
}) {
  const muscleText = ex.muscle_group ? MUSCLE_GROUP_LABELS[ex.muscle_group] : null
  const equipText = ex.equipment ? EQUIPMENT_LABELS[ex.equipment] : null
  const metaText = [muscleText, equipText].filter(Boolean).join(" · ")

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-[#0f0f10] p-3 transition-colors hover:border-white/10 ${
        pending ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      <div
        onClick={() => onView(ex)}
        className="flex flex-1 items-center gap-3 min-w-0 cursor-pointer group"
      >
        <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center">
          {ex.media_url ? (
            <Image
              src={ex.media_url}
              alt={ex.name}
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <Dumbbell className="size-5 text-zinc-600 group-hover:text-red-500 transition-colors" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bebas font-bold text-lg tracking-wide uppercase text-white truncate group-hover:text-red-400 transition-colors">
            {ex.name}
          </p>
          {metaText && <p className="text-xs text-zinc-500 truncate">{metaText}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
