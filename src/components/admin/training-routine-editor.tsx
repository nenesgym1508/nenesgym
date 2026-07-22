"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Trash2, Check, Loader2, X, UserPlus, CalendarPlus, Copy, Archive, ArchiveRestore } from "lucide-react"
import Link from "next/link"
import {
  updateTrainingRoutineMetaAction,
  deleteTrainingRoutineAction,
  duplicateTrainingRoutineAction,
  assignTrainingRoutineToClientAction,
  scheduleTrainingRoutineAsClassAction,
  addTrainingRoutineDayAction,
  updateTrainingRoutineDayAction,
  deleteTrainingRoutineDayAction,
  moveTrainingRoutineDayAction,
  addTrainingRoutineBlockAction,
  updateTrainingRoutineBlockTitleAction,
  deleteTrainingRoutineBlockAction,
  moveTrainingRoutineBlockAction,
  addExerciseToTrainingRoutineBlockAction,
  removeExerciseFromTrainingRoutineBlockAction,
  moveTrainingRoutineBlockExerciseAction,
  updateTrainingRoutineBlockExerciseAction
} from "@/actions/training-routines.actions"
import { DayTabBar } from "@/components/admin/day-tab-bar"
import { ExerciseForm } from "@/components/admin/exercise-form"
import { BlockCard, ExercisePicker } from "@/components/admin/class-editor"
import { ActionMenu } from "@/components/ui/action-menu"
import { ChipSelect } from "@/components/ui/chip-select"
import { ROUTES, adminRutinaDetalle } from "@/constants/routes"
import {
  CLIENT_ROUTINE_GOAL_LABELS,
  ROUTINE_LEVEL_LABELS,
  formatRoutineGoal,
  type RoutineGoal,
  type ClientRoutineGoal,
  type RoutineLevel,
  type Weekday
} from "@/types/routine"
import type { Exercise } from "@/types/exercise"
import type { TrainingRoutine, TrainingRoutineDay } from "@/services/training-routines.service"

interface TrainingRoutineEditorProps {
  initialRoutine: TrainingRoutine & { days: TrainingRoutineDay[] }
  exercises: Exercise[]
  clients: { id: string; profile: { full_name: string | null } | null }[]
  scheduleReturnDate?: string
  autoOpenAssign?: boolean
  autoOpenSchedule?: boolean
}

