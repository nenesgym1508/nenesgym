"use client"

import { useState } from "react"
import Image from "next/image"
import { exerciseImageUrl } from "@/lib/images"

interface ExerciseImageDetailProps {
  /** URL original guardada en la base (media_url o un elemento de media_urls). */
  src: string
  alt: string
  sizes?: string
  className?: string
}

/**
 * Imagen grande de un ejercicio (modal de detalle, editor de clases).
 *
 * Pide la variante `-detail` pre-generada en R2 y, si no existe, **cae de
 * vuelta al original**.
 *
 * ⚠️ Ese respaldo es el motivo de que este componente exista. Antes los dos
 * sitios que muestran la foto grande hacían `exerciseImageUrl(url, "detail")!`
 * a pelo: si la variante faltaba, el `<Image>` apuntaba a un 404 y quedaba un
 * rectángulo **negro** con el icono roto en la esquina — exactamente lo que
 * reportó el dueño. Las miniaturas nunca lo enseñaron porque
 * `ExerciseImageThumbnail` sí tenía este mismo respaldo.
 *
 * Faltaban en 26 de 140 ejercicios: los que se subieron mientras `sharp` no
 * estaba instalado en producción (ver Sesión 22). Aunque ese fallo ya está
 * corregido y las variantes se regeneraron, el respaldo se queda: una
 * optimización que falta nunca debe verse como una foto rota.
 */
export function ExerciseImageDetail({ src, alt, sizes, className = "object-cover" }: ExerciseImageDetailProps) {
  const variante = exerciseImageUrl(src, "detail") ?? src
  const [actual, setActual] = useState(variante)

  // La galería se recorre en cliente: si cambia el ejercicio, hay que volver a
  // intentar con su variante en vez de quedarse en el respaldo del anterior.
  const [visto, setVisto] = useState(variante)
  if (visto !== variante) {
    setVisto(variante)
    setActual(variante)
  }

  return (
    <Image
      src={actual}
      alt={alt}
      fill
      sizes={sizes}
      // La variante ya viene al tamaño en que se muestra; volver a pasarla por
      // el optimizador sería pagar dos veces el mismo trabajo.
      unoptimized
      className={className}
      onError={() => { if (actual !== src) setActual(src) }}
    />
  )
}
