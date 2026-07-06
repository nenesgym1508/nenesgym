"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Trash2, Check, Loader2, X } from "lucide-react"
import Link from "next/link"
import {
  updateRoutineTemplateMetaAction,
  deleteRoutineTemplateAction,
  addRoutineTemplateDayAction,
  updateRoutineTemplateDayAction,
  deleteRoutineTemplateDayAction,
  addRoutineTemplateBlockAction,
  updateRoutineTemplateBlockTitleAction,
  deleteRoutineTemplateBlockAction,
  moveRoutineTemplateBlockAction,
  addExerciseToRoutineTemplateBlockAction,
  removeExerciseFromRoutineTemplateBlockAction,
  moveRoutineTemplateBlockExerciseAction,
  updateRoutineTemplateBlockExerciseAction
} from "@/actions/routine-templates.actions"
import { DayTabBar } from "@/components/admin/day-tab-bar"
import { ExerciseForm } from "@/components/admin/exercise-form"
import { BlockCard, ExercisePicker } from "@/components/admin/class-editor"
import { ActionMenu } from "@/components/ui/action-menu"
import { ROUTES } from "@/constants/routes"
import { ROUTINE_GOAL_LABELS, ROUTINE_LEVEL_LABELS, type RoutineGoal, type RoutineLevel, type Weekday } from "@/types/routine"
import type { Exercise } from "@/types/exercise"
import type { RoutineTemplate, RoutineTemplateDay } from "@/services/routine-templates.service"

interface RoutineTemplateEditorProps {
  initialTemplate: RoutineTemplate & { days: RoutineTemplateDay[] }
  exercises: Exercise[]
}