export function TrainingRoutineEditor({ initialRoutine, exercises, clients, scheduleReturnDate, autoOpenAssign, autoOpenSchedule }: TrainingRoutineEditorProps) {
  const router = useRouter()
  const [routine, setRoutine] = useState(initialRoutine)
  const [activeDayId, setActiveDayId] = useState<string | null>(initialRoutine.days[0]?.id ?? null)
  const [isPending, startTransition] = useTransition()

  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null)
  const [createForBlockId, setCreateForBlockId] = useState<string | null>(null)
  const [blockTitleEdit, setBlockTitleEdit] = useState<string | null>(null)
  const [blockTitleValue, setBlockTitleValue] = useState("")
  const [editMetaOpen, setEditMetaOpen] = useState(false)
  const [assignModalOpen, setAssignModalOpen] = useState(!!autoOpenAssign)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(!!autoOpenSchedule || !!scheduleReturnDate)

  const [metaName, setMetaName] = useState(routine.name)
  const [metaGoal, setMetaGoal] = useState<ClientRoutineGoal | "">((routine.goal as ClientRoutineGoal) ?? "")
  const [metaCustomGoal, setMetaCustomGoal] = useState(routine.custom_goal ?? "")
  const [metaLevel, setMetaLevel] = useState<RoutineLevel | "">(routine.level ?? "")
  const [metaDays, setMetaDays] = useState(routine.days_per_week?.toString() ?? "")
  const [metaNotes, setMetaNotes] = useState(routine.notes ?? "")

  const [selectedClientId, setSelectedClientId] = useState("")
  const [scheduleDayId, setScheduleDayId] = useState(routine.days[0]?.id ?? "")
  const [scheduleDate, setScheduleDate] = useState(scheduleReturnDate ?? "")
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleNotes, setScheduleNotes] = useState("")

  const activeDay = routine.days.find((d) => d.id === activeDayId)

  const handleSaveMeta = () => {
    startTransition(async () => {
      const res = await updateTrainingRoutineMetaAction(routine.id, {
        name: metaName,
        goal: metaGoal ? (metaGoal as RoutineGoal) : null,
        custom_goal: metaGoal === "otro" ? metaCustomGoal.trim() : null,
        level: metaLevel ? metaLevel : null,
        days_per_week: metaDays ? parseInt(metaDays) : null,
        notes: metaNotes || null
      })
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          name: metaName,
          goal: metaGoal ? (metaGoal as RoutineGoal) : null,
          custom_goal: metaGoal === "otro" ? metaCustomGoal.trim() : null,
          level: metaLevel ? metaLevel : null,
          days_per_week: metaDays ? parseInt(metaDays) : null,
          notes: metaNotes || null
        }))
        setEditMetaOpen(false)
      }
    })
  }

  const handleDelete = () => {
    if (!confirm("¿Eliminar esta rutina de la biblioteca permanentemente?")) return
    startTransition(async () => {
      const res = await deleteTrainingRoutineAction(routine.id)
      if (!res.error) router.push(ROUTES.ADMIN_ENTRENAMIENTO)
    })
  }

  const handleToggleActive = () => {
    startTransition(async () => {
      const res = await updateTrainingRoutineMetaAction(routine.id, { is_active: !routine.is_active })
      if (!res.error) setRoutine((prev) => ({ ...prev, is_active: !prev.is_active }))
    })
  }

  const handleDuplicate = () => {
    startTransition(async () => {
      const res = await duplicateTrainingRoutineAction(routine.id)
      if (res.success && res.id) {
        router.push(`${ROUTES.ADMIN_RUTINAS_BIBLIOTECA}/${res.id}`)
      }
    })
  }

  const handleAssign = () => {
    if (!selectedClientId) return
    startTransition(async () => {
      const res = await assignTrainingRoutineToClientAction(routine.id, selectedClientId)
      if (res.success && res.id) {
        setAssignModalOpen(false)
        router.push(adminRutinaDetalle(res.id))
      } else {
        alert(res.error)
      }
    })
  }

  const handleSchedule = () => {
    if (!scheduleDayId || !scheduleDate) return
    startTransition(async () => {
      const res = await scheduleTrainingRoutineAsClassAction(
        routine.id,
        scheduleDayId,
        scheduleDate,
        scheduleTime || undefined,
        scheduleNotes || undefined
      )
      if (res.success) {
        setScheduleModalOpen(false)
        router.push(ROUTES.ADMIN_CLASES)
      } else {
        alert(res.error)
      }
    })
  }

  const handleAddDay = () => {
    startTransition(async () => {
      const pos = routine.days.length
      const title = `Día ${pos + 1}`
      const res = await addTrainingRoutineDayAction(routine.id, title, null, pos)
      if (res.success && res.id) {
        const newDay: TrainingRoutineDay = {
          id: res.id,
          routine_id: routine.id,
          title,
          weekday: null,
          position: pos,
          blocks: (res.blocks ?? []).map((b) => ({
            id: b.id,
            routine_day_id: res.id,
            title: b.title,
            position: b.position,
            exercises: []
          }))
        }
        setRoutine((prev) => ({ ...prev, days: [...prev.days, newDay] }))
        setActiveDayId(res.id)
      }
    })
  }

  const handleUpdateDay = (dayId: string, title: string, weekday: Weekday | null) => {
    startTransition(async () => {
      const res = await updateTrainingRoutineDayAction(dayId, routine.id, title, weekday)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) => (d.id === dayId ? { ...d, title, weekday } : d))
        }))
      }
    })
  }

  const handleDeleteDay = (dayId: string) => {
    if (!confirm("¿Seguro que quieres eliminar este día por completo?")) return
    startTransition(async () => {
      const res = await deleteTrainingRoutineDayAction(dayId, routine.id)
      if (!res.error) {
        const remaining = routine.days.filter((d) => d.id !== dayId)
        setRoutine((prev) => ({ ...prev, days: remaining }))
        if (activeDayId === dayId) setActiveDayId(remaining[0]?.id ?? null)
      }
    })
  }

  const handleMoveDay = (dayId: string, direction: "left" | "right") => {
    const idx = routine.days.findIndex((d) => d.id === dayId)
    if (idx === -1) return
    const swapIdx = direction === "left" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= routine.days.length) return
    const newDays = [...routine.days]
    ;[newDays[idx], newDays[swapIdx]] = [newDays[swapIdx]!, newDays[idx]!]
    startTransition(async () => {
      await moveTrainingRoutineDayAction(routine.id, newDays.map((d) => d.id))
      setRoutine((prev) => ({ ...prev, days: newDays }))
    })
  }

  const handleAddBlock = () => {
    if (!activeDayId) return
    startTransition(async () => {
      const pos = activeDay?.blocks.length ?? 0
      const title = `Bloque ${pos + 1}`
      const res = await addTrainingRoutineBlockAction(activeDayId, routine.id, title, pos)
      if (res.success && res.id) {
        const newBlock = { id: res.id, routine_day_id: activeDayId, title, position: pos, exercises: [] }
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) => (d.id === activeDayId ? { ...d, blocks: [...d.blocks, newBlock] } : d))
        }))
      }
    })
  }

  const handleSaveBlockTitle = (blockId: string, title: string) => {
    startTransition(async () => {
      const res = await updateTrainingRoutineBlockTitleAction(blockId, routine.id, title)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? { ...d, blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, title } : b)) }
              : d
          )
        }))
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!confirm("¿Eliminar bloque y sus ejercicios de la rutina?")) return
    startTransition(async () => {
      const res = await deleteTrainingRoutineBlockAction(blockId, routine.id)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId ? { ...d, blocks: d.blocks.filter((b) => b.id !== blockId) } : d
          )
        }))
      }
    })
  }

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    if (!activeDay) return
    const idx = activeDay.blocks.findIndex((b) => b.id === blockId)
    if (idx === -1) return
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= activeDay.blocks.length) return
    const newBlocks = [...activeDay.blocks]
    const [moved] = newBlocks.splice(idx, 1)
    newBlocks.splice(targetIdx, 0, moved!)
    startTransition(async () => {
      await moveTrainingRoutineBlockAction(activeDay.id, routine.id, newBlocks.map((b) => b.id))
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) => (d.id === activeDayId ? { ...d, blocks: newBlocks } : d))
      }))
    })
  }

  const handleAddExercise = (blockId: string, ex: Exercise, overrides?: { sets: number; reps: number; rest_seconds: number }) => {
    startTransition(async () => {
      const block = activeDay?.blocks.find((b) => b.id === blockId)
      const pos = block?.exercises.length ?? 0
      const res = await addExerciseToTrainingRoutineBlockAction(blockId, routine.id, ex.id, pos, overrides)
      if (res.success && res.id) {
        const newEx = {
          id: res.id,
          block_id: blockId,
          exercise_id: ex.id,
          position: pos,
          sets: overrides?.sets ?? 3,
          reps: overrides?.reps ?? 10,
          duration_seconds: null,
          rest_seconds: overrides?.rest_seconds ?? 60,
          suggested_weight: null,
          notes: null,
          exercise: { ...ex }
        }
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? { ...d, blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, exercises: [...b.exercises, newEx] } : b)) }
              : d
          )
        }))
      } else if (res.error) {
        alert(res.error)
      }
    })
  }

  const handleRemoveExercise = (exId: string, blockId: string) => {
    startTransition(async () => {
      const res = await removeExerciseFromTrainingRoutineBlockAction(exId, routine.id)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? { ...d, blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, exercises: b.exercises.filter((ex) => ex.id !== exId) } : b)) }
              : d
          )
        }))
      }
    })
  }

  const handleMoveExercise = (blockId: string, exId: string, direction: "up" | "down") => {
    const block = activeDay?.blocks.find((b) => b.id === blockId)
    if (!block) return
    const idx = block.exercises.findIndex((ex) => ex.id === exId)
    if (idx === -1) return
    const targetIdx = direction === "up" ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= block.exercises.length) return
    const newExList = [...block.exercises]
    const [moved] = newExList.splice(idx, 1)
    newExList.splice(targetIdx, 0, moved!)
    startTransition(async () => {
      await moveTrainingRoutineBlockExerciseAction(blockId, routine.id, newExList.map((x) => x.id))
      setRoutine((prev) => ({
        ...prev,
        days: prev.days.map((d) =>
          d.id === activeDayId
            ? { ...d, blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, exercises: newExList } : b)) }
            : d
        )
      }))
    })
  }

  const handleUpdateExerciseField = (exId: string, blockId: string, field: string, val: string | number | null) => {
    startTransition(async () => {
      const updates = { [field]: val }
      const res = await updateTrainingRoutineBlockExerciseAction(exId, routine.id, updates)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? {
                  ...d,
                  blocks: d.blocks.map((b) =>
                    b.id === blockId
                      ? { ...b, exercises: b.exercises.map((ex) => (ex.id === exId ? { ...ex, ...updates } : ex)) }
                      : b
                  )
                }
              : d
          )
        }))
      }
    })
  }

  const menuActions = [
    {
      label: "Asignar a cliente",
      icon: <UserPlus className="size-4" />,
      onClick: () => setAssignModalOpen(true)
    },
    {
      label: "Programar en clase",
      icon: <CalendarPlus className="size-4" />,
      onClick: () => setScheduleModalOpen(true)
    },
    {
      label: "Duplicar",
      icon: <Copy className="size-4" />,
      onClick: handleDuplicate
    },
    {
      label: routine.is_active ? "Archivar" : "Reactivar",
      icon: routine.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />,
      onClick: handleToggleActive
    },
    {
      label: "Eliminar",
      icon: <Trash2 className="size-4" />,
      destructive: true,
      onClick: handleDelete
    }
  ]

  return (
    <div className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      <div className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.ADMIN_ENTRENAMIENTO}
              className="rounded-lg p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">{routine.name}</h1>
              <p className="text-[10px] text-zinc-500">{routine.is_active ? "Rutina activa" : "Archivada"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditMetaOpen(true)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              Editar datos
            </button>
            <ActionMenu items={menuActions} />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-4 space-y-2">
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

        <DayTabBar
          days={routine.days}
          activeDayId={activeDayId}
          onSelectDay={setActiveDayId}
          onAddDay={handleAddDay}
          onUpdateDay={handleUpdateDay}
          onDeleteDay={handleDeleteDay}
          onMoveDay={handleMoveDay}
        />

        {activeDay ? (
          <div className="space-y-4">
            {activeDay.blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <Plus className="size-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Este día no tiene bloques.</p>
                <button onClick={handleAddBlock} className="mt-3 text-xs text-red-500 font-semibold hover:text-red-400">
                  Crear bloque
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeDay.blocks.map((block, idx) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    isFirst={idx === 0}
                    isLast={idx === activeDay.blocks.length - 1}
                    isPending={isPending}
                    onMoveUp={() => handleMoveBlock(block.id, "up")}
                    onMoveDown={() => handleMoveBlock(block.id, "down")}
                    onOpenPicker={() => setPickerBlockId(block.id)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    editingTitle={blockTitleEdit === block.id}
                    editTitleValue={blockTitleValue}
                    onStartEditTitle={() => {
                      setBlockTitleEdit(block.id)
                      setBlockTitleValue(block.title)
                    }}
                    onChangeTitleValue={setBlockTitleValue}
                    onSaveTitle={() => {
                      const title = blockTitleValue.trim()
                      if (title) handleSaveBlockTitle(block.id, title)
                      setBlockTitleEdit(null)
                    }}
                    onCancelTitle={() => setBlockTitleEdit(null)}
                    onMoveExercise={(exId, dir) => handleMoveExercise(block.id, exId, dir)}
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
        ) : (
          <div className="text-center py-10 text-xs text-zinc-500">Añade un día para comenzar a estructurar la rutina.</div>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 backdrop-blur-md p-4">
        <button
          onClick={() => router.push(ROUTES.ADMIN_ENTRENAMIENTO)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors"
        >
          <Check className="size-4" />
          Listo
        </button>
      </div>

      {pickerBlockId && (
        <ExercisePicker
          exercises={exercises}
          existingIds={activeDay?.blocks.find((b) => b.id === pickerBlockId)?.exercises.map((e) => e.exercise_id) ?? []}
          onSelectMultiple={(selections) => {
            selections.forEach(sel => handleAddExercise(pickerBlockId, sel.exercise, sel.overrides))
            setPickerBlockId(null)
          }}
          onClose={() => setPickerBlockId(null)}
          onCreateNew={() => setCreateForBlockId(pickerBlockId)}
        />
      )}

      {createForBlockId && (
        <ExerciseForm
          onSuccess={(newEx) => {
            handleAddExercise(createForBlockId, newEx)
            setCreateForBlockId(null)
          }}
          onClose={() => setCreateForBlockId(null)}
        />
      )}

      {/* Modal editar metadatos */}
      {editMetaOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setEditMetaOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-zinc-100">Editar Datos de la Rutina</h3>
              <button onClick={() => setEditMetaOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500">Nombre</label>
                <input
                  type="text"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Objetivo</label>
                <div className="mt-1 space-y-2">
                  <ChipSelect
                    options={Object.entries(CLIENT_ROUTINE_GOAL_LABELS).map(([k, v]) => ({ value: k as ClientRoutineGoal, label: v }))}
                    value={metaGoal}
                    onChange={setMetaGoal}
                  />
                  {metaGoal === "otro" && (
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="Escribe el objetivo..."
                      value={metaCustomGoal}
                      onChange={(e) => setMetaCustomGoal(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Nivel</label>
                <select
                  value={metaLevel}
                  onChange={(e) => setMetaLevel(e.target.value as RoutineLevel)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                >
                  <option value="">Ninguno</option>
                  <option value="general">General</option>
                  <option value="principiante">Principiante</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500">Días por semana</label>
                <input
                  type="number"
                  value={metaDays}
                  onChange={(e) => setMetaDays(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Notas adicionales</label>
                <textarea
                  value={metaNotes}
                  onChange={(e) => setMetaNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                />
              </div>
            </div>
            <button
              onClick={handleSaveMeta}
              disabled={isPending || !metaName.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Guardar cambios</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal asignar a cliente */}
      {assignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setAssignModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100">Asignar a cliente</h3>
              <button onClick={() => setAssignModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50 mb-4"
            >
              <option value="">Selecciona cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.profile?.full_name ?? "Sin nombre"}</option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={isPending || !selectedClientId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Asignar</>}
            </button>
          </div>
        </div>
      )}

      {/* Modal programar en clase */}
      {scheduleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setScheduleModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-zinc-100">Programar en clase</h3>
              <button onClick={() => setScheduleModalOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>
            {routine.days.length > 1 && (
              <div>
                <label className="text-xs text-zinc-500">Día de la rutina</label>
                <select
                  value={scheduleDayId}
                  onChange={(e) => setScheduleDayId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                >
                  {routine.days.map((d) => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-zinc-500">Fecha</label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Hora (opcional)</label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500">Notas (opcional)</label>
              <textarea
                value={scheduleNotes}
                onChange={(e) => setScheduleNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              />
            </div>
            <button
              onClick={handleSchedule}
              disabled={isPending || !scheduleDayId || !scheduleDate}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Programar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
