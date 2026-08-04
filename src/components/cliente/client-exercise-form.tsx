"use client"

import { useState } from "react"
import { Loader2, X, Crop } from "lucide-react"
import { createMyExerciseAction, updateMyExerciseAction, uploadExerciseImageAction } from "@/actions/exercises.actions"
import { processExerciseImage } from "@/lib/image-processor"
import { ImageCropModal } from "@/components/ui/image-crop-modal"
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
  const [uploading, setUploading] = useState(false)

  const [name, setName] = useState(exercise?.name ?? "")
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | "">(exercise?.muscle_group ?? "")
  const [equipment, setEquipment] = useState<Equipment | "">(exercise?.equipment ?? "")
  const [usageTags, setUsageTags] = useState<UsageTag[]>(exercise?.usage_tags ?? [])
  const [description, setDescription] = useState(exercise?.instructions ?? "")
  const [mediaUrl, setMediaUrl] = useState(exercise?.media_url ?? "")

  const toggleUsageTag = (t: UsageTag) =>
    setUsageTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
  const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024 // 10 MB

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato no permitido. Selecciona una imagen JPG, PNG o WebP.")
      setFileInputKey((k) => k + 1)
      return
    }
    if (file.size > MAX_ORIGINAL_SIZE) {
      setError("La imagen seleccionada no puede superar los 10 MB.")
      setFileInputKey((k) => k + 1)
      return
    }

    setCropSrc(URL.createObjectURL(file))
  }

  const handleCropCancel = () => {
    setCropSrc(null)
    setFileInputKey((k) => k + 1)
  }

  const handleCropExisting = () => {
    if (!mediaUrl) return
    setError(null)
    setCropSrc(mediaUrl)
  }

  const handleCropConfirm = async (croppedFile: File) => {
    setCropSrc(null)
    setFileInputKey((k) => k + 1)
    setUploading(true)
    setError(null)

    try {
      const { file: processedFile } = await processExerciseImage(croppedFile)
      const formData = new FormData()
      formData.append("file", processedFile)
      if (exercise?.id) {
        formData.append("exerciseId", exercise.id)
      }

      const res = await uploadExerciseImageAction(formData)
      setUploading(false)

      if ("error" in res) {
        setError(res.error)
      } else {
        setMediaUrl(res.url)
      }
    } catch (err: unknown) {
      setUploading(false)
      const msg = err instanceof Error ? err.message : "Error al procesar la imagen."
      setError(msg)
    }
  }

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
      media_url: mediaUrl.trim() || undefined,
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
        media_url: mediaUrl.trim() || null,
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

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400">Imagen (opcional)</label>
            <div className="flex items-center gap-3">
              {mediaUrl.trim() ? (
                <button
                  type="button"
                  onClick={handleCropExisting}
                  disabled={uploading}
                  className="relative size-12 shrink-0 rounded-md overflow-hidden bg-zinc-800 border border-white/10 group cursor-pointer"
                  title="Haz clic para recortar/reubicar foto"
                >
                  <img
                    src={mediaUrl.trim()}
                    alt=""
                    className="size-full object-cover"
                    onError={(e) => { e.currentTarget.style.visibility = "hidden" }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                    <Crop className="size-4 text-red-400" />
                    <span className="text-[9px] font-bold">Recortar</span>
                  </div>
                </button>
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-500 text-[10px] text-center border border-dashed border-white/10">
                  Sin imagen
                </div>
              )}
              <div className="flex-1 flex gap-2">
                <input
                  key={fileInputKey}
                  id="my-ex-file-upload"
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="my-ex-file-upload"
                  className="flex-1 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-300 font-semibold cursor-pointer hover:bg-white/10 hover:text-zinc-100 transition-all text-center"
                >
                  {uploading ? (
                    <><Loader2 className="size-3.5 animate-spin mr-2" /> Subiendo...</>
                  ) : (
                    "Seleccionar foto"
                  )}
                </label>
                {mediaUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleCropExisting}
                      disabled={uploading}
                      className="flex items-center gap-1 rounded-lg border border-red-600/30 bg-red-600/10 px-3 text-xs font-semibold text-red-400 hover:bg-red-600/20 transition-colors cursor-pointer"
                      title="Recortar o reubicar encuadre"
                    >
                      <Crop className="size-3.5" />
                      Recortar
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaUrl("")}
                      className="rounded-lg bg-zinc-800 px-3 text-xs font-medium text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      Quitar
                    </button>
                  </>
                )}
              </div>
            </div>
            <Input
              id="my-ex-media-url"
              placeholder="...o pega una URL de imagen"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          </div>

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

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          label={name || "Foto del ejercicio"}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  )
}