export function RoutineTemplateEditor({ initialTemplate, exercises }: RoutineTemplateEditorProps) {
  const router = useRouter()
  const [tpl, setTpl] = useState(initialTemplate)
  const [activeDayId, setActiveDayId] = useState<string | null>(
    initialTemplate.days[0]?.id ?? null
  )
  const [isPending, startTransition] = useTransition()

  // Modales
  const [pickerBlockId, setPickerBlockId] = useState<string | null>(null)
  const [createForBlockId, setCreateForBlockId] = useState<string | null>(null)
  const [editMetaOpen, setEditMetaOpen] = useState(false)

  // Meta inputs
  const [metaName, setMetaName] = useState(tpl.name)
  const [metaDescription, setMetaDescription] = useState(tpl.description ?? "")
  const [metaGoal, setMetaGoal] = useState<RoutineGoal | "">(tpl.goal ?? "")
  const [metaLevel, setMetaLevel] = useState<RoutineLevel | "">(tpl.level ?? "")
  const [metaDays, setMetaDays] = useState(tpl.days_per_week?.toString() ?? "")
  const [metaNotes, setMetaNotes] = useState(tpl.notes ?? "")

  const activeDay = tpl.days.find((d) => d.id === activeDayId)

  const handleSaveMeta = () => {
    startTransition(async () => {
      const res = await updateRoutineTemplateMetaAction(tpl.id, {
        name: metaName,
        description: metaDescription || null,
        goal: metaGoal ? (metaGoal as RoutineGoal) : null,
        level: metaLevel ? (metaLevel as RoutineLevel) : null,
        days_per_week: metaDays ? parseInt(metaDays) : null,
        notes: metaNotes || null
      })
      if (!res.error) {
        setTpl((prev) => ({
          ...prev,
          name: metaName,
          description: metaDescription || null,
          goal: metaGoal ? (metaGoal as RoutineGoal) : null,
          level: metaLevel ? (metaLevel as RoutineLevel) : null,
          days_per_week: metaDays ? parseInt(metaDays) : null,
          notes: metaNotes || null
        }))
        setEditMetaOpen(false)
      }
    })
  }

  const handleDeleteTemplate = () => {
    if (!confirm("¿Eliminar esta plantilla permanentemente?")) return
    startTransition(async () => {
      const res = await deleteRoutineTemplateAction(tpl.id)
      if (!res.error) {
        router.push(ROUTES.ADMIN_RUTINAS_PLANTILLAS)
      }
    })
  }

  const handleAddDay = () => {
    startTransition(async () => {
      const pos = tpl.days.length
      const title = `Día ${pos + 1}`
      const res = await addRoutineTemplateDayAction(tpl.id, title, null, pos)
      if (res.success && res.id) {
        const newDay: RoutineTemplateDay = {
          id: res.id,
          template_id: tpl.id,
          title,
          weekday: null,
          position: pos,
          blocks: []
        }
        setTpl((prev) => ({ ...prev, days: [...prev.days, newDay] }))
        setActiveDayId(res.id)
      }
    })
  }

  const handleUpdateDay = (dayId: string, title: string, weekday: Weekday | null) => {
    startTransition(async () => {
      const res = await updateRoutineTemplateDayAction(dayId, tpl.id, title, weekday)
      if (!res.error) {
        setTpl((prev) => ({
          ...prev,
          days: prev.days.map((d) => (d.id === dayId ? { ...d, title, weekday } : d))
        }))
      }
    })
  }

  const handleDeleteDay = (dayId: string) => {
    if (!confirm("¿Seguro que quieres eliminar este día por completo?")) return
    startTransition(async () => {
      const res = await deleteRoutineTemplateDayAction(dayId, tpl.id)
      if (!res.error) {
        const remaining = tpl.days.filter((d) => d.id !== dayId)
        setTpl((prev) => ({ ...prev, days: remaining }))
        if (activeDayId === dayId) {
          setActiveDayId(remaining[0]?.id ?? null)
        }
      }
    })
  }

  const handleAddBlock = () => {
    if (!activeDayId) return
    startTransition(async () => {
      const pos = activeDay?.blocks.length ?? 0
      const title = `Bloque ${pos + 1}`
      const res = await addRoutineTemplateBlockAction(activeDayId, tpl.id, title, pos)
      if (res.success && res.id) {
        const newBlock = {
          id: res.id,
          template_day_id: activeDayId,
          title,
          position: pos,
          exercises: []
        }
        setTpl((prev) => ({
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
      const res = await updateRoutineTemplateBlockTitleAction(blockId, tpl.id, title)
      if (!res.error) {
        setTpl((prev) => ({
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
    if (!confirm("¿Eliminar bloque y sus ejercicios de la plantilla?")) return
    startTransition(async () => {
      const res = await deleteRoutineTemplateBlockAction(blockId, tpl.id)
      if (!res.error) {
        setTpl((prev) => ({
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

  const handleAddExercise = (blockId: string, ex: Exercise) => {
    startTransition(async () => {
      const block = activeDay?.blocks.find((b) => b.id === blockId)
      const pos = block?.exercises.length ?? 0
      const res = await addExerciseToRoutineTemplateBlockAction(blockId, tpl.id, ex.id, pos)
      if (res.success && res.id) {
        const newEx = {
          id: res.id,
          template_block_id: blockId,
          exercise_id: ex.id,
          position: pos,
          sets: 3,
          reps: 10,
          duration_seconds: null,
          rest_seconds: null,
          suggested_weight: null,
          notes: null,
          exercise: ex
        }
        setTpl((prev) => ({
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
      const res = await removeExerciseFromRoutineTemplateBlockAction(exId, tpl.id)
      if (!res.error) {
        setTpl((prev) => ({
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

  const handleUpdateExerciseField = (
    exId: string,
    blockId: string,
    field: string,
    val: string | number | null
  ) => {
    startTransition(async () => {
      const updates = { [field]: val }
      const res = await updateRoutineTemplateBlockExerciseAction(exId, tpl.id, updates)
      if (!res.error) {
        setTpl((prev) => ({
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

  const menuActions = [
    {
      label: "Eliminar Plantilla",
      icon: <Trash2 className="size-4" />,
      onClick: handleDeleteTemplate
    }
  ]

  return (
    <div className="min-h-screen bg-zinc-950 pb-32 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={ROUTES.ADMIN_RUTINAS_PLANTILLAS}
              className="rounded-lg p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-sm font-semibold text-zinc-200 truncate max-w-[200px]">
                {tpl.name}
              </h1>
              <p className="text-[10px] text-zinc-500">Plantilla de Rutina</p>
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
          {tpl.description && (
            <p className="text-xs text-zinc-400">{tpl.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500">
            {tpl.goal && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 border border-white/5">
                Objetivo: {tpl.goal}
              </span>
            )}
            {tpl.level && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 border border-white/5">
                Nivel: {tpl.level}
              </span>
            )}
            {tpl.days_per_week && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 border border-white/5">
                {tpl.days_per_week} días/semana
              </span>
            )}
          </div>
        </div>

        {/* Pestañas de día */}
        <DayTabBar
          days={tpl.days}
          activeDayId={activeDayId}
          onSelectDay={setActiveDayId}
          onAddDay={handleAddDay}
          onUpdateDay={handleUpdateDay}
          onDeleteDay={handleDeleteDay}
        />

        {/* Bloques del día activo */}
        {activeDay ? (
          <div className="space-y-4">
            {activeDay.blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <Plus className="size-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Este día de plantilla no tiene bloques.</p>
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
                    onOpenPicker={() => setPickerBlockId(block.id)}
                    onDelete={() => handleDeleteBlock(block.id)}
                    onStartEditTitle={() => {
                      const newTitle = prompt("Nuevo título del bloque:", block.title)
                      if (newTitle) handleSaveBlockTitle(block.id, newTitle)
                    }}
                    onMoveExercise={(exId, dir) => {
                      const exIndex = block.exercises.findIndex((ex) => ex.id === exId)
                      if (exIndex === -1) return
                      const newExList = [...block.exercises]
                      const targetIdx = dir === "up" ? exIndex - 1 : exIndex + 1
                      if (targetIdx < 0 || targetIdx >= newExList.length) return
                      const [moved] = newExList.splice(exIndex, 1)
                      newExList.splice(targetIdx, 0, moved!)
                      startTransition(async () => {
                        await moveRoutineTemplateBlockExerciseAction(
                          block.id,
                          tpl.id,
                          newExList.map((x) => x.id)
                        )
                        setTpl((prev) => ({
                          ...prev,
                          days: prev.days.map((d) =>
                            d.id === activeDayId
                              ? {
                                  ...d,
                                  blocks: d.blocks.map((b) =>
                                    b.id === block.id ? { ...b, exercises: newExList } : b
                                  )
                                }
                              : d
                          )
                        }))
                      })
                    }}
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
            Añade un día para comenzar a estructurar la plantilla.
          </div>
        )}
      </div>

      {/* Listo button */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 backdrop-blur-md p-4">
        <button
          onClick={() => router.push(ROUTES.ADMIN_RUTINAS_PLANTILLAS)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 py-3 text-sm font-semibold text-zinc-100 hover:bg-zinc-700 transition-colors"
        >
          <Check className="size-4" />
          Listo
        </button>
      </div>

      {/* Picker de ejercicio */}
      {pickerBlockId && (
        <ExercisePicker
          exercises={exercises}
          existingIds={
            activeDay?.blocks
              .find((b) => b.id === pickerBlockId)
              ?.exercises.map((e) => e.exercise_id) ?? []
          }
          onSelect={(ex) => {
            handleAddExercise(pickerBlockId, ex)
            setPickerBlockId(null)
          }}
          onClose={() => setPickerBlockId(null)}
          onCreateNew={() => setCreateForBlockId(pickerBlockId)}
        />
      )}

      {/* Crear ejercicio desde picker */}
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
              <h3 className="text-base font-bold text-zinc-100">Editar Plantilla</h3>
              <button
                onClick={() => setEditMetaOpen(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-500">Nombre de la plantilla</label>
                <input
                  type="text"
                  value={metaName}
                  onChange={(e) => setMetaName(e.target.value)}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-500">Objetivo</label>
                  <select
                    value={metaGoal}
                    onChange={(e) => setMetaGoal(e.target.value as RoutineGoal)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                  >
                    <option value="">Ninguno</option>
                    <option value="fuerza">Fuerza</option>
                    <option value="hipertrofia">Hipertrofia</option>
                    <option value="cardio">Cardio</option>
                    <option value="tecnica">Técnica</option>
                    <option value="movilidad">Movilidad</option>
                    <option value="full_body">Full Body</option>
                    <option value="general">General</option>
                  </select>
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
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <><Check className="size-4" /> Guardar cambios</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
