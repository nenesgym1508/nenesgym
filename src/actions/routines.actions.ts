"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { ROUTES, adminRutinaDetalle, clienteRutinaDetalle } from "@/constants/routes"
import type { RoutineGoal, RoutineLevel, RoutineStatus, RoutineSourceType, RoutineCreatedByRole, RoutineSessionStatus, Weekday } from "@/types/routine"

const STANDARD_BLOCK_TITLES = [
  "Calentamiento",
  "Trabajo principal"
]

interface CreateRoutineInput {
  client_id: string | null
  title: string
  description?: string
  goal?: RoutineGoal
  custom_goal?: string
  level?: RoutineLevel
  days_per_week?: number
  start_date?: string
  end_date?: string
  notes?: string
}

export async function createRoutineAction(data: CreateRoutineInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: newRoutine, error } = await supabase
    .from("client_routines")
    .insert({
      gym_id: GYM_ID,
      client_id: data.client_id,
      title: data.title.trim(),
      description: data.description ?? null,
      goal: data.goal ?? null,
      custom_goal: data.custom_goal ?? null,
      level: data.level ?? null,
      days_per_week: data.days_per_week ?? null,
      status: "active",
      source_type: "custom",
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      notes: data.notes ?? null,
      created_by: user.id,
      created_by_role: "admin"
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Scaffold standard day "Día 1"
  const { data: dayData, error: dayError } = await supabase
    .from("client_routine_days")
    .insert({
      routine_id: newRoutine.id,
      title: "Día 1",
      weekday: null,
      position: 0
    })
    .select("id")
    .single()

  if (!dayError && dayData) {
    await supabase.from("client_routine_blocks").insert(
      STANDARD_BLOCK_TITLES.map((title, i) => ({
        routine_day_id: dayData.id,
        title,
        position: i
      }))
    )
  }

  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true, id: newRoutine.id }
}

export async function updateRoutineMetaAction(id: string, data: Partial<ClientRoutineInput> & { status?: RoutineStatus; days_per_week?: number | null }) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routines")
    .update({
      ...data,
      title: data.title?.trim(),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(id))
  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true }
}

export async function deleteRoutineAction(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routines")
    .delete()
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true }
}

export async function duplicateRoutineAction(id: string) {
  const supabase = await createClient()
  const { data: source, error: fetchErr } = await supabase
    .from("client_routines")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchErr || !source) return { error: "No se encontró la rutina de origen" }

  const { data: newRoutine, error: insertErr } = await supabase
    .from("client_routines")
    .insert({
      gym_id: GYM_ID,
      client_id: source.client_id,
      title: `${source.title} (Copia)`,
      description: source.description,
      goal: source.goal,
      custom_goal: source.custom_goal,
      level: source.level,
      days_per_week: source.days_per_week,
      status: "draft",
      source_type: source.source_type,
      source_id: id,
      start_date: source.start_date,
      end_date: source.end_date,
      notes: source.notes,
      created_by_role: source.created_by_role,
      created_by: source.created_by
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  // Fetch days
  const { data: days } = await supabase
    .from("client_routine_days")
    .select("*")
    .eq("routine_id", id)

  for (const day of days ?? []) {
    const { data: newDay, error: dayErr } = await supabase
      .from("client_routine_days")
      .insert({
        routine_id: newRoutine.id,
        title: day.title,
        weekday: day.weekday,
        position: day.position
      })
      .select("id")
      .single()

    if (dayErr) continue

    const { data: blocks } = await supabase
      .from("client_routine_blocks")
      .select("*")
      .eq("routine_day_id", day.id)

    for (const block of blocks ?? []) {
      const { data: newBlock, error: blockErr } = await supabase
        .from("client_routine_blocks")
        .insert({
          routine_day_id: newDay.id,
          title: block.title,
          position: block.position
        })
        .select("id")
        .single()

      if (blockErr) continue

      const { data: exercises } = await supabase
        .from("client_routine_exercises")
        .select("*")
        .eq("block_id", block.id)

      if (exercises && exercises.length > 0) {
        await supabase.from("client_routine_exercises").insert(
          (exercises as any[]).map((ex: any) => ({
            block_id: newBlock.id,
            exercise_id: ex.exercise_id,
            position: ex.position,
            sets: ex.sets,
            reps: ex.reps,
            duration_seconds: ex.duration_seconds,
            rest_seconds: ex.rest_seconds,
            suggested_weight: ex.suggested_weight,
            notes: ex.notes
          }))
        )
      }
    }
  }

  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true, id: newRoutine.id }
}

