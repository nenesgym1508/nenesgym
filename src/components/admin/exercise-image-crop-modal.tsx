"use client"

import { useEffect, useState } from "react"
import { ImageCropModal } from "@/components/ui/image-crop-modal"

interface ExerciseImageCropModalProps {
  file: File
  exerciseName: string
  onCancel: () => void
  onConfirm: (croppedFile: File) => void
}

export function ExerciseImageCropModal({ file, exerciseName, onCancel, onConfirm }: ExerciseImageCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImageSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!imageSrc) return null

  return (
    <ImageCropModal
      src={imageSrc}
      aspect={375 / 224}
      label={exerciseName || "Foto del ejercicio"}
      onConfirm={onConfirm}
      onCancel={onCancel}
      allowAspectChange={true}
    />
  )
}
