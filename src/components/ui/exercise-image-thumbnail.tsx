"use client"

import { useState } from "react"
import Image from "next/image"
import { Dumbbell } from "lucide-react"

interface ExerciseImageThumbnailProps {
  src?: string | null
  alt: string
  className?: string
  iconSizeClassName?: string
  /** Lado del thumbnail en px. Debe coincidir con el tamaño que impone className. */
  size?: number
}

/**
 * Miniatura de ejercicio.
 *
 * Pasa por `next/image` a propósito: las fotos del catálogo son de 50–450 KB en
 * origen y aquí se muestran a 36–40 px. Servidas en crudo, la lista de ~120
 * ejercicios descargaba varios MB; por el optimizador cada una queda en ~1 KB.
 * Los hosts permitidos están en `next.config.ts` → `images.remotePatterns`.
 */
export function ExerciseImageThumbnail({
  src,
  alt,
  className = "size-9 rounded-md object-cover bg-zinc-800 shrink-0 border border-white/10",
  iconSizeClassName = "size-4",
  size = 40,
}: ExerciseImageThumbnailProps) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-500 shrink-0 ${className}`}>
        <Dumbbell className={iconSizeClassName} />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      className={className}
      onError={() => setError(true)}
    />
  )
}
