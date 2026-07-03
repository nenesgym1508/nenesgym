"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES, adminClaseDetalle, adminPlantillaDetalle } from "@/constants/routes"
import type { ClassObjective, ClassLevel } from "@/services/classes.service"

// Crear plantilla vacía
export async function createTemplateAction(data: {
  name: string
  objective?: ClassObjective
  level?: ClassLevel
  estimated_duration_minutes?: number
  notes?: string
}) {
  const supabase = await createClient()
  const { data: tpl, error } = await supabase
    .from("class_templates")
    .insert({
      gym_id: GYM_ID,
      name: data.name.trim(),
      objective: data.objective ?? null,
      level: data.level ?? null,
      estimated_duration_minutes: data.estimated_duration_minutes ?? null,
      notes: data.notes ?? null,
      is_active: true,
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_CLASES_PLANTILLAS)
  return { success: true, id: tpl.id }
}

// Guardar una clase existente como plantilla
export async function saveClassAsTemplateAction(classId: string, templateName: string) {
  const supabase = await createClient()

  const { data: source } = await supabase
    .from("daily_classes")
    .select("*")
    .eq("id", classId)
    .single()
  if (!source) return { error: "Clase no encontrada" }

  const { data: tpl, error: tplError } = await supabase
    .from("class_templates")
    .insert({
      gym_id: GYM_ID,
      name: templateName.trim(),
      objective: source.objective,
      level: source.level,
      estimated_duration_minutes: source.estimated_duration_minutes,
      notes: source.notes,
      is_active: true,
    })
    .select("id")
    .single()

  if (tplError || !tpl) return { error: tplError?.message }

  const { data: blocks } = await supabase
    .from("class_blocks")
    .select("*")
    .eq("daily_class_id", classId)
    .order("position")

  for (const block of blocks ?? []) {
    const { data: tplBlock } = await supabase
      .from("template_blocks")
      .insert({ template_id: tpl.id, title: block.title, position: block.position })
      .select("id")
      .single()

    if (!tplBlock) continue

    const { data: exercises } = await supabase
      .from("class_block_exercises")
      .select("*")
      .eq("block_id", block.id)
      .order("position")

    if (exercises?.length) {
      await supabase.from("template_block_exercises").insert(
        exercises.map((e) => ({
          template_block_id: tplBlock.id,
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

  revalidatePath(ROUTES.ADMIN_CLASES_PLANTILLAS)
  revalidatePath(adminClaseDetalle(classId))
  return { success: true }
}

// Crear clase desde plantilla (devuelve el ID de la nueva clase)
export async function createClassFromTemplateAction(
  templateId: string,
  targetDate: string,
  userId: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()

  const { data: tpl } = await supabase
    .from("class_templates")
    .select("*")
    .eq("id", templateId)
    .single()
  if (!tpl) return { success: false, error: "Plantilla no encontrada" }

  const { data: newClass, error } = await supabase
    .from("daily_classes")
    .insert({
      gym_id: GYM_ID,
      title: tpl.name,
      class_date: targetDate,
      objective: tpl.objective,
      level: tpl.level,
      estimated_duration_minutes: tpl.estimated_duration_minutes,
      notes: tpl.notes,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single()

  if (error || !newClass) return { success: false, error: error?.message }

  const { data: blocks } = await supabase
    .from("template_blocks")
    .select("*")
    .eq("template_id", templateId)
    .order("position")

  for (const block of blocks ?? []) {
    const { data: newBlock } = await supabase
      .from("class_blocks")
      .insert({ daily_class_id: newClass.id, title: block.title, position: block.position })
      .select("id")
      .single()

    if (!newBlock) continue

    const { data: exercises } = await supabase
      .from("template_block_exercises")
      .select("*")
      .eq("template_block_id", block.id)
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

  revalidatePath(ROUTES.ADMIN_CLASES)
  return { success: true, id: newClass.id }
}

export async function toggleTemplateAction(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("class_templates")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_CLASES_PLANTILLAS)
  return { success: true }
}

// ── Editor de plantillas ──────────────────────────────────────

interface TemplateMetaData {
  name?: string
  objective?: ClassObjective
  level?: ClassLevel
  estimated_duration_minutes?: number
  notes?: string
}

export async function updateTemplateMetaAction(id: string, data: TemplateMetaData) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("class_templates")
    .update({
      ...data,
      name: data.name?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(adminPlantillaDetalle(id))
  revalidatePath(ROUTES.ADMIN_CLASES_PLANTILLAS)
  return { success: true }
}

export async function deleteTemplateAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("class_templates")
    .delete()
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_CLASES_PLANTILLAS)
  return { success: true }
}

// ── Bloques de plantilla ───────────────────────────────────────

export async function addTemplateBlockAction(templateId: string, title: string, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("template_blocks")
    .insert({ template_id: templateId, title: title.trim(), position })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true, id: data.id }
}

export async function updateTemplateBlockTitleAction(blockId: string, templateId: string, title: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("template_blocks")
    .update({ title: title.trim() })
    .eq("id", blockId)

  if (error) return { error: error.message }
  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}

export async function deleteTemplateBlockAction(blockId: string, templateId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("template_blocks").delete().eq("id", blockId)
  if (error) return { error: error.message }
  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}

export async function moveTemplateBlockAction(
  blockId: string,
  templateId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient()
  const { data: blocks } = await supabase
    .from("template_blocks")
    .select("id, position")
    .eq("template_id", templateId)
    .order("position")

  if (!blocks) return { error: "Bloques no encontrados" }

  const idx = blocks.findIndex((b) => b.id === blockId)
  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= blocks.length) return { success: true }

  const current = blocks[idx]!
  const swap = blocks[swapIdx]!

  await supabase.from("template_blocks").update({ position: swap.position }).eq("id", current.id)
  await supabase.from("template_blocks").update({ position: current.position }).eq("id", swap.id)

  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}

// ── Ejercicios de bloque de plantilla ──────────────────────────

interface TemplateBlockExerciseData {
  exercise_id: string
  position: number
  sets?: number
  reps?: number
  duration_seconds?: number
  rest_seconds?: number
  suggested_weight?: string
  notes?: string
}

export async function addExerciseToTemplateBlockAction(
  blockId: string,
  templateId: string,
  data: TemplateBlockExerciseData
) {
  const supabase = await createClient()
  const { error } = await supabase.from("template_block_exercises").insert({
    template_block_id: blockId,
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
  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}

export async function updateTemplateBlockExerciseAction(
  id: string,
  templateId: string,
  data: Partial<TemplateBlockExerciseData>
) {
  const supabase = await createClient()

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
    .from("template_block_exercises")
    .update(payload)
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}

export async function removeExerciseFromTemplateBlockAction(id: string, templateId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("template_block_exercises").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}

export async function moveTemplateBlockExerciseAction(
  exerciseId: string,
  blockId: string,
  templateId: string,
  direction: "up" | "down"
) {
  const supabase = await createClient()
  const { data: exercises } = await supabase
    .from("template_block_exercises")
    .select("id, position")
    .eq("template_block_id", blockId)
    .order("position")

  if (!exercises) return { error: "Ejercicios no encontrados" }

  const idx = exercises.findIndex((e) => e.id === exerciseId)
  const swapIdx = direction === "up" ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= exercises.length) return { success: true }

  const current = exercises[idx]!
  const swap = exercises[swapIdx]!

  await supabase.from("template_block_exercises").update({ position: swap.position }).eq("id", current.id)
  await supabase.from("template_block_exercises").update({ position: current.position }).eq("id", swap.id)

  revalidatePath(adminPlantillaDetalle(templateId))
  return { success: true }
}
