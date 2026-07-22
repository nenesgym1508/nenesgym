"use client"

import { useState, useTransition, useMemo } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, ChevronUp, ChevronDown, Plus, Trash2, BookmarkPlus,
  Copy, Eye, Loader2, X, Check, Info, CalendarPlus, Layers, Dumbbell,
  Archive, Send, Pencil,
} from "lucide-react"
import Link from "next/link"
import {
  updateClassAction,
  deleteClassAction,
  addBlockAction,
  updateBlockTitleAction,
  deleteBlockAction,
  moveBlockAction,
  addExerciseToBlockAction,
  removeExerciseFromBlockAction,
  moveBlockExerciseAction,
  updateBlockExerciseAction,
  duplicateClassAction,
  scaffoldStandardBlocksAction,
} from "@/actions/classes.actions"
import { saveClassAsTrainingRoutineAction } from "@/actions/training-routines.actions"
import { ExerciseForm } from "@/components/admin/exercise-form"
import { ActionMenu } from "@/components/ui/action-menu"
import { ROUTES } from "@/constants/routes"
import {
  CLASS_OBJECTIVE_LABELS,
  type DailyClassWithBlocks,
  type ClassBlock,
  type BlockExercise,
} from "@/types/class"
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  USAGE_TAG_LABELS,
  getEffectiveUsageTags,
  type Exercise,
  type MuscleGroup,
  type UsageTag,
} from "@/types/exercise"
import type { RoutineBlock, RoutineExercise } from "@/types/routine"
import type { TrainingRoutineBlock, TrainingRoutineExercise } from "@/services/training-routines.service"