export async function assignRoutineToClientAction(routineId: string, clientId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routines")
    .update({ client_id: clientId, status: "active" })
    .eq("id", routineId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true }
}

// ── Días ──────────────────────────────────────────────────
export async function addRoutineDayAction(routineId: string, title: string, weekday: Weekday | null, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_routine_days")
    .insert({ routine_id: routineId, title: title.trim(), weekday, position })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Scaffold blocks for the new day
  const { data: blocksData } = await supabase
    .from("client_routine_blocks")
    .insert(
      STANDARD_BLOCK_TITLES.map((tTitle, i) => ({
        routine_day_id: data.id,
        title: tTitle,
        position: i
      }))
    )
    .select("id, title, position")

  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true, id: data.id, blocks: blocksData ?? [] }
}

export async function updateRoutineDayAction(dayId: string, routineId: string, title: string, weekday: Weekday | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routine_days")
    .update({ title: title.trim(), weekday })
    .eq("id", dayId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

export async function deleteRoutineDayAction(dayId: string, routineId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routine_days")
    .delete()
    .eq("id", dayId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

export async function moveRoutineDayAction(routineId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("client_routine_days").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

// ── Bloques ───────────────────────────────────────────────
export async function addRoutineBlockAction(dayId: string, routineId: string, title: string, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_routine_blocks")
    .insert({ routine_day_id: dayId, title: title.trim(), position })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true, id: data.id }
}

export async function updateRoutineBlockTitleAction(blockId: string, routineId: string, title: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routine_blocks")
    .update({ title: title.trim() })
    .eq("id", blockId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

export async function deleteRoutineBlockAction(blockId: string, routineId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("client_routine_blocks").delete().eq("id", blockId)
  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

export async function moveRoutineBlockAction(dayId: string, routineId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("client_routine_blocks").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

// ── Ejercicios en bloque ──────────────────────────────────
export async function addExerciseToRoutineBlockAction(
  blockId: string,
  routineId: string,
  exerciseId: string,
  position: number,
  overrides?: { sets: number; reps: number; rest_seconds: number }
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_routine_exercises")
    .insert({
      block_id: blockId,
      exercise_id: exerciseId,
      position,
      sets: overrides?.sets ?? 3,
      reps: overrides?.reps ?? 10,
      rest_seconds: overrides?.rest_seconds ?? null
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true, id: data.id }
}

export async function updateRoutineBlockExerciseAction(exerciseRowId: string, routineId: string, data: {
  sets?: number | null
  reps?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  suggested_weight?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routine_exercises")
    .update(data)
    .eq("id", exerciseRowId)

  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

export async function removeExerciseFromRoutineBlockAction(exerciseRowId: string, routineId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("client_routine_exercises").delete().eq("id", exerciseRowId)
  if (error) return { error: error.message }
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

export async function moveRoutineBlockExerciseAction(blockId: string, routineId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("client_routine_exercises").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidatePath(adminRutinaDetalle(routineId))
  revalidatePath(clienteRutinaDetalle(routineId))
  return { success: true }
}

// ── Cliente crea su propia rutina ─────────────────────────
export async function createClientRoutineAction(data: {
  title: string
  goal?: RoutineGoal
  custom_goal?: string
  level?: RoutineLevel
  days_per_week?: number
  description?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const customGoal = data.goal === "otro" ? data.custom_goal?.trim() || null : null
  if (data.goal === "otro" && (!customGoal || customGoal.length > 60)) {
    return { error: "Escribe un objetivo de hasta 60 caracteres" }
  }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single()

  if (!client) return { error: "No se encontró el perfil de cliente" }

  const { data: newRoutine, error } = await supabase
    .from("client_routines")
    .insert({
      gym_id: GYM_ID,
      client_id: client.id,
      title: data.title.trim(),
      description: data.description ?? null,
      goal: data.goal ?? null,
      custom_goal: customGoal,
      level: data.level ?? null,
      days_per_week: data.days_per_week ?? null,
      status: "active",
      source_type: "client_created",
      notes: data.notes ?? null,
      created_by: user.id,
      created_by_role: "client"
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  // Crear N días (según days_per_week), cada uno con los 4 bloques estándar.
  const totalDays = data.days_per_week ?? 1
  for (let i = 1; i <= totalDays; i++) {
    const { data: dayData } = await supabase
      .from("client_routine_days")
      .insert({
        routine_id: newRoutine.id,
        title: `Día ${i}`,
        weekday: null,
        position: i - 1
      })
      .select("id")
      .single()

    if (dayData) {
      await supabase.from("client_routine_blocks").insert(
        STANDARD_BLOCK_TITLES.map((title, idx) => ({
          routine_day_id: dayData.id,
          title,
          position: idx
        }))
      )
    }
  }

  revalidatePath(ROUTES.CLIENTE_RUTINAS)
  return { success: true, id: newRoutine.id }
}

// ── Fase 5 Actions — crear desde clase / crear desde plantilla ──
export async function createRoutineFromClassAction(classId: string, clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: dc, error: fetchErr } = await supabase
    .from("daily_classes")
    .select("*")
    .eq("id", classId)
    .single()

  if (fetchErr || !dc) return { error: "No se encontró la clase" }

  const { data: newRoutine, error: insertErr } = await supabase
    .from("client_routines")
    .insert({
      gym_id: GYM_ID,
      client_id: clientId,
      title: `Rutina desde Clase: ${dc.title}`,
      goal: dc.objective,
      level: dc.level,
      status: "active",
      source_type: "class",
      source_id: classId,
      notes: dc.notes,
      created_by: user.id,
      created_by_role: "admin"
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  const { data: newDay } = await supabase
    .from("client_routine_days")
    .insert({
      routine_id: newRoutine.id,
      title: "Día 1",
      position: 0
    })
    .select("id")
    .single()

  if (newDay) {
    const { data: blocks } = await supabase
      .from("class_blocks")
      .select("*")
      .eq("daily_class_id", classId)

    for (const block of blocks ?? []) {
      const { data: newBlock } = await supabase
        .from("client_routine_blocks")
        .insert({
          routine_day_id: newDay.id,
          title: block.title,
          position: block.position
        })
        .select("id")
        .single()

      if (newBlock) {
        const { data: exercises } = await supabase
          .from("class_block_exercises")
          .select("*")
          .eq("block_id", block.id)

        if (exercises && exercises.length > 0) {
          await supabase.from("client_routine_exercises").insert(
            (exercises as any[]).map((ex: any) => ({
              block_id: newBlock.id,
              exercise_id: ex.exercise_id,
              position: ex.position,
              sets: ex.sets,
              reps: ex.reps,
              duration_seconds: ex.duration_seconds,
              rest_seconds: ex.rest_seconds,
              suggested_weight: ex.suggested_weight,
              notes: ex.notes
            }))
          )
        }
      }
    }
  }

  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true, id: newRoutine.id }
}

export async function createRoutineFromTemplateAction(templateId: string, clientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: rt, error: fetchErr } = await supabase
    .from("routine_templates")
    .select("*")
    .eq("id", templateId)
    .single()

  if (fetchErr || !rt) return { error: "No se encontró la plantilla de rutina" }

  const { data: newRoutine, error: insertErr } = await supabase
    .from("client_routines")
    .insert({
      gym_id: GYM_ID,
      client_id: clientId,
      title: rt.name,
      description: rt.description,
      goal: rt.goal,
      custom_goal: rt.custom_goal,
      level: rt.level,
      days_per_week: rt.days_per_week,
      status: "active",
      source_type: "template",
      source_id: templateId,
      notes: rt.notes,
      created_by: user.id,
      created_by_role: "admin"
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  const { data: days } = await supabase
    .from("routine_template_days")
    .select("*")
    .eq("template_id", templateId)

  for (const day of days ?? []) {
    const { data: newDay } = await supabase
      .from("client_routine_days")
      .insert({
        routine_id: newRoutine.id,
        title: day.title,
        weekday: day.weekday,
        position: day.position
      })
      .select("id")
      .single()

    if (newDay) {
      const { data: blocks } = await supabase
        .from("routine_template_blocks")
        .select("*")
        .eq("template_day_id", day.id)

      for (const block of blocks ?? []) {
        const { data: newBlock } = await supabase
          .from("client_routine_blocks")
          .insert({
            routine_day_id: newDay.id,
            title: block.title,
            position: block.position
          })
          .select("id")
          .single()

        if (newBlock) {
          const { data: exercises } = await supabase
            .from("routine_template_block_exercises")
            .select("*")
            .eq("template_block_id", block.id)

          if (exercises && exercises.length > 0) {
            await supabase.from("client_routine_exercises").insert(
              (exercises as any[]).map((ex: any) => ({
                block_id: newBlock.id,
                exercise_id: ex.exercise_id,
                position: ex.position,
                sets: ex.sets,
                reps: ex.reps,
                duration_seconds: ex.duration_seconds,
                rest_seconds: ex.rest_seconds,
                suggested_weight: ex.suggested_weight,
                notes: ex.notes
              }))
            )
          }
        }
      }
    }
  }

  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true, id: newRoutine.id }
}

export async function saveRoutineAsTemplateAction(routineId: string, templateName: string) {
  const supabase = await createClient()
  const { data: source, error: fetchErr } = await supabase
    .from("client_routines")
    .select("*")
    .eq("id", routineId)
    .single()

  if (fetchErr || !source) return { error: "No se encontró la rutina de origen" }

  const { data: newTpl, error: insertErr } = await supabase
    .from("routine_templates")
    .insert({
      gym_id: GYM_ID,
      name: templateName.trim(),
      description: source.description,
      goal: source.goal,
      custom_goal: source.custom_goal,
      level: source.level,
      days_per_week: source.days_per_week,
      notes: source.notes,
      is_active: true
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  const { data: days } = await supabase
    .from("client_routine_days")
    .select("*")
    .eq("routine_id", routineId)

  for (const day of days ?? []) {
    const { data: newDay } = await supabase
      .from("routine_template_days")
      .insert({
        template_id: newTpl.id,
        title: day.title,
        weekday: day.weekday,
        position: day.position
      })
      .select("id")
      .single()

    if (newDay) {
      const { data: blocks } = await supabase
        .from("client_routine_blocks")
        .select("*")
        .eq("routine_day_id", day.id)

      for (const block of blocks ?? []) {
        const { data: newBlock } = await supabase
          .from("routine_template_blocks")
          .insert({
            template_day_id: newDay.id,
            title: block.title,
            position: block.position
          })
          .select("id")
          .single()

        if (newBlock) {
          const { data: exercises } = await supabase
            .from("client_routine_exercises")
            .select("*")
            .eq("block_id", block.id)

          if (exercises && exercises.length > 0) {
            await supabase.from("routine_template_block_exercises").insert(
              (exercises as any[]).map((ex: any) => ({
                template_block_id: newBlock.id,
                exercise_id: ex.exercise_id,
                position: ex.position,
                sets: ex.sets,
                reps: ex.reps,
                duration_seconds: ex.duration_seconds,
                rest_seconds: ex.rest_seconds,
                suggested_weight: ex.suggested_weight,
                notes: ex.notes
              }))
            )
          }
        }
      }
    }
  }

  revalidatePath(ROUTES.ADMIN_RUTINAS_PLANTILLAS)
  return { success: true, id: newTpl.id }
}

// ── Fase 6 Actions — marcar hecho ──────────────────────────
export async function markRoutineSessionAction(routineId: string, routineDayId: string | null, sessionDate: string, status: RoutineSessionStatus = "completed", note?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single()

  if (!client) return { error: "No se encontró el perfil de cliente" }

  const { error } = await supabase
    .from("client_routine_sessions")
    .upsert({
      gym_id: GYM_ID,
      client_id: client.id,
      routine_id: routineId,
      routine_day_id: routineDayId,
      session_date: sessionDate,
      status,
      note: note ?? null
    }, {
      onConflict: "routine_id,session_date"
    })

  if (error) return { error: error.message }
  revalidatePath(clienteRutinaDetalle(routineId))
  revalidatePath(ROUTES.CLIENTE_RUTINAS)
  return { success: true }
}

export async function undoRoutineSessionAction(routineId: string, sessionDate: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("client_routine_sessions")
    .delete()
    .eq("routine_id", routineId)
    .eq("session_date", sessionDate)

  if (error) return { error: error.message }
  revalidatePath(clienteRutinaDetalle(routineId))
  revalidatePath(ROUTES.CLIENTE_RUTINAS)
  return { success: true }
}

interface ClientRoutineInput {
  title: string
  description?: string | null
  goal?: RoutineGoal | null
  custom_goal?: string | null
  level?: RoutineLevel | null
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
}
