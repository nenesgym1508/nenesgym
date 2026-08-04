"use client"

import { useState, useCallback } from "react"
import { createPortal } from "react-dom"
import Cropper from "react-easy-crop"
import type { Area } from "react-easy-crop"
import { X, ZoomIn, Check, Crop } from "lucide-react"

// ─── Canvas Crop Helper ───────────────────────────────────────────────────────
export async function getCroppedFile(imageSrc: string, cropPx: Area, fileName: string): Promise<File> {
  const finalSrc = (imageSrc.startsWith("http://") || imageSrc.startsWith("https://"))
    ? `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`
    : imageSrc

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new window.Image()
    i.crossOrigin = "anonymous"
    i.onload = () => res(i)
    i.onerror = rej
    i.src = finalSrc
  })
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  const maxDimension = 1600
  let targetWidth = cropPx.width
  let targetHeight = cropPx.height

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth)
      targetWidth = maxDimension
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight)
      targetHeight = maxDimension
    }
  }

  canvas.width = targetWidth
  canvas.height = targetHeight

  ctx.drawImage(img, cropPx.x, cropPx.y, cropPx.width, cropPx.height, 0, 0, targetWidth, targetHeight)
  return new Promise((res, rej) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { rej(new Error("Canvas toBlob failed")); return }
        res(new File([blob], fileName.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }))
      },
      "image/webp",
      0.90
    )
  })
}

// ─── Full Size Canvas Compression Helper ────────────────────────────────────
async function getFullSizeFile(imageSrc: string, fileName: string): Promise<File> {
  const finalSrc = (imageSrc.startsWith("http://") || imageSrc.startsWith("https://"))
    ? `/api/proxy-image?url=${encodeURIComponent(imageSrc)}`
    : imageSrc

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new window.Image()
    i.crossOrigin = "anonymous"
    i.onload = () => res(i)
    i.onerror = rej
    i.src = finalSrc
  })
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!

  const maxDimension = 1600
  let targetWidth = img.naturalWidth
  let targetHeight = img.naturalHeight
  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDimension) / targetWidth)
      targetWidth = maxDimension
    } else {
      targetWidth = Math.round((targetWidth * maxDimension) / targetHeight)
      targetHeight = maxDimension
    }
  }

  canvas.width = targetWidth
  canvas.height = targetHeight
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)
  return new Promise((res, rej) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { rej(new Error("Canvas toBlob failed")); return }
        res(new File([blob], fileName.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }))
      },
      "image/webp",
      0.90
    )
  })
}

interface ImageCropModalProps {
  src: string
  aspect?: number
  label?: string
  onConfirm: (file: File) => void
  onCancel: () => void
  allowAspectChange?: boolean
  cropShape?: "rect" | "round"
  showGrid?: boolean
}

