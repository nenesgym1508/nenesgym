"use client"

import { useState } from "react"
import { Dumbbell } from "lucide-react"

interface ExerciseImageThumbnailProps {
  src?: string | null
  alt: string
  className?: string
  iconSizeClassName?: string
}

export function ExerciseImageThumbnail({
  src,
  alt,
  className = "size-9 rounded-md object-cover bg-zinc-800 shrink-0 border border-white/10",
  iconSizeClassName = "size-4",
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
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setError(true)}
    />
  )
}
