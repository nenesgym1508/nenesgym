"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, Plus, X, Check, Loader2, Dumbbell,
  Copy, ClipboardCopy, Archive, Trash2, Calendar, Play, User, UserPlus
} from "lucide-react"
import Link from "next/link"
import { ROUTES, adminClienteDetalle } from "@/constants/routes"
import { ActionMenu } from "@/components/ui/action-menu"
import { ChipSelect } from "@/components/ui/chip-select"
import { MarkDoneTodayBar } from "@/components/cliente/mark-done-today-bar"
import { DayTabBar } from "@/components/admin/day-tab-bar"
import { BlockCard, ExercisePicker } from "@/components/admin/class-editor"
import { ExerciseForm } from "@/components/admin/exercise-form"
import { ClientExerciseForm } from "@/components/cliente/client-exercise-form"
import {
  updateRoutineMetaAction,
  deleteRoutineAction,
  duplicateRoutineAction,
  assignRoutineToClientAction,
  addRoutineDayAction,
  updateRoutineDayAction,
  deleteRoutineDayAction,
  addRoutineBlockAction,
  updateRoutineBlockTitleAction,
  deleteRoutineBlockAction,
  moveRoutineBlockAction,
  moveRoutineDayAction,
  addExerciseToRoutineBlockAction,
  removeExerciseFromRoutineBlockAction,
  moveRoutineBlockExerciseAction,
  updateRoutineBlockExerciseAction
} from "@/actions/routines.actions"
import { saveAsTrainingRoutineAction } from "@/actions/training-routines.actions"
import {
  ROUTINE_STATUS_LABELS,
  ROUTINE_LEVEL_LABELS,
  CLIENT_ROUTINE_GOAL_LABELS,
  formatRoutineGoal,
  type ClientRoutineWithDays,
  type RoutineDay,
  type RoutineBlock,
  type RoutineStatus,
  type RoutineGoal,
  type ClientRoutineGoal,
  type RoutineLevel,
  type Weekday
} from "@/types/routine"
import type { Exercise } from "@/types/exercise"

interface RoutineEditorProps {
  initialRoutine: ClientRoutineWithDays
  exercises: Exercise[]
  variant?: "admin" | "client-own"
  clients?: { id: string; profile: { full_name: string | null } | null }[]
  isDoneToday?: boolean
  todayStr?: string
  myExerciseIds?: string[]
}

