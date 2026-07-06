"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import type { MuscleGroup, Equipment, ExerciseType, Exercise } from "@/services/exercises.service"

interface ExerciseData {
  name: string
  muscle_group?: MuscleGroup
  secondary_muscle_groups?: MuscleGroup[]
  equipment?: Equipment
  exercise_type?: ExerciseType
  instructions?: string
  media_url?: string
}

export async function createExerciseAction(
  data: ExerciseData
): Promise<{ success: true; exercise: Exercise } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: row, error } = await supabase
    .from("exercises")
    .insert({
      gym_id: GYM_ID,
      name: data.name.trim(),
      muscle_group: data.muscle_group ?? null,
      secondary_muscle_groups: data.secondary_muscle_groups ?? null,
      equipment: data.equipment ?? null,
      exercise_type: data.exercise_type ?? null,
      instructions: data.instructions ?? null,
      media_url: data.media_url ?? null,
      source: "manual",
      is_active: true,
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_CLASES_EJERCICIOS)
  return { success: true, exercise: row as Exercise }
}

export async function updateExerciseAction(id: string, data: ExerciseData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("exercises")
    .update({
      name: data.name.trim(),
      muscle_group: data.muscle_group ?? null,
      secondary_muscle_groups: data.secondary_muscle_groups ?? null,
      equipment: data.equipment ?? null,
      exercise_type: data.exercise_type ?? null,
      instructions: data.instructions ?? null,
      media_url: data.media_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_CLASES_EJERCICIOS)
  return { success: true }
}

export async function toggleExerciseAction(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("exercises")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_CLASES_EJERCICIOS)
  return { success: true }
}

export async function uploadExerciseImageAction(
  formData: FormData
): Promise<{ success: true; url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") return { error: "Sin permisos" }

  const file = formData.get("file") as File
  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" }

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
  const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 MB

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { error: "Tipo de archivo no permitido. Solo se admiten imágenes JPG, PNG y WEBP." }
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "La imagen no puede superar los 4 MB de tamaño." }
  }

  const mimeToExt: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  }
  const ext = mimeToExt[file.type] ?? "jpg"
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`
  const path = `${GYM_ID}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("exercises")
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    return { error: "Error al subir la imagen: " + uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from("exercises")
    .getPublicUrl(path)

  if (!urlData?.publicUrl) {
    return { error: "No se pudo obtener la URL pública de la imagen." }
  }

  return { success: true, url: urlData.publicUrl }
}