export function ImageCropModal({
  src,
  aspect = 1,
  label = "Imagen de ejercicio",
  onConfirm,
  onCancel,
  allowAspectChange = true,
  cropShape = "rect",
  showGrid = true,
}: ImageCropModalProps) {
  const [currentAspect, setCurrentAspect] = useState<number>(aspect)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPx, setCroppedAreaPx] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cropError, setCropError] = useState("")
  const [useFullImage, setUseFullImage] = useState(false)

  const effectiveSrc = (src.startsWith("http://") || src.startsWith("https://"))
    ? `/api/proxy-image?url=${encodeURIComponent(src)}`
    : src

  const onCropComplete = useCallback((_: Area, px: Area) => setCroppedAreaPx(px), [])

  async function handleConfirm() {
    if (!useFullImage && !croppedAreaPx) return
    setProcessing(true)
    setCropError("")
    try {
      const file = useFullImage
        ? await getFullSizeFile(src, label)
        : await getCroppedFile(src, croppedAreaPx!, label)
      onConfirm(file)
    } catch {
      setCropError("No se pudo procesar la imagen. Intenta con otra foto.")
    } finally {
      setProcessing(false)
    }
  }

  // El portal escapa del DOM del padre, pero React sigue propagando los eventos por el
  // árbol de componentes: sin esto, cualquier clic aquí dentro dispara el onClick de cierre
  // del modal que lo renderiza (ej. exercise-form) y se cierra todo a mitad del recorte.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  return createPortal(
    <div
      data-crop-modal=""
      // El posicionamiento va en estilo en línea, no en clases de Tailwind, a
      // propósito. Este modal SIEMPRE tiene que quedar por encima del
      // formulario que lo abre, y depender de que una clase concreta llegue en
      // el CSS lo hace frágil: si falta, el modal se pinta como un bloque
      // normal DENTRO del formulario y queda tapado — se ve el formulario
      // encima y parece que "no deja recortar". El estilo en línea no puede
      // faltar ni perder una guerra de especificidad.
      style={{ position: "fixed", inset: 0, zIndex: 99999 }}
      className="flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-xs"
      onClick={stop}
      onMouseDown={stop}
      onPointerDown={stop}
      onTouchStart={stop}
    >
      <div className="flex w-full max-w-2xl max-h-[95dvh] flex-col gap-3 rounded-3xl bg-zinc-950 p-4 sm:p-6 shadow-2xl border border-white/10 overflow-y-auto">
        {/* Cabecera */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-red-600/10 border border-red-600/20 flex items-center justify-center">
              <Crop className="size-4 text-red-500" />
            </div>
            <div>
              <p className="font-bebas text-lg font-bold text-white tracking-wide uppercase">Recortar imagen</p>
              <p className="text-xs text-zinc-400">{label}</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="rounded-full p-1.5 transition text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Proporciones de aspecto */}
        {allowAspectChange && (
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap bg-zinc-900/60 p-2 rounded-2xl border border-white/5 shrink-0">
            <span className="text-[11px] font-semibold text-zinc-400 pl-1">Formato:</span>
            {[
              { label: "1:1 Cuadrado", val: 1 },
              { label: "4:5 Vertical", val: 4 / 5 },
              { label: "16:9 Panorámica", val: 16 / 9 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  setCurrentAspect(opt.val)
                  setUseFullImage(false)
                }}
                className={`px-3 py-1 text-xs font-bold rounded-xl border transition cursor-pointer ${
                  !useFullImage && currentAspect === opt.val
                    ? "border-red-600 bg-red-600/15 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUseFullImage(true)}
              className={`px-3 py-1 text-xs font-bold rounded-xl border transition cursor-pointer ${
                useFullImage
                  ? "border-red-600 bg-red-600/15 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white"
              }`}
            >
              Imagen completa
            </button>
          </div>
        )}

        {/* Área del Cropper */}
        {useFullImage ? (
          <div className="relative h-[40dvh] sm:h-[45dvh] w-full shrink-0 overflow-hidden rounded-2xl bg-black border border-white/5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={effectiveSrc} alt={label} className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <>
            <div className="relative h-[40dvh] sm:h-[45dvh] w-full shrink-0 overflow-hidden rounded-2xl bg-black border border-white/5">
              <Cropper
                image={effectiveSrc}
                crop={crop}
                zoom={zoom}
                aspect={currentAspect}
                cropShape={cropShape}
                showGrid={showGrid}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Slider de Zoom */}
            <div className="flex items-center gap-3 bg-zinc-900/60 p-2.5 rounded-2xl border border-white/5 shrink-0">
              <ZoomIn className="size-4 shrink-0 text-zinc-400" />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer accent-red-600"
              />
            </div>
          </>
        )}

        {cropError && <p className="text-xs text-red-400 text-center shrink-0">{cropError}</p>}

        {/* Botones de acción */}
        <div className="flex justify-end gap-3 pt-1 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="rounded-xl border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold px-4 py-2.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing}
            className="btn-glossy-red flex items-center gap-1.5 rounded-xl text-white text-xs font-semibold px-5 py-2.5 transition-transform hover:scale-[1.01] cursor-pointer disabled:opacity-50"
          >
            <Check className="size-4" />
            {processing ? "Procesando..." : "Confirmar recorte"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
