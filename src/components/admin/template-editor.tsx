"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Trash2, Check, Loader2, X, PenLine } from "lucide-react"
import Link from "next/link"
import {
  updateTemplateMetaAction,
  deleteTemplateAction,
  addTemplateBlockAction,
  updateTemplateBlockTitleAction,
  deleteTemplateBlockAction,
  moveTemplateBlockAction,
  addExerciseToTemplateBlockAction,
  removeExerciseFromTemplateBlockAction,
  moveTemplateBlockExerciseAction,
  updateTemplateBlockExerciseAction,
} from "@/actions/templates.actions"
import { ExerciseForm } from "@/components/admin/exercise-form"
import { BlockCard, ExercisePicker } from "@/components/admin/class-editor"
import { ActionMenu } from "@/components/ui/action-menu"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import {
  CLASS_OBJECTIVE_LABELS,
  CLASS_LEVEL_LABELS,
  type ClassBlock,
  type BlockExercise,
  type ClassObjective,
  type ClassLevel,
} from "@/types/class"
import type { Exercise } from "@/types/exercise"
import type { ClassTemplate, TemplateBlock } from "@/services/templates.service"

interface TemplateEditorProps {
  initialTemplate: ClassTemplate & { blocks: TemplateBlock[] }
  exercises: Exercise[]
}

// Adapta la forma de plantilla (template_block_id / template_id) a la forma
// genérica ClassBlock/BlockExercise que ya consumen BlockCard/ExercisePicker.
function toBlocks(blocks: TemplateBlock[], templateId: string): ClassBlock[] {
  return blocks.map((b) => ({
    id: b.id,
    daily_class_id: templateId,
    title: b.title,
    position: b.position,
    exercises: b.exercises.map((e) => ({
      id: e.id,
      block_id: b.id,
      exercise_id: e.exercise_id,
      position: e.position,
      sets: e.sets,
      reps: e.reps,
      duration_seconds: e.duration_seconds,
      rest_seconds: e.rest_seconds,
      suggested_weight: e.suggested_weight,
      notes: e.notes,
      exercise: e.exercise,
    })),
  }))
}

