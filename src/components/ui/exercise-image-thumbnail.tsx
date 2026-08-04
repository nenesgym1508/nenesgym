"use client"

import { useState } from "react"
import Image from "next/image"
import { Dumbbell } from "lucide-react"
import { exerciseImageUrl } from "@/lib/images"

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
 * Pide la variante `-thumb` pre-generada en R2 (~4 KB) en vez del original
 * (~37 KB). Si esa variante no existiera —una imagen subida antes de que
 * existieran las variantes, o una subida en la que fallaron— cae de vuelta al
 * original antes de rendirse y mostrar el icono.
 */
export function ExerciseImageThumbnail({
  src,
  alt,
  className = "size-9 rounded-md object-cover bg-zinc-800 shrink-0 border border-white/10",
  iconSizeClassName = "size-4",
  size = 40,
}: ExerciseImageThumbnailProps) {
  const variant = exerciseImageUrl(src, "thumbnail")
  const [current, setCurrent] = useState(variant)

  // La lista se reordena y filtra en cliente: si cambia el ejercicio de esta
  // fila hay que volver a intentar con su variante, no quedarse en el fallback
  // del anterior.
  const [seen, setSeen] = useState(variant)
  if (seen !== variant) {
    setSeen(variant)
    setCurrent(variant)
  }

  if (!current) {
    return (
      <div className={`flex items-center justify-center bg-zinc-800 text-zinc-500 shrink-0 ${className}`}>
        <Dumbbell className={iconSizeClassName} />
      </div>
    )
  }

  return (
    <Image
      src={current}
      alt={alt}
      width={size}
      height={size}
      loading="lazy"
      // La variante ya viene al tamaño exacto: volver a optimizarla seria pagar
      // dos veces el mismo trabajo.
      unoptimized
      className={className}
      onError={() => setCurrent(current !== src && src ? src : null)}
    />
  )
}
