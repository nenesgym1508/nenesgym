"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { GYM_ID } from "@/constants/plans"
import { ROUTES, adminClaseDetalle } from "@/constants/routes"
import type { ClassObjective, ClassLevel } from "@/services/classes.service"

interface ClassData {
  title: string
  class_date: string
  objective?: ClassObjective
  level?: ClassLevel
  estimated_duration_minutes?: number
  notes?: string
}

// Estructura base tipo Hevy: el editor abre listo para añadir ejercicios.
const STANDARD_BLOCK_TITLES = [
  "Calentamiento",
  "Trabajo principal",
  "Complementarios",
  "Abdomen / cardio",
  "Estiramiento",
]

function revalidateClasses(classId?: string) {
  updateTag("daily-classes")
  revalidatePath(ROUTES.ADMIN_CLASES)
  if (classId) {
    revalidatePath(adminClaseDetalle(classId))
  }
}


export async function createClassAction(data: ClassData) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()

  const { data: newClass, error } = await supabase
    .from("daily_classes")
    .insert({
      gym_id: GYM_ID,
      title: data.title.trim(),
      class_date: data.class_date,
      objective: data.objective ?? null,
      level: data.level ?? null,
      estimated_duration_minutes: data.estimated_duration_minutes ?? null,
      notes: data.notes ?? null,
      status: "draft",
      created_by: guard.user.id,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Scaffold de bloques estándar vacíos.
  await supabase.from("class_blocks").insert(
    STANDARD_BLOCK_TITLES.map((title, i) => ({
      daily_class_id: newClass.id,
      title,
      position: i,
    }))
  )

  revalidateClasses()
  return { success: true, id: newClass.id }
}

// Crea los bloques estándar en una clase existente que no tiene bloques.
export async function scaffoldStandardBlocksAction(classId: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()

  const { data: rows, error } = await supabase
    .from("class_blocks")
    .insert(
      STANDARD_BLOCK_TITLES.map((title, i) => ({
        daily_class_id: classId,
        title,
        position: i,
      }))
    )
    .select("id, title, position")

  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true, blocks: rows }
}

export async function updateClassAction(id: string, data: Partial<ClassData> & { status?: string }) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from("daily_classes")
    .update({
      ...data,
      title: data.title?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidateClasses(id)
  return { success: true }
}

export async function deleteClassAction(id: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from("daily_classes")
    .delete()
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidateClasses()
  return { success: true }
}

// ── Bloques ──────────────────────────────────────────────────

export async function addBlockAction(classId: string, title: string, position: number) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("class_blocks")
    .insert({ daily_class_id: classId, title: title.trim(), position })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true, id: data.id }
}

export async function updateBlockTitleAction(blockId: string, classId: string, title: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from("class_blocks")
    .update({ title: title.trim() })
    .eq("id", blockId)

  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true }
}

export async function deleteBlockAction(blockId: string, classId: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase.from("class_blocks").delete().eq("id", blockId)
  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true }
}

export async function moveBlockAction(
  blockId: string,
  classId: string,
  direction: "up" | "down"
) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data: blocks } = await supabase
    .from("class_blocks")
    .select("id, position")
    .eq("daily_class_id", classId)
    .order("position")

  if (!blocks) return { error: "Bloques no encontrados" }

  const idx = blocks.findIndex((b) => b.id === blockId)
  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= blocks.length) return { success: true }

  const current = blocks[idx]!
  const swap = blocks[swapIdx]!

  await supabase.from("class_blocks").update({ position: swap.position }).eq("id", current.id)
  await supabase.from("class_blocks").update({ position: current.position }).eq("id", swap.id)

  revalidateClasses(classId)
  return { success: true }
}

// ── Ejercicios de bloque ──────────────────────────────────────

interface BlockExerciseData {
  exercise_id: string
  position: number
  sets?: number
  reps?: number
  duration_seconds?: number
  rest_seconds?: number
  suggested_weight?: string
  notes?: string
}

export async function addExerciseToBlockAction(
  blockId: string,
  classId: string,
  data: BlockExerciseData
) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase.from("class_block_exercises").insert({
    block_id: blockId,
    exercise_id: data.exercise_id,
    position: data.position,
    sets: data.sets ?? null,
    reps: data.reps ?? null,
    duration_seconds: data.duration_seconds ?? null,
    rest_seconds: data.rest_seconds ?? null,
    suggested_weight: data.suggested_weight ?? null,
    notes: data.notes ?? null,
  })

  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true }
}