export function TemplateEditor({ initialTemplate, exercises }: TemplateEditorProps) {
  const router = useRouter()
  const [tpl, setTpl] = useState(initialTemplate)
  const [blocks, setBlocks] = useState<ClassBlock[]>(() => toBlocks(initialTemplate.blocks, initialTemplate.id))
  const [exerciseList, setExerciseList] = useState<Exercise[]>(exercises)
  const [isPending, startTransition] = useTransition()

  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null)
  const [createForBlockId, setCreateForBlockId] = useState<string | null>(null)
  const [blockTitleEdit, setBlockTitleEdit] = useState<string | null>(null)
  const [blockTitleValue, setBlockTitleValue] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const totalExercises = blocks.reduce((sum, b) => sum + b.exercises.length, 0)

  // ── Meta ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar esta plantilla de forma permanente? Esta acción no se puede deshacer.")) return
    setDeleting(true)
    const result = await deleteTemplateAction(tpl.id)
    setDeleting(false)
    if (!result.error) router.push(ROUTES.ADMIN_CLASES_PLANTILLAS)
  }

  // ── Bloques ───────────────────────────────────────────────────────────────

  const handleAddBlock = () => {
    const position = blocks.length
    startTransition(async () => {
      const result = await addTemplateBlockAction(tpl.id, "Bloque", position)
      if (result.id) {
        setBlocks((prev) => [...prev, { id: result.id!, daily_class_id: tpl.id, title: "Bloque", position, exercises: [] }])
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    startTransition(async () => {
      await deleteTemplateBlockAction(blockId, tpl.id)
      setBlocks((prev) => prev.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, position: i })))
    })
  }

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    startTransition(async () => {
      await moveTemplateBlockAction(blockId, tpl.id, direction)
      setBlocks((prev) => {
        const list = [...prev]
        const idx = list.findIndex((b) => b.id === blockId)
        const swapIdx = direction === "up" ? idx - 1 : idx + 1
        if (swapIdx < 0 || swapIdx >= list.length) return prev
        ;[list[idx], list[swapIdx]] = [list[swapIdx]!, list[idx]!]
        return list.map((b, i) => ({ ...b, position: i }))
      })
    })
  }

  const handleSaveBlockTitle = async (blockId: string) => {
    const title = blockTitleValue.trim()
    if (!title) return
    await updateTemplateBlockTitleAction(blockId, tpl.id, title)
    setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, title } : b)))
    setBlockTitleEdit(null)
  }

  // ── Ejercicios ────────────────────────────────────────────────────────────

  const handleAddExercise = (blockId: string, exercise: Exercise) => {
    const block = blocks.find((b) => b.id === blockId)
    if (!block) return
    const position = block.exercises.length
    startTransition(async () => {
      await addExerciseToTemplateBlockAction(blockId, tpl.id, {
        exercise_id: exercise.id,
        position,
        sets: 3,
        reps: 12,
        rest_seconds: 60,
      })
      const newEx: BlockExercise = {
        id: crypto.randomUUID(),
        block_id: blockId,
        exercise_id: exercise.id,
        position,
        sets: 3,
        reps: 12,
        duration_seconds: null,
        rest_seconds: 60,
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
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, exercises: [...b.exercises, newEx] } : b)))
    })
  }

  const handleRemoveExercise = (exId: string, blockId: string) => {
    startTransition(async () => {
      await removeExerciseFromTemplateBlockAction(exId, tpl.id)
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, exercises: b.exercises.filter((e) => e.id !== exId).map((e, i) => ({ ...e, position: i })) }
            : b
        )
      )
    })
  }

  const handleMoveExercise = (exId: string, blockId: string, direction: "up" | "down") => {
    startTransition(async () => {
      await moveTemplateBlockExerciseAction(exId, blockId, tpl.id, direction)
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b
          const exs = [...b.exercises]
          const idx = exs.findIndex((e) => e.id === exId)
          const swapIdx = direction === "up" ? idx - 1 : idx + 1
          if (swapIdx < 0 || swapIdx >= exs.length) return b
          ;[exs[idx], exs[swapIdx]] = [exs[swapIdx]!, exs[idx]!]
          return { ...b, exercises: exs.map((e, i) => ({ ...e, position: i })) }
        })
      )
    })
  }

  const handleUpdateExerciseField = (exId: string, blockId: string, field: string, value: string | number | null) => {
    startTransition(async () => {
      await updateTemplateBlockExerciseAction(exId, tpl.id, { [field]: value ?? undefined })
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === blockId
            ? { ...b, exercises: b.exercises.map((e) => (e.id === exId ? { ...e, [field]: value } : e)) }
            : b
        )
      )
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

  return (
    <div className="pb-36">
      {/* Header */}
      <header className="flex h-14 items-center gap-3 border-b border-white/8 px-4 sticky top-0 bg-zinc-950 z-10">
        <Link href={ROUTES.ADMIN_CLASES_PLANTILLAS} className="text-zinc-400 hover:text-zinc-100">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-100 truncate">{tpl.name}</p>
          <p className="text-[11px] text-zinc-500">
            {tpl.objective ? CLASS_OBJECTIVE_LABELS[tpl.objective as ClassObjective] ?? tpl.objective : ""}
            {tpl.estimated_duration_minutes ? ` · ${tpl.estimated_duration_minutes} min` : ""}
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
        <ActionMenu
          items={[
            {
              label: "Editar detalles",
              icon: <PenLine className="size-4" />,
              onClick: () => setEditModalOpen(true),
            },
            {
              label: "Eliminar plantilla",
              icon: <Trash2 className="size-4" />,
              onClick: handleDelete,
              destructive: true,
              disabled: deleting,
            },
          ]}
        />
      </header>

      <div className="p-4 space-y-4">
        {blocks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-10 text-center px-4">
            <p className="text-sm text-zinc-500">Esta plantilla no tiene bloques.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block, blockIdx) => (
              <BlockCard
                key={block.id}
                block={block}
                isFirst={blockIdx === 0}
                isLast={blockIdx === blocks.length - 1}
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
          onClick={() => router.push(ROUTES.ADMIN_CLASES_PLANTILLAS)}
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
          onSelect={(ex) => { handleAddExercise(pickerBlockId, ex); setPickerBlockId(null) }}
          onClose={() => setPickerBlockId(null)}
          onCreateNew={openCreateExercise}
          existingIds={blocks.find((b) => b.id === pickerBlockId)?.exercises.map((e) => e.exercise_id) ?? []}
        />
      )}

      {/* Crear ejercicio (desde picker) */}
      {createForBlockId && (
        <ExerciseForm onSuccess={handleExerciseCreated} onClose={() => setCreateForBlockId(null)} />
      )}

      {/* Editar detalles de la plantilla */}
      {editModalOpen && (
        <EditTemplateModal
          template={tpl}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updated) => {
            setTpl((prev) => ({ ...prev, ...updated }))
            setEditModalOpen(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Modal: editar detalles de la plantilla ─────────────────────────────────

function EditTemplateModal({
  template,
  onClose,
  onSaved,
}: {
  template: ClassTemplate
  onClose: () => void
  onSaved: (data: Partial<ClassTemplate>) => void
}) {
  const [name, setName] = useState(template.name)
  const [objective, setObjective] = useState<ClassObjective | "">((template.objective as ClassObjective) ?? "")
  const [level, setLevel] = useState<ClassLevel | "">((template.level as ClassLevel) ?? "")
  const [duration, setDuration] = useState(template.estimated_duration_minutes ? String(template.estimated_duration_minutes) : "")
  const [notes, setNotes] = useState(template.notes ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const objectives = Object.keys(CLASS_OBJECTIVE_LABELS) as ClassObjective[]
  const levels = Object.keys(CLASS_LEVEL_LABELS) as ClassLevel[]

  const handleSubmit = async () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    setError(null)
    setLoading(true)
    const result = await updateTemplateMetaAction(template.id, {
      name,
      objective: objective || undefined,
      level: level || undefined,
      estimated_duration_minutes: duration ? parseInt(duration) : undefined,
      notes: notes || undefined,
    })
    setLoading(false)
    if (result.error) { setError(result.error); return }
    onSaved({
      name,
      objective: objective || null,
      level: level || null,
      estimated_duration_minutes: duration ? parseInt(duration) : null,
      notes: notes || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 md:backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-100">Editar plantilla</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <Input id="tpl-name" label="Nombre *" value={name} onChange={(e) => setName(e.target.value)} />

          <SelectField
            label="Objetivo"
            value={objective}
            onChange={(v) => setObjective(v as ClassObjective | "")}
            options={[{ value: "", label: "Sin especificar" }, ...objectives.map((o) => ({ value: o, label: CLASS_OBJECTIVE_LABELS[o] }))]}
          />

          <SelectField
            label="Nivel"
            value={level}
            onChange={(v) => setLevel(v as ClassLevel | "")}
            options={[{ value: "", label: "General" }, ...levels.map((l) => ({ value: l, label: CLASS_LEVEL_LABELS[l] }))]}
          />

          <SelectField
            label="Duración estimada"
            value={duration}
            onChange={setDuration}
            options={[
              { value: "", label: "Sin especificar" },
              { value: "30", label: "30 minutos" },
              { value: "45", label: "45 minutos" },
              { value: "60", label: "60 minutos" },
              { value: "75", label: "75 minutos" },
              { value: "90", label: "90 minutos" },
            ]}
          />

          <Textarea
            id="tpl-notes"
            label="Notas (opcional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="button" disabled={loading} onClick={handleSubmit} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-red-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
