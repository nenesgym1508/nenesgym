"use client"

import { useCallback, useEffect, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Loader2, X, ZoomIn } from "lucide-react"
import { cropImageToFile } from "@/lib/crop-image"

// Mismo alto (h-56) que usa ExerciseDetailModal para la imagen del ejercicio;
// el ancho de referencia (375px) es un mobile típico. El recorte se hace con
// ese aspecto para que lo que el admin ve aquí sea EXACTAMENTE lo que el
// cliente ve al abrir el detalle del ejercicio en su celular.
const PREVIEW_ASPECT = 375 / 224

interface ExerciseImageCropModalProps {
  file: File
  exerciseName: string
  onCancel: () => void
  onConfirm: (croppedFile: File) => void
}

export function ExerciseImageCropModal({ file, exerciseName, onCancel, onConfirm }: ExerciseImageCropModalProps) {
  // La URL se crea DENTRO del efecto (no en el estado inicial) a propósito:
  // en desarrollo, React Strict Mode invoca cada efecto dos veces (monta,
  // limpia, vuelve a montar). Si revokeObjectURL corre en esa limpieza sobre
  // una URL creada fuera del efecto, la imagen queda apuntando a un blob ya
  // revocado y nunca se muestra. Creando y revocando dentro del mismo efecto,
  // la segunda pasada genera una URL nueva y válida.
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- creación/limpieza de un recurso externo (blob URL), no estado derivable en render
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels || !imageSrc) return
    setProcessing(true)
    setError(null)
    try {
      const cropped = await cropImageToFile(imageSrc, croppedAreaPixels, file.name)
      onConfirm(cropped)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo recortar la imagen.")
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/80" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
          <div>
            <p className="text-sm font-bold text-zinc-100">Recortar imagen</p>
            <p className="text-[11px] text-zinc-500">Así la verá el cliente en su celular</p>
          </div>
          <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300" aria-label="Cancelar">
            <X className="size-4" />
          </button>
        </div>

        {/* Vista previa: mismo contenedor (h-56, object-cover) que ExerciseDetailModal */}
        <div className="relative w-full h-56 bg-zinc-800">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={PREVIEW_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Resto del detalle, para que se vea idéntico al modal real */}
        <div className="p-4 pt-3 space-y-3">
          <p className="text-lg font-bold text-zinc-100 truncate">{exerciseName || "Nombre del ejercicio"}</p>

          <div className="flex items-center gap-3">
            <ZoomIn className="size-4 text-zinc-500 shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-red-600"
              aria-label="Zoom"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={processing}
              className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={processing || !croppedAreaPixels}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
            >
              {processing ? <Loader2 className="size-4 animate-spin" /> : "Usar este recorte"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