export async function updateBlockExerciseAction(
  id: string,
  classId: string,
  data: Partial<BlockExerciseData>
) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()

  // Solo actualizar las claves provistas (no resetear el resto a null).
  const payload: {
    sets?: number | null
    reps?: number | null
    duration_seconds?: number | null
    rest_seconds?: number | null
    suggested_weight?: string | null
    notes?: string | null
  } = {}
  if ("sets" in data) payload.sets = data.sets ?? null
  if ("reps" in data) payload.reps = data.reps ?? null
  if ("duration_seconds" in data) payload.duration_seconds = data.duration_seconds ?? null
  if ("rest_seconds" in data) payload.rest_seconds = data.rest_seconds ?? null
  if ("suggested_weight" in data) payload.suggested_weight = data.suggested_weight ?? null
  if ("notes" in data) payload.notes = data.notes ?? null
  if (Object.keys(payload).length === 0) return { success: true }

  const { error } = await supabase
    .from("class_block_exercises")
    .update(payload)
    .eq("id", id)

  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true }
}

export async function removeExerciseFromBlockAction(id: string, classId: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase.from("class_block_exercises").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidateClasses(classId)
  return { success: true }
}

export async function moveBlockExerciseAction(
  exerciseId: string,
  blockId: string,
  classId: string,
  direction: "up" | "down"
) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data: exercises } = await supabase
    .from("class_block_exercises")
    .select("id, position")
    .eq("block_id", blockId)
    .order("position")

  if (!exercises) return { error: "Ejercicios no encontrados" }

  const idx = exercises.findIndex((e) => e.id === exerciseId)
  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= exercises.length) return { success: true }

  const current = exercises[idx]!
  const swap = exercises[swapIdx]!

  await supabase.from("class_block_exercises").update({ position: swap.position }).eq("id", current.id)
  await supabase.from("class_block_exercises").update({ position: current.position }).eq("id", swap.id)

  revalidateClasses(classId)
  return { success: true }
}

// ── Duplicar clase ───────────────────────────────────────────

export async function duplicateClassAction(
  sourceId: string,
  targetDate: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const guard = await requireAdmin()
  if ("error" in guard) return { success: false, error: guard.error }
  const supabase = await createClient()

  // Leer clase original
  const { data: source } = await supabase
    .from("daily_classes")
    .select("*")
    .eq("id", sourceId)
    .single()
  if (!source) return { success: false, error: "Clase no encontrada" }

  // Crear nueva clase
  const { data: newClass, error: classError } = await supabase
    .from("daily_classes")
    .insert({
      gym_id: GYM_ID,
      title: source.title,
      class_date: targetDate,
      objective: source.objective,
      level: source.level,
      estimated_duration_minutes: source.estimated_duration_minutes,
      notes: source.notes,
      status: "draft",
      created_by: guard.user.id,
    })
    .select("id")
    .single()

  if (classError || !newClass) return { success: false, error: classError?.message }

  // Duplicar bloques y ejercicios
  const { data: blocks } = await supabase
    .from("class_blocks")
    .select("*")
    .eq("daily_class_id", sourceId)
    .order("position")

  for (const block of blocks ?? []) {
    const { data: newBlock } = await supabase
      .from("class_blocks")
      .insert({ daily_class_id: newClass.id, title: block.title, position: block.position })
      .select("id")
      .single()

    if (!newBlock) continue

    const { data: exercises } = await supabase
      .from("class_block_exercises")
      .select("*")
      .eq("block_id", block.id)
      .order("position")

    if (exercises?.length) {
      await supabase.from("class_block_exercises").insert(
        exercises.map((e) => ({
          block_id: newBlock.id,
          exercise_id: e.exercise_id,
          position: e.position,
          sets: e.sets,
          reps: e.reps,
          duration_seconds: e.duration_seconds,
          rest_seconds: e.rest_seconds,
          suggested_weight: e.suggested_weight,
          notes: e.notes,
        }))
      )
    }
  }

  revalidateClasses()
  return { success: true, id: newClass.id }
}