interface ClassEditorProps {
  initialClass: DailyClassWithBlocks
  exercises: Exercise[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

type BalanceLevel = "Alto" | "Medio" | "Bajo"

function classBalance(cls: DailyClassWithBlocks): { group: MuscleGroup; count: number; level: BalanceLevel }[] {
  const counts = new Map<string, number>()
  for (const b of cls.blocks) {
    for (const ex of b.exercises) {
      const g = ex.exercise.muscle_group
      if (!g) continue
      counts.set(g, (counts.get(g) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([group, count]) => ({
      group: group as MuscleGroup,
      count,
      level: (count >= 3 ? "Alto" : count === 2 ? "Medio" : "Bajo") as BalanceLevel,
    }))
    .sort((a, b) => b.count - a.count)
}

const LEVEL_COLOR: Record<BalanceLevel, string> = {
  Alto: "text-green-400",
  Medio: "text-yellow-400",
  Bajo: "text-zinc-500",
}

// ─── Main Editor ─────────────────────────────────────────────────────────────

export function ClassEditor({ initialClass, exercises }: ClassEditorProps) {
  const router = useRouter()
  const [cls, setCls] = useState(initialClass)
  const [exerciseList, setExerciseList] = useState<Exercise[]>(exercises)
  const [isPending, startTransition] = useTransition()

  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null)
  const [createForBlockId, setCreateForBlockId] = useState<string | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [duplicating, setDuplicating] = useState(false)
  const [dupDateModalOpen, setDupDateModalOpen] = useState(false)
  const [dupDate, setDupDate] = useState(addDays(initialClass.class_date, 1))
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [scaffolding, setScaffolding] = useState(false)
  const [blockTitleEdit, setBlockTitleEdit] = useState<string | null>(null)
  const [blockTitleValue, setBlockTitleValue] = useState("")

  // ── Meta ──────────────────────────────────────────────────────────────────

  const handleStatusToggle = async () => {
    const newStatus = cls.status === "published" ? "draft" : "published"
    setStatusUpdating(true)
    const result = await updateClassAction(cls.id, { status: newStatus })
    setStatusUpdating(false)
    if (!result.error) setCls((prev) => ({ ...prev, status: newStatus as typeof prev.status }))
  }

  const handleArchive = async () => {
    if (!window.confirm("¿Archivar esta clase? Dejará de aparecer en el calendario activo.")) return
    setArchiving(true)
    const result = await updateClassAction(cls.id, { status: "archived" })
    setArchiving(false)
    if (!result.error) router.push(ROUTES.ADMIN_CLASES)
  }

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar esta clase de forma permanente? Esta acción no se puede deshacer.")) return
    setDeleting(true)
    const result = await deleteClassAction(cls.id)
    setDeleting(false)
    if (!result.error) router.push(ROUTES.ADMIN_CLASES)
  }

  // ── Bloques ───────────────────────────────────────────────────────────────

  const handleAddBlock = () => {
    const position = cls.blocks.length
    startTransition(async () => {
      const result = await addBlockAction(cls.id, "Bloque", position)
      if (result.id) {
        setCls((prev) => ({
          ...prev,
          blocks: [...prev.blocks, { id: result.id!, daily_class_id: cls.id, title: "Bloque", position, exercises: [] }],
        }))
      }
    })
  }

  const handleScaffold = async () => {
    setScaffolding(true)
    const result = await scaffoldStandardBlocksAction(cls.id)
    setScaffolding(false)
    if ("blocks" in result && result.blocks) {
      setCls((prev) => ({
        ...prev,
        blocks: result.blocks!.map((b) => ({ ...b, daily_class_id: cls.id, exercises: [] })),
      }))
    }
  }

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      await deleteBlockAction(blockId, cls.id)
      setCls((prev) => ({
        ...prev,
        blocks: prev.blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, position: i })),
      }))
    })
  }

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    startTransition(async () => {
      await moveBlockAction(blockId, cls.id, direction)
      setCls((prev) => {
        const blocks = [...prev.blocks]
        const idx = blocks.findIndex((b) => b.id === blockId)
        const swapIdx = direction === "up" ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= blocks.length) return prev
        ;[blocks[idx], blocks[swapIdx]] = [blocks[swapIdx]!, blocks[idx]!]
        return { ...prev, blocks: blocks.map((b, i) => ({ ...b, position: i })) }
      })
    })
  }

  const handleSaveBlockTitle = async (blockId: string) => {
    const title = blockTitleValue.trim()
    if (!title) return
    await updateBlockTitleAction(blockId, cls.id, title)
    setCls((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === blockId ? { ...b, title } : b)),
    }))
    setBlockTitleEdit(null)
  }

  // ── Ejercicios ────────────────────────────────────────────────────────────

  const handleAddExercise = (blockId: string, exercise: Exercise, overrides?: { sets: number; reps: number; rest_seconds: number }) => {
    const block = cls.blocks.find((b) => b.id === blockId)
    if (!block) return
    const position = block.exercises.length
    startTransition(async () => {
      await addExerciseToBlockAction(blockId, cls.id, {
        exercise_id: exercise.id,
        position,
        sets: overrides?.sets ?? 3,
        reps: overrides?.reps ?? 12,
        rest_seconds: overrides?.rest_seconds ?? 60,
      })
      const newEx: BlockExercise = {
        id: crypto.randomUUID(),
        block_id: blockId,
        exercise_id: exercise.id,
        position,
        sets: overrides?.sets ?? 3,
        reps: overrides?.reps ?? 12,
        duration_seconds: null,
        rest_seconds: overrides?.rest_seconds ?? 60,
        suggested_weight: null,
        notes: null,
        exercise: {
          id: exercise.id,
          name: exercise.name,
          muscle_group: exercise.muscle_group,
          exercise_type: exercise.exercise_type,
          equipment: exercise.equipment,
          secondary_muscle_groups: exercise.secondary_muscle_groups,
          media_url: exercise.media_url,
          instructions: exercise.instructions,
        },
      }
      setCls((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId ? { ...b, exercises: [...b.exercises, newEx] } : b
        ),
      }))
    })
  }

  const handleRemoveExercise = (exId: string, blockId: string) => {
    startTransition(async () => {
      await removeExerciseFromBlockAction(exId, cls.id)
      setCls((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId
            ? { ...b, exercises: b.exercises.filter((e) => e.id !== exId).map((e, i) => ({ ...e, position: i })) }
            : b
        ),
      }))
    })
  }

  const handleMoveExercise = (exId: string, blockId: string, direction: "up" | "down") => {
    startTransition(async () => {
      await moveBlockExerciseAction(exId, blockId, cls.id, direction)
      setCls((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) => {
          if (b.id !== blockId) return b
          const exs = [...b.exercises]
          const idx = exs.findIndex((e) => e.id === exId)
          const swapIdx = direction === "up" ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= exs.length) return b
          ;[exs[idx], exs[swapIdx]] = [exs[swapIdx]!, exs[idx]!]
          return { ...b, exercises: exs.map((e, i) => ({ ...e, position: i })) }
        }),
      }))
    })
  }

  const handleUpdateExerciseField = (
    exId: string,
    blockId: string,
    field: string,
    value: string | number | null
  ) => {
    startTransition(async () => {
      await updateBlockExerciseAction(exId, cls.id, { [field]: value ?? undefined })
      setCls((prev) => ({
        ...prev,
        blocks: prev.blocks.map((b) =>
          b.id === blockId
            ? { ...b, exercises: b.exercises.map((e) => (e.id === exId ? { ...e, [field]: value } : e)) }
            : b
        ),
      }))
    })
  }

  // ── Picker / crear ejercicio ──────────────────────────────────────────────

  const openCreateExercise = () => {
    setCreateForBlockId(pickerBlockId)
    setPickerBlockId(null)
  }

  const handleExerciseCreated = (ex: Exercise) => {
    setExerciseList((prev) => [ex, ...prev])
    if (createForBlockId) handleAddExercise(createForBlockId, ex)
    setCreateForBlockId(null)
  }

  // ── Duplicar ──────────────────────────────────────────────────────────────

  const runDuplicate = async (targetDate: string) => {
    setDuplicating(true)
    const result = await duplicateClassAction(cls.id, targetDate)
    setDuplicating(false)
    if (result.id) router.push(`/admin/clases/${result.id}`)
  }

  // ── Plantilla ─────────────────────────────────────────────────────────────

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return
    setSavingTemplate(true)
    await saveClassAsTrainingRoutineAction(cls.id, templateName.trim())
    setSavingTemplate(false)
    setTemplateModalOpen(false)
    setTemplateName("")
  }

  const totalExercises = cls.blocks.reduce((sum, b) => sum + b.exercises.length, 0)
  const balance = useMemo(() => classBalance(cls), [cls.blocks])

  return (
    <div className="pb-36">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-white/8 px-4 sticky top-0 bg-zinc-950 z-10">
        <Link href={ROUTES.ADMIN_CLASES} className="text-zinc-400 hover:text-zinc-100">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{cls.title}</p>
          <p className="text-[11px] text-zinc-500">
            {new Date(cls.class_date + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
            {cls.objective ? ` · ${CLASS_OBJECTIVE_LABELS[cls.objective]}` : ""}
            {totalExercises > 0 ? ` · ${totalExercises} ejercicios` : ""}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-zinc-600 shrink-0">
          {isPending ? (
            <><Loader2 className="size-3 animate-spin" /> Guardando…</>
          ) : (
            <><Check className="size-3" /> Guardado</>
          )}
        </div>
        <button
          onClick={handleStatusToggle}
          disabled={statusUpdating}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 disabled:opacity-60 ${
            cls.status === "published"
              ? "bg-green-600/15 text-green-400 hover:bg-red-600/10 hover:text-red-400"
              : "bg-red-600 text-white hover:bg-red-700"
          }`}
          aria-label={cls.status === "published" ? "Volver a borrador" : "Publicar clase"}
        >
          {statusUpdating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : cls.status === "published" ? (
            <><Eye className="size-3.5" /> Publicada</>
          ) : (
            <><Send className="size-3.5" /> Publicar</>
          )}
        </button>
        <ActionMenu
          items={[
            {
              label: "Guardar en biblioteca de rutinas",
              icon: <BookmarkPlus className="size-4" />,
              onClick: () => setTemplateModalOpen(true),
            },
            {
              label: "Duplicar para mañana",
              icon: <Copy className="size-4" />,
              onClick: () => runDuplicate(addDays(cls.class_date, 1)),
              disabled: duplicating,
            },
            {
              label: "Duplicar para otra fecha",
              icon: <CalendarPlus className="size-4" />,
              onClick: () => { setDupDate(addDays(cls.class_date, 1)); setDupDateModalOpen(true) },
              disabled: duplicating,
            },
            {
              label: "Archivar",
              icon: <Archive className="size-4" />,
              onClick: handleArchive,
              disabled: archiving,
            },
            {
              label: "Eliminar",
              icon: <Trash2 className="size-4" />,
              onClick: handleDelete,
              destructive: true,
              disabled: deleting,
            },
          ]}
        />
      </header>

      <div className="p-4 space-y-4">
        {/* Enfoque de la clase (balance muscular) */}
        {balance.length > 0 && (
          <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
              Enfoque de la clase
            </p>
            <div className="space-y-1">
              {balance.map((b) => (
                <div key={b.group} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{MUSCLE_GROUP_LABELS[b.group]}</span>
                  <span className={`text-xs font-semibold ${LEVEL_COLOR[b.level]}`}>{b.level}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bloques */}
        {cls.blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-10 text-center px-4">
            <p className="text-sm text-zinc-500">Esta clase no tiene bloques.</p>
            <button
              onClick={handleScaffold}
              disabled={scaffolding}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {scaffolding ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
              Usar estructura básica
            </button>
            <p className="text-[11px] text-zinc-600">
              Crea Calentamiento, Trabajo principal, Complementarios, Abdomen/cardio y Estiramiento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {cls.blocks.map((block, blockIdx) => (
              <BlockCard
                key={block.id}
                block={block}
                isFirst={blockIdx === 0}
                isLast={blockIdx === cls.blocks.length - 1}
                isPending={isPending}
                editingTitle={blockTitleEdit === block.id}
                editTitleValue={blockTitleValue}
                onStartEditTitle={() => {
                  setBlockTitleEdit(block.id)
                  setBlockTitleValue(block.title)
                }}
                onChangeTitleValue={setBlockTitleValue}
                onSaveTitle={() => handleSaveBlockTitle(block.id)}
                onCancelTitle={() => setBlockTitleEdit(null)}
                onMoveUp={() => handleMoveBlock(block.id, "up")}
                onMoveDown={() => handleMoveBlock(block.id, "down")}
                onDelete={() => handleDeleteBlock(block.id)}
                onOpenPicker={() => setPickerBlockId(block.id)}
                onMoveExercise={(exId, dir) => handleMoveExercise(exId, block.id, dir)}
                onRemoveExercise={(exId) => handleRemoveExercise(exId, block.id)}
                onUpdateExercise={(exId, field, val) => handleUpdateExerciseField(exId, block.id, field, val)}
              />
            ))}
          </div>
        )}

        <button
          onClick={handleAddBlock}
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-sm text-zinc-500 hover:border-red-600/40 hover:text-red-400 transition-colors"
        >
          <Plus className="size-4" />
          Añadir bloque
        </button>
      </div>

      {/* Barra inferior: confirmar y salir del editor */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 md:backdrop-blur-md p-4">
        <button
          onClick={() => router.push(ROUTES.ADMIN_CLASES)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors"
        >
          <Check className="size-4" />
          Listo
        </button>
      </div>

      {/* Exercise Picker Modal */}
      {pickerBlockId && (
        <ExercisePicker
          exercises={exerciseList}
          onSelectMultiple={(selections) => {
            selections.forEach(sel => handleAddExercise(pickerBlockId, sel.exercise, sel.overrides))
            setPickerBlockId(null)
          }}
          onClose={() => setPickerBlockId(null)}
          onCreateNew={openCreateExercise}
          existingIds={cls.blocks.find((b) => b.id === pickerBlockId)?.exercises.map((e) => e.exercise_id) ?? []}
        />
      )}

      {/* Crear ejercicio (desde picker) */}
      {createForBlockId && (
        <ExerciseForm
          onSuccess={handleExerciseCreated}
          onClose={() => setCreateForBlockId(null)}
        />
      )}

      {/* Duplicar para otra fecha */}
      {dupDateModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 md:backdrop-blur-sm"
          onClick={() => setDupDateModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100">Duplicar para otra fecha</h3>
              <button onClick={() => setDupDateModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>
            <input
              type="date"
              value={dupDate}
              onChange={(e) => setDupDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50 mb-4"
            />
            <button
              onClick={() => { setDupDateModalOpen(false); runDuplicate(dupDate) }}
              disabled={duplicating || !dupDate}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {duplicating ? <Loader2 className="size-4 animate-spin" /> : <><Copy className="size-4" /> Duplicar clase</>}
            </button>
          </div>
        </div>
      )}

      {/* Save as Template Modal */}
      {templateModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 md:backdrop-blur-sm"
          onClick={() => setTemplateModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100">Guardar en biblioteca de rutinas</h3>
              <button onClick={() => setTemplateModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nombre de la rutina"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50 mb-4"
            />
            <button
              onClick={handleSaveAsTemplate}
              disabled={savingTemplate || !templateName.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {savingTemplate ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Guardar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

export interface BlockCardProps {
  block: ClassBlock | RoutineBlock | TrainingRoutineBlock
  isFirst: boolean
  isLast: boolean
  isPending: boolean
  editingTitle?: boolean
  editTitleValue?: string
  readOnly?: boolean
  onStartEditTitle?: () => void
  onChangeTitleValue?: (v: string) => void
  onSaveTitle?: () => void
  onCancelTitle?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onDelete?: () => void
  onOpenPicker?: () => void
  onMoveExercise?: (exId: string, dir: "up" | "down") => void
  onRemoveExercise?: (exId: string) => void
  onUpdateExercise?: (exId: string, field: string, val: string | number | null) => void
}

export function BlockCard({
  block, isFirst, isLast, isPending,
  editingTitle = false, editTitleValue = "",
  readOnly = false,
  onStartEditTitle, onChangeTitleValue, onSaveTitle, onCancelTitle,
  onMoveUp, onMoveDown, onDelete, onOpenPicker,
  onMoveExercise, onRemoveExercise, onUpdateExercise,
}: BlockCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
      {/* Block header */}
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
        {!readOnly && (
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={onMoveUp}
              disabled={isFirst || isPending}
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast || isPending}
              className="flex h-5 w-5 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-30"
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        )}

        {editingTitle && !readOnly ? (
          <div className="flex flex-1 items-center gap-1.5">
            <input
              autoFocus
              type="text"
              value={editTitleValue}
              onChange={(e) => onChangeTitleValue?.(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") onSaveTitle?.(); if (e.key === "Escape") onCancelTitle?.() }}
              className="flex-1 rounded-md border border-red-600/50 bg-zinc-800 px-2 py-1 text-sm text-zinc-100 outline-none"
            />
            <button onClick={onSaveTitle} className="text-green-400 hover:text-green-300"><Check className="size-3.5" /></button>
            <button onClick={onCancelTitle} className="text-zinc-500 hover:text-zinc-300"><X className="size-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={onStartEditTitle}
            disabled={readOnly}
            className="flex flex-1 items-center gap-1.5 text-left text-sm font-semibold text-zinc-200 hover:text-red-400 transition-colors disabled:hover:text-zinc-200"
          >
            {block.title}
            {!readOnly && <Pencil className="size-3 text-zinc-600" />}
          </button>
        )}

        {!readOnly && (
          <button
            onClick={onDelete}
            disabled={isPending}
            className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:text-red-400 transition-colors shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>

      {/* Exercises */}
      <div className="divide-y divide-white/5">
        {block.exercises.map((ex: any, exIdx: number) => (
          <ExerciseRow
            key={ex.id}
            ex={ex}
            isFirst={exIdx === 0}
            isLast={exIdx === block.exercises.length - 1}
            isPending={isPending}
            readOnly={readOnly}
            onMoveUp={() => onMoveExercise?.(ex.id, "up")}
            onMoveDown={() => onMoveExercise?.(ex.id, "down")}
            onRemove={() => onRemoveExercise?.(ex.id)}
            onUpdate={(field, val) => onUpdateExercise?.(ex.id, field, val)}
          />
        ))}
      </div>

      {/* Add exercise */}
      {!readOnly && (
        <button
          onClick={onOpenPicker}
          className="flex w-full items-center justify-center gap-1.5 border-t border-white/5 py-2.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-zinc-800/40 transition-colors"
        >
          <Plus className="size-3.5" />
          Añadir ejercicio
        </button>
      )}
    </div>
  )
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

export interface ExerciseRowProps {
  ex: BlockExercise | RoutineExercise | TrainingRoutineExercise
  isFirst: boolean
  isLast: boolean
  isPending: boolean
  readOnly?: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onRemove?: () => void
  onUpdate?: (field: string, val: string | number | null) => void
}

export function ExerciseRow({ ex, isFirst, isLast, isPending, readOnly = false, onMoveUp, onMoveDown, onRemove, onUpdate }: ExerciseRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const muscleLabel = ex.exercise.muscle_group
    ? MUSCLE_GROUP_LABELS[ex.exercise.muscle_group as keyof typeof MUSCLE_GROUP_LABELS] ?? ex.exercise.muscle_group
    : null
  const equipmentLabel = ex.exercise.equipment
    ? EQUIPMENT_LABELS[ex.exercise.equipment as keyof typeof EQUIPMENT_LABELS] ?? ex.exercise.equipment
    : null

  const summaryParts: string[] = []
  if (ex.sets != null && ex.reps != null) summaryParts.push(`${ex.sets} x ${ex.reps}`)
  else if (ex.sets != null) summaryParts.push(`${ex.sets} series`)
  else if (ex.reps != null) summaryParts.push(`${ex.reps} reps`)
  if (ex.duration_seconds != null) summaryParts.push(`${ex.duration_seconds}s`)
  if (ex.rest_seconds != null) summaryParts.push(`Descanso ${ex.rest_seconds}s`)
  if (ex.suggested_weight) summaryParts.push(ex.suggested_weight)

  return (
    <div className="px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        {ex.exercise.media_url ? (
          ex.exercise.media_url.includes("supabase.co") ? (
            <Image
              src={ex.exercise.media_url}
              alt={ex.exercise.name}
              width={36}
              height={36}
              sizes="36px"
              className="size-9 shrink-0 rounded-md object-cover bg-zinc-800"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none" }}
            />
          ) : (
            <img
              src={ex.exercise.media_url}
              alt={ex.exercise.name}
              loading="lazy"
              className="size-9 shrink-0 rounded-md object-cover bg-zinc-800"
              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none" }}
            />
          )
        ) : (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-600">
            <Dumbbell className="size-4" />
          </div>
        )}

        <button
          onClick={() => setShowDetails(true)}
          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <p className="text-sm font-medium text-zinc-200 leading-snug truncate">{ex.exercise.name}</p>
          <p className="text-[11px] text-zinc-500 truncate">
            {[muscleLabel, equipmentLabel].filter(Boolean).join(" · ") || "Sin datos"}
          </p>
          {summaryParts.length > 0 && (
            <p className="text-[11px] text-zinc-400 truncate">{summaryParts.join(" · ")}</p>
          )}
        </button>

        {!readOnly && (
          <button
            onClick={() => { if (confirm(`¿Eliminar "${ex.exercise.name}" de este bloque?`)) onRemove?.() }}
            disabled={isPending}
            className="shrink-0 text-zinc-600 hover:text-red-400 transition-colors disabled:opacity-30"
            aria-label="Eliminar ejercicio"
          >
            <Trash2 className="size-4" />
          </button>
        )}

        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors"
          aria-label={expanded ? "Cerrar detalle" : "Ver detalle"}
        >
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {expanded && !readOnly && (
        <div className="mt-3 space-y-3">

            <div>
              <div className="flex gap-1 mb-2">
                <button onClick={onMoveUp} disabled={isFirst || isPending} className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
                  <ChevronUp className="size-3.5" />
                </button>
                <button onClick={onMoveDown} disabled={isLast || isPending} className="flex h-6 w-6 items-center justify-center rounded text-zinc-600 hover:text-zinc-300 disabled:opacity-20">
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <NumField label="Series" value={ex.sets} onChange={(v) => onUpdate?.("sets", v)} />
                <NumField label="Reps" value={ex.reps} onChange={(v) => onUpdate?.("reps", v)} />
                <NumField label="Seg" value={ex.duration_seconds} onChange={(v) => onUpdate?.("duration_seconds", v)} />
                <NumField label="Desc" value={ex.rest_seconds} onChange={(v) => onUpdate?.("rest_seconds", v)} />
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <TextField label="Peso sugerido" value={ex.suggested_weight} placeholder="20 kg" onChange={(v) => onUpdate?.("suggested_weight", v)} />
                <TextField label="Nota" value={ex.notes} placeholder="Opcional" onChange={(v) => onUpdate?.("notes", v)} />
              </div>
            </div>
        </div>
      )}

      {showDetails && (
        <ExerciseDetailSheet
          exercise={ex.exercise as Exercise}
          onClose={() => setShowDetails(false)}
          onAdd={() => {}}
          alreadyIn={true}
        />
      )}
    </div>
  )
}



export function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <div className="space-y-0.5">
      <label className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">{label}</label>
      <input
        type="number"
        min={1}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        onBlur={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
        className="w-full rounded-md border border-white/8 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 text-center outline-none focus:border-red-600/50"
      />
    </div>
  )
}

export function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string | null
  placeholder?: string
  onChange: (v: string | null) => void
}) {
  const [local, setLocal] = useState(value ?? "")
  return (
    <div className="space-y-0.5">
      <label className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">{label}</label>
      <input
        type="text"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => onChange(local.trim() ? local.trim() : null)}
        className="w-full rounded-md border border-white/8 bg-zinc-800 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-red-600/50 placeholder-zinc-600"
      />
    </div>
  )
}

// ─── Exercise Picker ──────────────────────────────────────────────────────────

export interface ExercisePickerProps {
  exercises: Exercise[]
  existingIds: string[]
  onSelect?: (exercise: Exercise, overrides?: { sets: number; reps: number; rest_seconds: number }) => void
  onSelectMultiple?: (selections: { exercise: Exercise; overrides?: { sets: number; reps: number; rest_seconds: number } }[]) => void
  onClose: () => void
  onCreateNew?: () => void
  quickConfigDefaults?: { sets: number; reps: number; rest_seconds: number }
  myExerciseIds?: string[]
  simplifiedUsage?: boolean
}

// Chips primarios curados (no derivados de los datos) para mantener el picker
// simple — el resto de músculos sigue disponible vía el ejercicio en sí, no
// como filtro rápido. "Uso" filtra por Exercise.usage_tags.
const PRIMARY_MUSCLE_OPTIONS: MuscleGroup[] = ["pecho", "espalda", "pierna", "gluteo", "cardio"]
const USAGE_OPTIONS: UsageTag[] = ["calentamiento", "trabajo_principal", "complementario", "estiramiento"]
const SIMPLIFIED_USAGE_OPTIONS: UsageTag[] = ["calentamiento", "trabajo_principal", "estiramiento"]

const HIDE_SCROLLBAR = "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"

export function ExercisePicker({ exercises, existingIds, onSelect, onSelectMultiple, onClose, onCreateNew, quickConfigDefaults, myExerciseIds, simplifiedUsage = false }: ExercisePickerProps) {
  const hasScopeToggle = !!myExerciseIds
  const [scope, setScope] = useState<"mine" | "all">("all")
  const [search, setSearch] = useState("")
  const [filterGroup, setFilterGroup] = useState("")
  const [filterUsage, setFilterUsage] = useState("")
  const [filterEquipment, setFilterEquipment] = useState("")
  const [filterType, setFilterType] = useState("")
  const [filtersOpen, setFiltersOpen] = useState(false)
  
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  
  // Selección múltiple
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([])
  const [showMultiConfig, setShowMultiConfig] = useState(false)
  const [multiConfigs, setMultiConfigs] = useState<Record<string, { sets: number, reps: number, rest_seconds: number }>>({})


  const scopedExercises = useMemo(
    () => (!hasScopeToggle || scope === "all" ? exercises : exercises.filter((ex) => myExerciseIds!.includes(ex.id))),
    [exercises, hasScopeToggle, scope, myExerciseIds]
  )

  const filtered = useMemo(() => scopedExercises.filter((ex) => {
    if (filterGroup && ex.muscle_group !== filterGroup) return false
    if (filterUsage) {
      const tags = getEffectiveUsageTags(ex)
      const matchesUsage = simplifiedUsage && filterUsage === "trabajo_principal"
        ? tags.includes("trabajo_principal") || tags.includes("complementario")
        : tags.includes(filterUsage as UsageTag)
      if (!matchesUsage) return false
    }
    if (filterEquipment && ex.equipment !== filterEquipment) return false
    if (filterType && ex.exercise_type !== filterType) return false
    if (search.trim() && !ex.name.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  }), [scopedExercises, filterGroup, filterUsage, filterEquipment, filterType, search, simplifiedUsage])

  const { equipments, types } = useMemo(() => ({
    equipments: [...new Set(scopedExercises.filter((e) => e.equipment).map((e) => e.equipment!))],
    types:      [...new Set(scopedExercises.filter((e) => e.exercise_type).map((e) => e.exercise_type!))],
  }), [scopedExercises])

  const activeSecondaryFilters = (filterEquipment ? 1 : 0) + (filterType ? 1 : 0)

  const handleToggleSelect = (ex: Exercise) => {
    setDetailExercise(null)
    setSelectedExercises(prev => {
      const isSelected = prev.some(p => p.id === ex.id)
      if (isSelected) {
        const next = prev.filter(p => p.id !== ex.id)
        if (next.length === 0) setTimeout(() => setShowMultiConfig(false), 0)
        return next
      }
      
      // Initialize config for new selection
      if (quickConfigDefaults) {
        setMultiConfigs(configs => ({
          ...configs,
          [ex.id]: { sets: quickConfigDefaults.sets, reps: quickConfigDefaults.reps, rest_seconds: quickConfigDefaults.rest_seconds }
        }))
      }
      return [...prev, ex]
    })
  }

  const handleUpdateConfig = (exId: string, field: string, val: number | null) => {
    setMultiConfigs(prev => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        [field]: val ?? 0
      }
    }))
  }

  const handleConfirmMulti = () => {
    const selections = selectedExercises.map(ex => ({
      exercise: ex,
      overrides: multiConfigs[ex.id]
    }))
    if (onSelectMultiple) {
      onSelectMultiple(selections)
    } else if (onSelect) {
      selections.forEach(sel => onSelect(sel.exercise, sel.overrides))
    }
    setShowMultiConfig(false)
    setSelectedExercises([])
  }

  const handleAddDirect = (ex: Exercise) => {
    if (onSelectMultiple) {
      onSelectMultiple([{ exercise: ex }])
    } else if (onSelect) {
      onSelect(ex)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 md:backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl md:rounded-2xl border border-white/10 bg-zinc-900 flex flex-col h-[100dvh] md:h-[80vh] md:max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {showMultiConfig ? (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0">
              <p className="text-sm font-bold text-zinc-100">Configuración rápida</p>
              <button onClick={() => setShowMultiConfig(false)} className="text-zinc-500 hover:text-zinc-300"><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {selectedExercises.map((ex) => (
                <div key={ex.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setDetailExercise(ex)}
                      className="flex flex-1 items-center gap-3 text-left hover:opacity-80 transition-opacity min-w-0"
                    >
                      {ex.media_url ? (
                        <img
                          src={ex.media_url}
                          alt=""
                          loading="lazy"
                          width={36}
                          height={36}
                          className="size-9 rounded-lg object-cover bg-zinc-800 shrink-0"
                          onError={(e) => { e.currentTarget.style.display = "none" }}
                        />
                      ) : (
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-600">
                          <Dumbbell className="size-4" />
                        </div>
                      )}
                      <p className="text-sm font-semibold text-zinc-100 leading-snug truncate">{ex.name}</p>
                    </button>
                    <button
                      onClick={() => handleToggleSelect(ex)}
                      className="shrink-0 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 rounded-md transition-colors mt-0.5"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="Series" value={multiConfigs[ex.id]?.sets} onChange={(v) => handleUpdateConfig(ex.id, "sets", v)} />
                    <NumField label="Reps" value={multiConfigs[ex.id]?.reps} onChange={(v) => handleUpdateConfig(ex.id, "reps", v)} />
                    <NumField label="Descanso (s)" value={multiConfigs[ex.id]?.rest_seconds} onChange={(v) => handleUpdateConfig(ex.id, "rest_seconds", v)} />
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/8 shrink-0 bg-zinc-900/90 backdrop-blur-sm">
              <button
                onClick={handleConfirmMulti}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-lg"
              >
                <Check className="size-4" /> Confirmar ({selectedExercises.length})
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <p className="text-sm font-bold text-zinc-100">Añadir ejercicio</p>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-4" /></button>
            </div>

            <div className="px-3 py-2 space-y-2 shrink-0">
              {hasScopeToggle && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setScope("all")}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      scope === "all" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Explorar todos
                  </button>
                  <button
                    onClick={() => setScope("mine")}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      scope === "mine" ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Mis ejercicios
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                />
                <button
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors shrink-0 ${
                    filtersOpen || activeSecondaryFilters > 0
                      ? "border-red-600/50 bg-red-600/10 text-red-400"
                      : "border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  Filtros{activeSecondaryFilters > 0 ? ` (${activeSecondaryFilters})` : ""}
                </button>
                {onCreateNew && (
                  <button
                    onClick={onCreateNew}
                    className="flex items-center gap-1 rounded-lg bg-red-600 px-2.5 text-xs font-semibold text-white hover:bg-red-700 transition-colors shrink-0"
                  >
                    <Plus className="size-3.5" /> Crear
                  </button>
                )}
              </div>

              <FilterRow label="Uso" value={filterUsage} setValue={setFilterUsage} options={simplifiedUsage ? SIMPLIFIED_USAGE_OPTIONS : USAGE_OPTIONS} labels={USAGE_TAG_LABELS} />
              <FilterRow label="Músculo" value={filterGroup} setValue={setFilterGroup} options={PRIMARY_MUSCLE_OPTIONS} labels={MUSCLE_GROUP_LABELS} />

              {filtersOpen && (
                <div className="space-y-2 rounded-lg border border-white/8 bg-zinc-950/50 p-2">
                  <FilterRow label="Equipo" value={filterEquipment} setValue={setFilterEquipment} options={equipments} labels={EQUIPMENT_LABELS} />
                  <FilterRow label="Tipo" value={filterType} setValue={setFilterType} options={types} labels={EXERCISE_TYPE_LABELS} />
                </div>
              )}
            </div>

            <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {filtered.length === 0 ? (
                <div className="py-8 text-center space-y-3">
                  {hasScopeToggle && scope === "mine" && scopedExercises.length === 0 ? (
                    <>
                      <p className="text-sm text-zinc-500 px-6">
                        Aún no tienes ejercicios en tu biblioteca.
                      </p>
                      <button
                        onClick={() => setScope("all")}
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        Explora la biblioteca del gimnasio
                      </button>
                    </>
                  ) : filterUsage ? (
                    <>
                      <p className="text-sm text-zinc-500 px-6">
                        No tienes ejercicios de este tipo todavía.
                      </p>
                      <button
                        onClick={() => { setFilterUsage(""); if (hasScopeToggle) setScope("all") }}
                        className="text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        Explorar todos
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-600">Sin resultados</p>
                  )}
                  {onCreateNew && (
                    <button onClick={onCreateNew} className="text-xs font-semibold text-red-400 hover:text-red-300">
                      + Crear ejercicio nuevo
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((ex) => {
                  const alreadyIn = existingIds.includes(ex.id)
                  const isSelected = selectedExercises.some(p => p.id === ex.id)
                  const subtitle = [
                    ex.muscle_group ? MUSCLE_GROUP_LABELS[ex.muscle_group] : null,
                    ex.equipment ? EQUIPMENT_LABELS[ex.equipment] : null,
                    ex.exercise_type ? EXERCISE_TYPE_LABELS[ex.exercise_type] : null,
                  ].filter(Boolean).join(" · ")
                  return (
                    <div key={ex.id} className={`flex items-center gap-3 border-b border-white/5 px-4 py-3 ${alreadyIn ? "opacity-40" : isSelected ? "bg-red-600/5" : ""}`}>
                      <button
                        type="button"
                        onClick={() => setDetailExercise(ex)}
                        className="flex flex-1 items-center gap-3 min-w-0 text-left"
                      >
                        {ex.media_url ? (
                          ex.media_url.includes("supabase.co") ? (
                            <Image
                              src={ex.media_url}
                              alt={ex.name}
                              width={36}
                              height={36}
                              sizes="36px"
                              className="size-9 rounded-md object-cover bg-zinc-800 shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none" }}
                            />
                          ) : (
                            <img
                              src={ex.media_url}
                              alt={ex.name}
                              loading="lazy"
                              className="size-9 rounded-md object-cover bg-zinc-800 shrink-0"
                              onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none" }}
                            />
                          )
                        ) : (
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-600">
                            <Dumbbell className="size-4" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{ex.name}</p>
                          {subtitle && <p className="text-[10px] text-zinc-600 truncate">{subtitle}</p>}
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailExercise(ex)}
                        className="shrink-0 text-zinc-600 hover:text-zinc-300"
                        aria-label="Ver detalle"
                      >
                        <Info className="size-4" />
                      </button>
                      {alreadyIn ? (
                        <Check className="size-4 text-zinc-600 shrink-0" />
                      ) : isSelected ? (
                        <button type="button" onClick={() => handleToggleSelect(ex)} className="shrink-0 text-green-500 hover:text-green-400">
                          <Check className="size-5 font-bold" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => handleToggleSelect(ex)} className="shrink-0 text-zinc-500 hover:text-red-400">
                          <Plus className="size-5" />
                        </button>
                      )}
                    </div>
                  )
                })
              )}
            </div>
            
            {selectedExercises.length > 0 && (
              <div className="p-4 border-t border-white/8 shrink-0 bg-zinc-900/90 backdrop-blur-sm shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
                <button
                  onClick={() => setShowMultiConfig(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors shadow-lg"
                >
                  Configurar {selectedExercises.length} ejercicio{selectedExercises.length > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {detailExercise && (
        <ExerciseDetailSheet
          exercise={detailExercise}
          onClose={() => setDetailExercise(null)}
          onAdd={() => handleToggleSelect(detailExercise)}
          alreadyIn={existingIds.includes(detailExercise.id) || selectedExercises.some(p => p.id === detailExercise.id)}
        />
      )}
    </div>
  )
}

function ExerciseDetailSheet({
  exercise, onClose, onAdd, alreadyIn,
}: {
  exercise: Exercise
  onClose: () => void
  onAdd: () => void
  alreadyIn: boolean
}) {
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
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X className="size-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {exercise.media_url ? (
            <img
              src={exercise.media_url}
              alt=""
              className="w-full h-56 object-cover bg-zinc-800"
              onError={(e) => { e.currentTarget.style.display = "none" }}
            />
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

            {exercise.instructions && (
              <p className="text-sm text-zinc-400 whitespace-pre-line">{exercise.instructions}</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-white/8">
          {alreadyIn ? (
            <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-green-400">
              <Check className="size-4" /> Ya está en la rutina
            </div>
          ) : (
            <button
              onClick={onAdd}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="size-4" /> Añadir a la rutina
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterRow<T extends string>({
  label, value, setValue, options, labels,
}: {
  label: string
  value: string
  setValue: (v: string) => void
  options: T[]
  labels: Record<T, string>
}) {
  if (options.length === 0) return null
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-0.5 ${HIDE_SCROLLBAR}`}>
      <span className="text-[10px] font-medium text-zinc-600 uppercase shrink-0 w-12">{label}</span>
      <button
        onClick={() => setValue("")}
        className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${value === "" ? "bg-red-600/20 text-red-400" : "bg-zinc-800 text-zinc-500"}`}
      >
        Todos
      </button>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => setValue(value === o ? "" : o)}
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors ${value === o ? "bg-red-600/20 text-red-400" : "bg-zinc-800 text-zinc-500"}`}
        >
          {labels[o] ?? o}
        </button>
      ))}
    </div>
  )
}
