"use client"

import { useState } from "react"
import { Loader2, Crop, X, Plus, Star } from "lucide-react"
import { uploadExerciseImageAction } from "@/actions/exercises.actions"
import { processExerciseImage, validateImageFile } from "@/lib/image-processor"
import { ImageCropModal } from "@/components/ui/image-crop-modal"

/**
 * Galería de imágenes de un ejercicio: hasta 3.
 *
 * Vive en un solo sitio porque la usan los DOS formularios —el del admin y el
 * del socio para sus ejercicios propios— y antes eran ~80 líneas duplicadas
 * casi idénticas. Cada arreglo había que aplicarlo dos veces.
 *
 * ⚠️ La PRIMERA imagen es la portada y se guarda además en `exercises.media_url`
 * (ver normalizarImagenes en exercises.actions.ts). Es la que leen todas las
 * miniaturas del proyecto, así que el orden importa: no es decorativo.
 */
export const MAX_IMAGENES = 3

interface ExerciseImagesFieldProps {
  urls: string[]
  onChange: (urls: string[]) => void
  /** Id del ejercicio si se está editando; el servidor lo usa para permisos. */
  exerciseId?: string
  disabled?: boolean
}

export function ExerciseImagesField({ urls, onChange, exerciseId, disabled }: ExerciseImagesFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  // Recorte: la fuente y, si se está reencuadrando una ya subida, su posición.
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropIndex, setCropIndex] = useState<number | null>(null)

  const lleno = urls.length >= MAX_IMAGENES

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    const check = validateImageFile(file)
    if (!check.ok) {
      setError(check.message)
      setFileInputKey((k) => k + 1)
      return
    }
    try {
      setCropIndex(null) // null = imagen nueva, se añade al final
      setCropSrc(URL.createObjectURL(file))
    } catch (err) {
      setError(`No se pudo leer la foto: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleCropConfirm = async (croppedFile: File) => {
    const indice = cropIndex
    setCropSrc(null)
    setCropIndex(null)
    setFileInputKey((k) => k + 1)
    setUploading(true)
    setError(null)

    try {
      const { file: processedFile } = await processExerciseImage(croppedFile)
      const formData = new FormData()
      formData.append("file", processedFile)
      if (exerciseId) formData.append("exerciseId", exerciseId)

      const res = await uploadExerciseImageAction(formData)
      setUploading(false)

      if ("error" in res) {
        setError(res.error)
        return
      }
      if (indice == null) onChange([...urls, res.url].slice(0, MAX_IMAGENES))
      else onChange(urls.map((u, i) => (i === indice ? res.url : u)))
    } catch (err) {
      setUploading(false)
      setError(err instanceof Error ? err.message : "Error al procesar la imagen.")
    }
  }

  const quitar = (i: number) => onChange(urls.filter((_, k) => k !== i))

  /** Mueve una foto al primer puesto: pasa a ser la portada del ejercicio. */
  const hacerPortada = (i: number) => {
    if (i === 0) return
    const copia = [...urls]
    const [elegida] = copia.splice(i, 1)
    onChange([elegida, ...copia])
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-zinc-400">Imágenes (opcional)</label>
        <span className="text-[10px] text-zinc-600">
          {urls.length} de {MAX_IMAGENES}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div
            key={`${url}-${i}`}
            className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-zinc-800"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Imagen ${i + 1}`}
              className="size-full object-cover"
              onError={(e) => { e.currentTarget.style.visibility = "hidden" }}
            />

            {i === 0 && (
              <span className="absolute left-1 top-1 rounded bg-red-600/90 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">
                Portada
              </span>
            )}

            <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/70 opacity-0 transition-opacity group-hover:opacity-100">
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => hacerPortada(i)}
                  disabled={disabled || uploading}
                  title="Usar como portada"
                  className="rounded bg-white/10 p-1.5 text-amber-300 hover:bg-white/20 cursor-pointer"
                >
                  <Star className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => { setCropIndex(i); setCropSrc(url) }}
                disabled={disabled || uploading}
                title="Recortar"
                className="rounded bg-white/10 p-1.5 text-red-400 hover:bg-white/20 cursor-pointer"
              >
                <Crop className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => quitar(i)}
                disabled={disabled || uploading}
                title="Quitar"
                className="rounded bg-white/10 p-1.5 text-zinc-300 hover:bg-white/20 hover:text-red-400 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}

        {!lleno && (
          <>
            <input
              key={fileInputKey}
              id="ex-images-upload"
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              disabled={disabled || uploading}
              className="hidden"
            />
            <label
              htmlFor="ex-images-upload"
              className="flex size-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-zinc-500 hover:border-white/30 hover:text-zinc-300"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Plus className="size-4" />
                  <span className="text-[10px] font-medium">Añadir</span>
                </>
              )}
            </label>
          </>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : (
        <p className="text-[11px] leading-normal text-zinc-500">
          {urls.length === 0
            ? "Puedes subir hasta 3: posición inicial, final y algún detalle."
            : "La portada es la que se ve en los listados. Pasa el ratón por una foto para recortarla, quitarla o hacerla portada."}
        </p>
      )}

      {cropSrc && (
        <ImageCropModal
          src={cropSrc}
          onCancel={() => { setCropSrc(null); setCropIndex(null); setFileInputKey((k) => k + 1) }}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  )
}
