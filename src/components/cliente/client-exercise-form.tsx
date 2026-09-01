"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"
import { createMyExerciseAction, updateMyExerciseAction } from "@/actions/exercises.actions"
import { ExerciseImagesField } from "@/components/admin/exercise-images-field"
import { SelectField } from "@/components/ui/select-field"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  USAGE_TAG_LABELS,
  type Exercise,
  type MuscleGroup,
  type Equipment,
  type UsageTag,
} from "@/types/exercise"

interface ClientExerciseFormProps {
  exercise?: Exercise | null
  onSuccess: (exercise: Exercise) => void
  onClose: () => void
}

export function ClientExerciseForm({ exercise, onSuccess, onClose }: ClientExerciseFormProps) {
  const isEdit = !!exercise
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(exercise?.name ?? "")
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">(exercise?.muscle_group ?? "")
  const [equipment, setEquipment] = useState<Equipment | "">(exercise?.equipment ?? "")
  const [usageTags, setUsageTags] = useState<UsageTag[]>(exercise?.usage_tags ?? [])
  const [description, setDescription] = useState(exercise?.instructions ?? "")
  // La galería. La PRIMERA es la portada: es la que va a exercises.media_url y
  // la que leen todas las miniaturas del proyecto.
  const [mediaUrls, setMediaUrls] = useState<string[]>(
    exercise?.media_urls?.length ? exercise.media_urls : exercise?.media_url ? [exercise.media_url] : []
  )

  const toggleUsageTag = (t: UsageTag) =>
    setUsageTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError("El nombre es obligatorio"); return }
    setError(null)
    setLoading(true)

    const data = {
      name,
      muscle_group: muscleGroup || undefined,
      equipment: equipment || undefined,
      usage_tags: usageTags,
      description: description || undefined,
      media_urls: mediaUrls,
    }

    if (isEdit) {
      const result = await updateMyExerciseAction(exercise.id, data)
      setLoading(false)
      if ("error" in result) { setError(result.error); return }
      onSuccess({
        ...exercise,
        name,
        muscle_group: (muscleGroup || null) as MuscleGroup | null,
        equipment: (equipment || null) as Equipment | null,
        usage_tags: usageTags,
        instructions: description || null,
        media_urls: mediaUrls,
        updated_at: new Date().toISOString(),
      })
    } else {
      const result = await createMyExerciseAction(data)
      setLoading(false)
      if ("error" in result) { setError(result.error); return }
      onSuccess(result.exercise)
    }
  }

  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]
  const equipments = Object.keys(EQUIPMENT_LABELS) as Equipment[]
  const usageTagOptions = Object.keys(USAGE_TAG_LABELS) as UsageTag[]

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
          <h3 className="text-base font-bold text-zinc-100">
            {isEdit ? "Editar ejercicio" : "Crear ejercicio propio"}
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
            id="my-ex-name"
            label="Nombre *"
            placeholder="Sentadilla con mancuernas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <ExerciseImagesField
            urls={mediaUrls}
            onChange={setMediaUrls}
            exerciseId={exercise?.id}
            disabled={loading}
          />

          <SelectField
            label="Músculo principal"
            value={muscleGroup}
            onChange={(v) => setMuscleGroup(v as MuscleGroup | "")}
            options={[{ value: "", label: "Sin especificar" }, ...muscleGroups.map((g) => ({ value: g, label: MUSCLE_GROUP_LABELS[g] }))]}
          />

          <SelectField
            label="Equipo"
            value={equipment}
            onChange={(v) => setEquipment(v as Equipment | "")}
            options={[{ value: "", label: "Sin especificar" }, ...equipments.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))]}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Uso recomendado (opcional)</label>
            <div className="flex flex-wrap gap-1.5">
              {usageTagOptions.map((t) => {
                const on = usageTags.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleUsageTag(t)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      on ? "bg-red-600/20 text-red-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {USAGE_TAG_LABELS[t]}
                  </button>
                )
              })}
            </div>
          </div>

          <Textarea
            id="my-ex-description"
            label="Descripción corta (opcional)"
            placeholder="Cómo hacer el ejercicio..."
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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

