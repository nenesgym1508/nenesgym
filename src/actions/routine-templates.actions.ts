"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES, adminRutinaPlantillaDetalle } from "@/constants/routes"
import type { RoutineGoal, RoutineLevel, Weekday } from "@/types/routine"

const STANDARD_BLOCK_TITLES = [
  "Calentamiento",
  "Trabajo principal"
]

export async function createRoutineTemplateAction(data: {
  name: string
  description?: string
  goal?: RoutineGoal
  level?: RoutineLevel
  days_per_week?: number
  notes?: string
}) {
  const supabase = await createClient()
  const { data: tpl, error } = await supabase
    .from("routine_templates")
    .insert({
      gym_id: GYM_ID,
      name: data.name.trim(),
      description: data.description ?? null,
      goal: data.goal ?? null,
      level: data.level ?? null,
      days_per_week: data.days_per_week ?? null,
      notes: data.notes ?? null,
      is_active: true
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Scaffold "Día 1" for template
  const { data: dayData, error: dayError } = await supabase
    .from("routine_template_days")
    .insert({
      template_id: tpl.id,
      title: "Día 1",
      weekday: null,
      position: 0
    })
    .select("id")
    .single()

  if (!dayError && dayData) {
    await supabase.from("routine_template_blocks").insert(
      STANDARD_BLOCK_TITLES.map((title, i) => ({
        template_day_id: dayData.id,
        title,
        position: i
      }))
    )
  }

  revalidatePath(ROUTES.ADMIN_RUTINAS_PLANTILLAS)
  return { success: true, id: tpl.id }
}

export async function updateRoutineTemplateMetaAction(id: string, data: {
  name?: string
  description?: string | null
  goal?: RoutineGoal | null
  level?: RoutineLevel | null
  days_per_week?: number | null
  notes?: string | null
  is_active?: boolean
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("routine_templates")
    .update({
      ...data,
      name: data.name ? data.name.trim() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(id))
  revalidatePath(ROUTES.ADMIN_RUTINAS_PLANTILLAS)
  return { success: true }
}

export async function deleteRoutineTemplateAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("routine_templates")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_RUTINAS_PLANTILLAS)
  return { success: true }
}

// ── Días de Plantilla ──────────────────────────────────────
export async function addRoutineTemplateDayAction(templateId: string, title: string, weekday: Weekday | null, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("routine_template_days")
    .insert({ template_id: templateId, title: title.trim(), weekday, position })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Scaffold blocks
  const { data: blocksData } = await supabase
    .from("routine_template_blocks")
    .insert(
      STANDARD_BLOCK_TITLES.map((tTitle, i) => ({
        template_day_id: data.id,
        title: tTitle,
        position: i
      }))
    )
    .select("id, title, position")

  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true, id: data.id, blocks: blocksData ?? [] }
}

export async function updateRoutineTemplateDayAction(dayId: string, templateId: string, title: string, weekday: Weekday | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("routine_template_days")
    .update({ title: title.trim(), weekday })
    .eq("id", dayId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

export async function deleteRoutineTemplateDayAction(dayId: string, templateId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("routine_template_days")
    .delete()
    .eq("id", dayId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

// ── Bloques de Plantilla ───────────────────────────────────
export async function addRoutineTemplateBlockAction(dayId: string, templateId: string, title: string, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("routine_template_blocks")
    .insert({ template_day_id: dayId, title: title.trim(), position })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true, id: data.id }
}

export async function updateRoutineTemplateBlockTitleAction(blockId: string, templateId: string, title: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("routine_template_blocks")
    .update({ title: title.trim() })
    .eq("id", blockId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

export async function deleteRoutineTemplateBlockAction(blockId: string, templateId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("routine_template_blocks").delete().eq("id", blockId)
  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

export async function moveRoutineTemplateBlockAction(dayId: string, templateId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("routine_template_blocks").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

// ── Ejercicios de Plantilla ───────────────────────────────
export async function addExerciseToRoutineTemplateBlockAction(blockId: string, templateId: string, exerciseId: string, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("routine_template_block_exercises")
    .insert({
      template_block_id: blockId,
      exercise_id: exerciseId,
      position,
      sets: 3,
      reps: 10
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true, id: data.id }
}

export async function updateRoutineTemplateBlockExerciseAction(exerciseRowId: string, templateId: string, data: {
  sets?: number | null
  reps?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  suggested_weight?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("routine_template_block_exercises")
    .update(data)
    .eq("id", exerciseRowId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

export async function removeExerciseFromRoutineTemplateBlockAction(exerciseRowId: string, templateId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("routine_template_block_exercises").delete().eq("id", exerciseRowId)
  if (error) return { error: error.message }
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}

export async function moveRoutineTemplateBlockExerciseAction(blockId: string, templateId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("routine_template_block_exercises").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidatePath(adminRutinaPlantillaDetalle(templateId))
  return { success: true }
}
