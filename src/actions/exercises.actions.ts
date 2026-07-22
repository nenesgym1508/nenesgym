"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import type { MuscleGroup, Equipment, ExerciseType, Exercise, UsageTag } from "@/services/exercises.service"

interface ExerciseData {
  name: string
  muscle_group?: MuscleGroup
  secondary_muscle_groups?: MuscleGroup[]
  equipment?: Equipment
  exercise_type?: ExerciseType
  usage_tags?: UsageTag[]
  instructions?: string
  media_url?: string
}

export async function createExerciseAction(
  data: ExerciseData
): Promise<{ success: true; exercise: Exercise } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: row, error } = await (supabase as any)
    .from("exercises")
    .insert({
      gym_id: GYM_ID,
      name: data.name.trim(),
      muscle_group: data.muscle_group ?? null,
      secondary_muscle_groups: data.secondary_muscle_groups ?? null,
      equipment: data.equipment ?? null,
      exercise_type: data.exercise_type ?? null,
      usage_tags: data.usage_tags ?? [],
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

  const { error } = await (supabase as any)
    .from("exercises")
    .update({
      name: data.name.trim(),
      muscle_group: data.muscle_group ?? null,
      secondary_muscle_groups: data.secondary_muscle_groups ?? null,
      equipment: data.equipment ?? null,
      exercise_type: data.exercise_type ?? null,
      usage_tags: data.usage_tags ?? [],
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

function isWebPBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false
  const riff = buffer.toString("ascii", 0, 4)
  const webp = buffer.toString("ascii", 8, 12)
  return riff === "RIFF" && webp === "WEBP"
}

function getStoragePathFromUrl(url: string | null): string | null {
  if (!url) return null
  const marker = "/storage/v1/object/public/exercises/"
  const idx = url.indexOf(marker)
  if (idx !== -1) {
    return url.substring(idx + marker.length)
  }
  return null
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

  const role = profile?.role
  if (role !== "admin" && role !== "client") return { error: "Sin permisos" }

  const file = formData.get("file") as File | null
  const exerciseId = formData.get("exerciseId") as string | null

  if (!file || file.size === 0) return { error: "No se seleccionó ningún archivo" }

  const MAX_FILE_SIZE = 500 * 1024 // 500 KB estricto final
  if (file.size > MAX_FILE_SIZE) {
    return { error: "La imagen optimizada supera el límite máximo de 500 KB." }
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Inspección de la firma real del archivo (Magic Bytes: RIFF...WEBP)
  if (!isWebPBuffer(buffer)) {
    return { error: "El archivo enviado no es una imagen WebP válida." }
  }

  let clientId: string | null = null
  let oldMediaUrl: string | null = null

  if (role === "client") {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .eq("profile_id", user.id)
      .single()
    if (!client) return { error: "Perfil de cliente no encontrado" }
    clientId = client.id

    if (exerciseId) {
      const { data: existingEx } = await supabase
        .from("exercises")
        .select("owner_client_id, visibility, media_url")
        .eq("id", exerciseId)
        .single()
      if (!existingEx || existingEx.owner_client_id !== clientId || existingEx.visibility !== "client") {
        return { error: "Sin permisos para modificar la imagen de este ejercicio." }
      }
      oldMediaUrl = existingEx.media_url
    }
  } else if (role === "admin" && exerciseId) {
    const { data: existingEx } = await supabase
      .from("exercises")
      .select("media_url")
      .eq("id", exerciseId)
      .single()
    if (existingEx) {
      oldMediaUrl = existingEx.media_url
    }
  }

  const randomStr = Math.random().toString(36).substring(2, 8)
  const path = role === "admin"
    ? `gym/${GYM_ID}/${Date.now()}_${randomStr}.webp`
    : `client/${clientId}/${Date.now()}_${randomStr}.webp`

  const { error: uploadError } = await supabase.storage
    .from("exercises")
    .upload(path, buffer, { contentType: "image/webp", upsert: false })

  if (uploadError) {
    return { error: "Error al subir la imagen: " + uploadError.message }
  }

  const { data: urlData } = supabase.storage
    .from("exercises")
    .getPublicUrl(path)

  if (!urlData?.publicUrl) {
    return { error: "No se pudo obtener la URL pública de la imagen." }
  }

  // Eliminar la imagen previa únicamente si no está compartida por otro ejercicio
  if (oldMediaUrl) {
    const oldPath = getStoragePathFromUrl(oldMediaUrl)
    if (oldPath && oldPath !== path) {
      const { count } = await (supabase as any)
        .from("exercises")
        .select("id", { count: "exact", head: true })
        .eq("media_url", oldMediaUrl)

      if ((count ?? 0) <= 1) {
        await supabase.storage.from("exercises").remove([oldPath])
      }
    }
  }

  return { success: true, url: urlData.publicUrl }
}

// ── Biblioteca personal de ejercicios del cliente ──────────

async function getClientIdForCurrentUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ error: string } | { clientId: string }> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }
  const { data: client } = await supabase.from("clients").select("id").eq("profile_id", user.id).single()
  if (!client) return { error: "No se encontró el perfil de cliente" }
  return { clientId: client.id }
}

interface MyExerciseData {
  name: string
  muscle_group?: MuscleGroup
  equipment?: Equipment
  usage_tags?: UsageTag[]
  description?: string
  media_url?: string
}

export async function createMyExerciseAction(
  data: MyExerciseData
): Promise<{ success: true; exercise: Exercise } | { error: string }> {
  const supabase = await createClient()
  const ctx = await getClientIdForCurrentUser(supabase)
  if ("error" in ctx) return ctx

  if (!data.name.trim()) return { error: "El nombre es obligatorio" }

  // Límite MVP: máximo 15 ejercicios personales por cliente
  const { count } = await (supabase as any)
    .from("exercises")
    .select("id", { count: "exact", head: true })
    .eq("gym_id", GYM_ID)
    .eq("owner_client_id", ctx.clientId)
    .eq("visibility", "client")
    .eq("is_active", true)

  if ((count ?? 0) >= 15) {
    return {
      error: "Has alcanzado el límite máximo de 15 ejercicios personales. Puedes editar o eliminar tus ejercicios existentes para crear nuevos."
    }
  }

  const { data: row, error } = await (supabase as any)
    .from("exercises")
    .insert({
      gym_id: GYM_ID,
      name: data.name.trim(),
      muscle_group: data.muscle_group ?? null,
      equipment: data.equipment ?? null,
      usage_tags: data.usage_tags ?? [],
      instructions: data.description ?? null,
      media_url: data.media_url ?? null,
      source: "client",
      visibility: "client",
      owner_client_id: ctx.clientId,
      created_by_role: "client",
      is_active: true,
    })
    .select("*")
    .single()

  if (error) return { error: error.message }
  revalidatePath(ROUTES.CLIENTE_RUTINAS_EJERCICIOS)
  return { success: true, exercise: row as Exercise }
}

export async function updateMyExerciseAction(id: string, data: MyExerciseData) {
  const supabase = await createClient()
  const ctx = await getClientIdForCurrentUser(supabase)
  if ("error" in ctx) return ctx

  if (!data.name.trim()) return { error: "El nombre es obligatorio" }

  const { error } = await (supabase as any)
    .from("exercises")
    .update({
      name: data.name.trim(),
      muscle_group: data.muscle_group ?? null,
      equipment: data.equipment ?? null,
      usage_tags: data.usage_tags ?? [],
      instructions: data.description ?? null,
      media_url: data.media_url ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_client_id", ctx.clientId)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.CLIENTE_RUTINAS_EJERCICIOS)
  return { success: true }
}

// Soft-delete: no se borra físicamente (mismo motivo que toggleExerciseAction
// para el admin — client_routine_exercises.exercise_id no tiene ON DELETE CASCADE).
export async function deleteMyExerciseAction(id: string) {
  const supabase = await createClient()
  const ctx = await getClientIdForCurrentUser(supabase)
  if ("error" in ctx) return ctx

  const { error } = await (supabase as any)
    .from("exercises")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_client_id", ctx.clientId)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.CLIENTE_RUTINAS_EJERCICIOS)
  return { success: true }
}

export async function addToMyLibraryAction(exerciseId: string) {
  const supabase = await createClient()
  const ctx = await getClientIdForCurrentUser(supabase)
  if ("error" in ctx) return ctx

  const { error } = await (supabase as any)
    .from("client_exercise_library")
    .upsert(
      { gym_id: GYM_ID, client_id: ctx.clientId, exercise_id: exerciseId, is_active: true },
      { onConflict: "client_id,exercise_id" }
    )

  if (error) return { error: error.message }
  revalidatePath(ROUTES.CLIENTE_RUTINAS_EJERCICIOS)
  return { success: true }
}

// Como los ejercicios del gym están en la biblioteca por defecto (sin fila
// propia), "quitar" registra una exclusión explícita vía upsert en vez de
// un UPDATE sobre una fila que puede no existir todavía.
export async function removeFromMyLibraryAction(exerciseId: string) {
  const supabase = await createClient()
  const ctx = await getClientIdForCurrentUser(supabase)
  if ("error" in ctx) return ctx

  const { error } = await (supabase as any)
    .from("client_exercise_library")
    .upsert(
      { gym_id: GYM_ID, client_id: ctx.clientId, exercise_id: exerciseId, is_active: false },
      { onConflict: "client_id,exercise_id" }
    )

  if (error) return { error: error.message }
  revalidatePath(ROUTES.CLIENTE_RUTINAS_EJERCICIOS)
  return { success: true }
}
