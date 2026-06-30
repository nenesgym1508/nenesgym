"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"
import { createExerciseAction, updateExerciseAction } from "@/actions/exercises.actions"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  type Exercise,
  type MuscleGroup,
  type Equipment,
  type ExerciseType,
} from "@/types/exercise"

interface ExerciseFormProps {
  exercise?: Exercise | null
  onSuccess: (exercise: Exercise) => void
  onClose: () => void
}

export function ExerciseForm({ exercise, onSuccess, onClose }: ExerciseFormProps) {
  const isEdit = !!exercise
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(exercise?.name ?? "")
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">(exercise?.muscle_group ?? "")
  const [secondaryGroups, setSecondaryGroups] = useState<MuscleGroup[]>(exercise?.secondary_muscle_groups ?? [])
  const [equipment, setEquipment] = useState<Equipment | "">(exercise?.equipment ?? "")
  const [exerciseType, setExerciseType] = useState<ExerciseType | "">(exercise?.exercise_type ?? "")
  const [instructions, setInstructions] = useState(exercise?.instructions ?? "")

  const toggleSecondary = (g: MuscleGroup) =>
    setSecondaryGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    setError(null)
    setLoading(true)

    const data = {
      name,
      muscle_group: muscleGroup || undefined,
      secondary_muscle_groups: secondaryGroups.length ? secondaryGroups : undefined,
      equipment: equipment || undefined,
      exercise_type: exerciseType || undefined,
      instructions: instructions || undefined,
    }

    if (isEdit) {
      const result = await updateExerciseAction(exercise.id, data)
      setLoading(false)
      if ("error" in result && result.error) { setError(result.error); return }
      onSuccess({
        ...exercise,
        name,
        muscle_group: (muscleGroup || null) as MuscleGroup | null,
        secondary_muscle_groups: secondaryGroups.length ? secondaryGroups : null,
        equipment: (equipment || null) as Equipment | null,
        exercise_type: (exerciseType || null) as ExerciseType | null,
        instructions: instructions || null,
        updated_at: new Date().toISOString(),
      })
    } else {
      const result = await createExerciseAction(data)
      setLoading(false)
      if ("error" in result) { setError(result.error); return }
      onSuccess(result.exercise)
    }
  }

  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
  const equipments = Object.keys(EQUIPMENT_LABELS) as Equipment[]
  const exerciseTypes = Object.keys(EXERCISE_TYPE_LABELS) as ExerciseType[]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:pb-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-zinc-100">
            {isEdit ? "Editar ejercicio" : "Nuevo ejercicio"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="ex-name"
            label="Nombre del ejercicio *"
            placeholder="Sentadilla con barra"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <SelectField
            label="Músculo principal"
            value={muscleGroup}
            onChange={(v) => setMuscleGroup(v as MuscleGroup | "")}
            options={[{ value: "", label: "Sin especificar" }, ...muscleGroups.map((g) => ({ value: g, label: MUSCLE_GROUP_LABELS[g] }))]}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Músculos secundarios (opcional)</label>
            <div className="flex flex-wrap gap-1.5">
              {muscleGroups
                .filter((g) => g !== muscleGroup)
                .map((g) => {
                  const on = secondaryGroups.includes(g)
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleSecondary(g)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                        on ? "bg-red-600/20 text-red-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {MUSCLE_GROUP_LABELS[g]}
                    </button>
                  )
                })}
            </div>
          </div>

          <SelectField
            label="Equipo"
            value={equipment}
            onChange={(v) => setEquipment(v as Equipment | "")}
            options={[{ value: "", label: "Sin especificar" }, ...equipments.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))]}
          />

          <SelectField
            label="Tipo"
            value={exerciseType}
            onChange={(v) => setExerciseType(v as ExerciseType | "")}
            options={[{ value: "", label: "Sin especificar" }, ...exerciseTypes.map((t) => ({ value: t, label: EXERCISE_TYPE_LABELS[t] }))]}
          />

          <Textarea
            id="ex-instructions"
            label="Instrucciones (opcional)"
            placeholder="Descripción de la técnica..."
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : isEdit ? "Guardar" : "Crear"}
            </Button>
          </div>
        </form>
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
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