export function RoutineEditor({
  initialRoutine,
  exercises,
  variant = "admin",
  clients = [],
  isDoneToday,
  todayStr,
  myExerciseIds
}: RoutineEditorProps) {
  const router = useRouter()
  const [routine, setRoutine] = useState(initialRoutine)
  const [activeDayId, setActiveDayId] = useState<string | null>(
    initialRoutine.days[0]?.id ?? null
  )
  const [isPending, startTransition] = useTransition()

  // Modales
  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null)
  const [createForBlockId, setCreateForBlockId] = useState<string | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [blockTitleEdit, setBlockTitleEdit] = useState<string | null>(null)
  const [blockTitleValue, setBlockTitleValue] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState(routine.client_id ?? "")
  const [editMetaOpen, setEditMetaOpen] = useState(false)

  // Meta inputs
  const [metaTitle, setMetaTitle] = useState(routine.title)
  const [metaDescription, setMetaDescription] = useState(routine.description ?? "")
  const [metaGoal, setMetaGoal] = useState<RoutineGoal | "">(routine.goal ?? "")
  const [metaCustomGoal, setMetaCustomGoal] = useState(routine.custom_goal ?? "")
  const [metaLevel, setMetaLevel] = useState<RoutineLevel | "">(routine.level ?? "")
  const [metaDays, setMetaDays] = useState(routine.days_per_week?.toString() ?? "")
  const [metaNotes, setMetaNotes] = useState(routine.notes ?? "")

  const activeDay = routine.days.find((d) => d.id === activeDayId)

  // Handlers para metadatos
  const handleSaveMeta = () => {
    startTransition(async () => {
      const customGoal = metaGoal === "otro" ? metaCustomGoal.trim() || null : null
      const res = await updateRoutineMetaAction(routine.id, {
        title: metaTitle,
        description: metaDescription || null,
        goal: metaGoal ? (metaGoal as RoutineGoal) : null,
        custom_goal: customGoal,
        level: metaLevel ? (metaLevel as RoutineLevel) : null,
        days_per_week: metaDays ? parseInt(metaDays) : null,
        notes: metaNotes || null
      })
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          title: metaTitle,
          description: metaDescription || null,
          goal: metaGoal ? (metaGoal as RoutineGoal) : null,
          custom_goal: customGoal,
          level: metaLevel ? (metaLevel as RoutineLevel) : null,
          days_per_week: metaDays ? parseInt(metaDays) : null,
          notes: metaNotes || null
        }))
        setEditMetaOpen(false)
      }
    })
  }

  // Handlers para días
  const handleAddDay = () => {
    startTransition(async () => {
      const pos = routine.days.length
      const title = `Día ${pos + 1}`
      const res = await addRoutineDayAction(routine.id, title, null, pos)
      if (res.success && res.id) {
        const newDay: RoutineDay = {
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
      const res = await updateRoutineDayAction(dayId, routine.id, title, weekday)
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
      const res = await deleteRoutineDayAction(dayId, routine.id)
      if (!res.error) {
        const remaining = routine.days.filter((d) => d.id !== dayId)
        setRoutine((prev) => ({ ...prev, days: remaining }))
        if (activeDayId === dayId) {
          setActiveDayId(remaining[0]?.id ?? null)
        }
      }
    })
  }

  // Handlers para bloques
  const handleAddBlock = () => {
    if (!activeDayId) return
    startTransition(async () => {
      const pos = activeDay?.blocks.length ?? 0
      const title = `Bloque ${pos + 1}`
      const res = await addRoutineBlockAction(activeDayId, routine.id, title, pos)
      if (res.success && res.id) {
        const newBlock: RoutineBlock = {
          id: res.id,
          routine_day_id: activeDayId,
          title,
          position: pos,
          exercises: []
        }
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId ? { ...d, blocks: [...d.blocks, newBlock] } : d
          )
        }))
      }
    })
  }

  const handleSaveBlockTitle = (blockId: string, title: string) => {
    startTransition(async () => {
      const res = await updateRoutineBlockTitleAction(blockId, routine.id, title)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? {
                  ...d,
                  blocks: d.blocks.map((b) => (b.id === blockId ? { ...b, title } : b))
                }
              : d
          )
        }))
      }
    })
  }

  const handleDeleteBlock = (blockId: string) => {
    if (!confirm("¿Eliminar bloque y sus ejercicios?")) return
    startTransition(async () => {
      const res = await deleteRoutineBlockAction(blockId, routine.id)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? { ...d, blocks: d.blocks.filter((b) => b.id !== blockId) }
              : d
          )
        }))
      }
    })
  }

  // Handlers para ejercicios
  const handleAddExercise = (
    blockId: string,
    ex: Exercise,
    overrides?: { sets: number; reps: number; rest_seconds: number }
  ) => {
    startTransition(async () => {
      const block = activeDay?.blocks.find((b) => b.id === blockId)
      const pos = block?.exercises.length ?? 0
      const res = await addExerciseToRoutineBlockAction(blockId, routine.id, ex.id, pos, overrides)
      if (res.success && res.id) {
        const newEx = {
          id: res.id,
          block_id: blockId,
          exercise_id: ex.id,
          position: pos,
          sets: overrides?.sets ?? 3,
          reps: overrides?.reps ?? 10,
          duration_seconds: null,
          rest_seconds: overrides?.rest_seconds ?? null,
          suggested_weight: null,
          notes: null,
          exercise: ex
        }
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? {
                  ...d,
                  blocks: d.blocks.map((b) =>
                    b.id === blockId ? { ...b, exercises: [...b.exercises, newEx] } : b
                  )
                }
              : d
          )
        }))
      }
    })
  }

  const handleRemoveExercise = (exId: string, blockId: string) => {
    startTransition(async () => {
      const res = await removeExerciseFromRoutineBlockAction(exId, routine.id)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? {
                  ...d,
                  blocks: d.blocks.map((b) =>
                    b.id === blockId
                      ? { ...b, exercises: b.exercises.filter((ex) => ex.id !== exId) }
                      : b
                  )
                }
              : d
          )
        }))
      }
    })
  }

  const handleMoveExercise = (blockId: string, exId: string, dir: "up" | "down") => {
    const block = activeDay?.blocks.find((b) => b.id === blockId)
    if (!block) return
    const exIndex = block.exercises.findIndex((ex) => ex.id === exId)
    if (exIndex === -1) return
    const newExList = [...block.exercises]
    const targetIdx = dir === "up" ? exIndex - 1 : exIndex + 1
    if (targetIdx < 0 || targetIdx >= newExList.length) return
    const [moved] = newExList.splice(exIndex, 1)
    newExList.splice(targetIdx, 0, moved!)
    startTransition(async () => {
      await moveRoutineBlockExerciseAction(blockId, routine.id, newExList.map((x) => x.id))
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

  const handleUpdateExerciseField = (
    exId: string,
    blockId: string,
    field: string,
    val: string | number | null
  ) => {
    startTransition(async () => {
      const updates = { [field]: val }
      const res = await updateRoutineBlockExerciseAction(exId, routine.id, updates)
      if (!res.error) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDayId
              ? {
                  ...d,
                  blocks: d.blocks.map((b) =>
                    b.id === blockId
                      ? {
                          ...b,
                          exercises: b.exercises.map((ex) =>
                            ex.id === exId ? { ...ex, ...updates } : ex
                          )
                        }
                      : b
                  )
                }
              : d
          )
        }))
      }
    })
  }

  const handleSaveAsTemplate = () => {
    if (!templateName.trim()) return
    startTransition(async () => {
      const res = await saveAsTrainingRoutineAction(routine.id, templateName)
      if (!res.error) {
        setTemplateModalOpen(false)
        alert("Rutina guardada en la biblioteca con éxito.")
      } else {
        alert(res.error)
      }
    })
  }

  const handleAssign = () => {
    if (!selectedClientId) return
    startTransition(async () => {
      const res = await assignRoutineToClientAction(routine.id, selectedClientId)
      if (!res.error) {
        setAssignModalOpen(false)
        router.refresh()
      } else {
        alert(res.error)
      }
    })
  }

  const handleMoveBlock = (blockId: string, direction: "up" | "down") => {
    if (!activeDay) return
    const blocks = [...activeDay.blocks]
    const idx = blocks.findIndex((b) => b.id === blockId)
    const swapIdx = direction === "up" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= blocks.length) return

    const newBlocks = [...blocks]
    ;[newBlocks[idx], newBlocks[swapIdx]] = [newBlocks[swapIdx]!, newBlocks[idx]!]
    const orderedIds = newBlocks.map((b) => b.id)

    startTransition(async () => {
      const res = await moveRoutineBlockAction(activeDay.id, routine.id, orderedIds)
      if (res.success) {
        setRoutine((prev) => ({
          ...prev,
          days: prev.days.map((d) =>
            d.id === activeDay.id
              ? {
                  ...d,
                  blocks: newBlocks.map((b, i) => ({ ...b, position: i }))
                }
              : d
          )
        }))
      }
    })
  }

  const handleMoveDay = (dayId: string, direction: "left" | "right") => {
    const days = [...routine.days]
    const idx = days.findIndex((d) => d.id === dayId)
    const swapIdx = direction === "left" ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= days.length) return

    const newDays = [...days]
    ;[newDays[idx], newDays[swapIdx]] = [newDays[swapIdx]!, newDays[idx]!]
    const orderedIds = newDays.map((d) => d.id)

    startTransition(async () => {
      const res = await moveRoutineDayAction(routine.id, orderedIds)
      if (res.success) {
        setRoutine((prev) => ({
          ...prev,
          days: newDays.map((d, i) => ({ ...d, position: i }))
        }))
      }
    })
  }

  const stateActions = []
  if (variant === "admin") {
    if (routine.status === "active") {
      stateActions.push(
        {
          label: "Pausar rutina",
          icon: <Play className="size-4 rotate-90" />,
          onClick: () => {
            if (confirm("¿Seguro que quieres pausar esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "paused" })
                if (!res.error) setRoutine((prev) => ({ ...prev, status: "paused" }))
              })
            }
          }
        },
        {
          label: "Finalizar rutina",
          icon: <Check className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro que quieres dar por finalizada esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "completed" })
                if (!res.error) setRoutine((prev) => ({ ...prev, status: "completed" }))
              })
            }
          }
        },
        {
          label: "Archivar rutina",
          icon: <Archive className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro de archivar esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "archived" })
                if (!res.error) router.push(ROUTES.ADMIN_RUTINAS)
              })
            }
          }
        }
      )
    } else if (routine.status === "paused") {
      stateActions.push(
        {
          label: "Reactivar rutina",
          icon: <Play className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro que quieres reactivar esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "active" })
                if (!res.error) setRoutine((prev) => ({ ...prev, status: "active" }))
              })
            }
          }
        },
        {
          label: "Finalizar rutina",
          icon: <Check className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro que quieres dar por finalizada esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "completed" })
                if (!res.error) setRoutine((prev) => ({ ...prev, status: "completed" }))
              })
            }
          }
        },
        {
          label: "Archivar rutina",
          icon: <Archive className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro de archivar esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "archived" })
                if (!res.error) router.push(ROUTES.ADMIN_RUTINAS)
              })
            }
          }
        }
      )
    } else if (routine.status === "completed") {
      stateActions.push(
        {
          label: "Archivar rutina",
          icon: <Archive className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro de archivar esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "archived" })
                if (!res.error) router.push(ROUTES.ADMIN_RUTINAS)
              })
            }
          }
        },
        {
          label: "Duplicar rutina",
          icon: <Copy className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro de duplicar esta rutina?")) {
              startTransition(async () => {
                const res = await duplicateRoutineAction(routine.id)
                if (res.success && res.id) {
                  router.push(ROUTES.ADMIN_RUTINAS + `/${res.id}`)
                }
              })
            }
          }
        }
      )
    } else if (routine.status === "draft" || routine.status === "archived") {
      stateActions.push(
        {
          label: "Reactivar/Publicar rutina",
          icon: <Play className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro que quieres activar esta rutina?")) {
              startTransition(async () => {
                const res = await updateRoutineMetaAction(routine.id, { status: "active" })
                if (!res.error) setRoutine((prev) => ({ ...prev, status: "active" }))
              })
            }
          }
        }
      )
      if (routine.status === "archived") {
        stateActions.push({
          label: "Duplicar rutina",
          icon: <Copy className="size-4" />,
          onClick: () => {
            if (confirm("¿Seguro de duplicar esta rutina?")) {
              startTransition(async () => {
                const res = await duplicateRoutineAction(routine.id)
                if (res.success && res.id) {
                  router.push(ROUTES.ADMIN_RUTINAS + `/${res.id}`)
                }
              })
            }
          }
        })
      }
    }
  }

  const menuActions = [
    ...(variant === "admin"
      ? [
          ...stateActions,
          {
            label: "Cambiar cliente",
            icon: <Calendar className="size-4" />,
            onClick: () => {
              if (confirm("¿Estás seguro de que deseas cambiar el cliente asignado a esta rutina? Esto afectará el historial del cliente.")) {
                setAssignModalOpen(true)
              }
            }
          },
          ...(routine.client_id
            ? [
                {
                  label: "Ver perfil del cliente",
                  icon: <User className="size-4" />,
                  onClick: () => router.push(adminClienteDetalle(routine.client_id as string))
                },
                {
                  label: "Asignar otra rutina",
                  icon: <UserPlus className="size-4" />,
                  onClick: () => router.push(`${ROUTES.ADMIN_RUTINAS_NUEVA}?clientId=${routine.client_id}`)
                }
              ]
            : []),
          {
            label: "Guardar en biblioteca de rutinas",
            icon: <ClipboardCopy className="size-4" />,
            onClick: () => {
              setTemplateName(routine.title)
              setTemplateModalOpen(true)
            }
          },
          {
            label: "Eliminar permanentemente",
            icon: <Trash2 className="size-4" />,
            destructive: true,
            onClick: () => {
              if (confirm("¿Seguro de eliminar esta rutina permanentemente? Esta acción no se puede deshacer.")) {
                startTransition(async () => {
                  const res = await deleteRoutineAction(routine.id)
                  if (!res.error) {
                    router.push(ROUTES.ADMIN_RUTINAS)
                  }
                })
              }
            }
          }
        ]
      : [
          {
            label: "Eliminar rutina",
            icon: <Trash2 className="size-4" />,
            onClick: () => {
              if (confirm("¿Seguro de eliminar esta rutina?")) {
                startTransition(async () => {
                  const res = await deleteRoutineAction(routine.id)
                  if (!res.error) {
                    router.push(ROUTES.CLIENTE_RUTINAS)
                  }
                })
              }
            }
          }
        ])
  ]

  return (
    <div className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={variant === "admin" ? ROUTES.ADMIN_RUTINAS : ROUTES.CLIENTE_RUTINAS}
              className="rounded-lg p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">
                {routine.title}
              </h1>
              <p className="text-[10px] text-zinc-500">
                {ROUTINE_STATUS_LABELS[routine.status] || routine.status}
              </p>
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

        {/* Pestañas de día */}
        <DayTabBar
          days={routine.days}
          activeDayId={activeDayId}
          onSelectDay={setActiveDayId}
          onAddDay={handleAddDay}
          onUpdateDay={handleUpdateDay}
          onDeleteDay={handleDeleteDay}
          onMoveDay={handleMoveDay}
        />

        {/* Contenido del día activo */}
        {activeDay ? (
          <div className="space-y-4">
            {activeDay.blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <Dumbbell className="size-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Este día no tiene bloques.</p>
                <button
                  onClick={handleAddBlock}
                  className="mt-3 text-xs text-red-500 font-semibold hover:text-red-400"
                >
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
                    onUpdateExercise={(exId, field, val) =>
                      handleUpdateExerciseField(exId, block.id, field, val)
                    }
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
          <div className="text-center py-10 text-xs text-zinc-500">
            Añade un día para comenzar a estructurar la rutina.
          </div>
        )}
      </div>

      {/* Barra de Listo */}
      {variant === "admin" && (
        <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 backdrop-blur-md p-4">
          <button
            onClick={() =>
              router.push(ROUTES.ADMIN_RUTINAS)
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors"
          >
            <Check className="size-4" />
            Listo
          </button>
        </div>
      )}

      {/* Picker de ejercicio */}
      {pickerBlockId && (
        <ExercisePicker
          exercises={exercises}
          existingIds={
            activeDay?.blocks.find((b) => b.id === pickerBlockId)?.exercises.map((e) => e.exercise_id) ?? []
          }
          onSelectMultiple={(selections) => {
            selections.forEach(sel => handleAddExercise(pickerBlockId, sel.exercise, sel.overrides))
            setPickerBlockId(null)
          }}
          onClose={() => setPickerBlockId(null)}
          onCreateNew={() => setCreateForBlockId(pickerBlockId)}
          quickConfigDefaults={variant === "client-own" ? { sets: 3, reps: 12, rest_seconds: 60 } : undefined}
          myExerciseIds={variant === "client-own" ? myExerciseIds : undefined}
          simplifiedUsage={variant === "client-own"}
        />
      )}

      {/* Crear ejercicio desde picker */}
      {createForBlockId && (
        variant === "admin" ? (
          <ExerciseForm
            onSuccess={(newEx) => {
              handleAddExercise(createForBlockId, newEx)
              setCreateForBlockId(null)
            }}
            onClose={() => setCreateForBlockId(null)}
          />
        ) : (
          <ClientExerciseForm
            onSuccess={(newEx) => {
              handleAddExercise(createForBlockId, newEx)
              setCreateForBlockId(null)
            }}
            onClose={() => setCreateForBlockId(null)}
          />
        )
      )}

      {/* Modal guardar en biblioteca */}
      {templateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setTemplateModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-zinc-100">Guardar en biblioteca de rutinas</h3>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
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
              disabled={isPending || !templateName.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <><Check className="size-4" /> Guardar rutina</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Modal asignar cliente */}
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
              <h3 className="text-base font-bold text-zinc-100">Asignar a Cliente</h3>
              <button
                onClick={() => setAssignModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50 mb-4"
            >
              <option value="">Selecciona un cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.profile?.full_name ?? "Sin nombre"}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={isPending || !selectedClientId}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <><Check className="size-4" /> Asignar</>
              )}
            </button>
          </div>
        </div>
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
              <button
                onClick={() => setEditMetaOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500">Título</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Descripción</label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500">Objetivo</label>
                <div className="mt-1 space-y-2">
                  <ChipSelect
                    options={Object.entries(CLIENT_ROUTINE_GOAL_LABELS).map(([k, v]) => ({ value: k as ClientRoutineGoal, label: v }))}
                    value={metaGoal as ClientRoutineGoal | ""}
                    onChange={(v) => setMetaGoal(v)}
                  />
                  {metaGoal === "otro" && (
                    <input
                      type="text"
                      maxLength={60}
                      placeholder="Escribe tu objetivo..."
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
              disabled={isPending || !metaTitle.trim() || (metaGoal === "otro" && !metaCustomGoal.trim())}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <><Check className="size-4" /> Guardar cambios</>
              )}
            </button>
          </div>
        </div>
      )}

      {variant === "client-own" && todayStr && (
        <MarkDoneTodayBar
          routineId={routine.id}
          activeDayId={activeDayId}
          initialHasSession={!!isDoneToday}
          sessionDate={todayStr}
        />
      )}
    </div>
  )
}
