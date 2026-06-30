"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES, adminClaseDetalle } from "@/constants/routes"
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
