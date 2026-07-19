"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/require-admin"
import { GYM_ID } from "@/constants/plans"
import { ROUTES, adminRutinaBibliotecaDetalle } from "@/constants/routes"
import type { RoutineGoal, RoutineLevel, Weekday } from "@/types/routine"

const STANDARD_BLOCK_TITLES = [
  "Calentamiento",
  "Trabajo principal"
]

function revalidateRoutines(routineId?: string) {
  updateTag("training-routines")
  revalidatePath(ROUTES.ADMIN_ENTRENAMIENTO)
  if (routineId) {
    revalidatePath(adminRutinaBibliotecaDetalle(routineId))
  }
}

export async function createTrainingRoutineAction(data: {
  name: string
  goal?: RoutineGoal
  custom_goal?: string
  level?: RoutineLevel
  days_per_week?: number
  notes?: string
}) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()

  const customGoal = data.goal === "otro" ? data.custom_goal?.trim() || null : null
  if (data.goal === "otro" && (!customGoal || customGoal.length > 60)) {
    return { error: "Escribe un objetivo de hasta 60 caracteres" }
  }

  const { data: routine, error } = await supabase
    .from("training_routines")
    .insert({
      gym_id: GYM_ID,
      name: data.name.trim(),
      goal: data.goal ?? null,
      custom_goal: customGoal,
      level: data.level ?? null,
      days_per_week: data.days_per_week ?? null,
      notes: data.notes ?? null,
      is_active: true
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  const totalDays = data.days_per_week ?? 1
  for (let i = 1; i <= totalDays; i++) {
    const { data: dayData } = await supabase
      .from("training_routine_days")
      .insert({
        routine_id: routine.id,
        title: `Día ${i}`,
        weekday: null,
        position: i - 1
      })
      .select("id")
      .single()

    if (dayData) {
      await supabase.from("training_routine_blocks").insert(
        STANDARD_BLOCK_TITLES.map((title, idx) => ({
          routine_day_id: dayData.id,
          title,
          position: idx
        }))
      )
    }
  }

  revalidateRoutines()
  return { success: true, id: routine.id }
}

export async function updateTrainingRoutineMetaAction(id: string, data: {
  name?: string
  goal?: RoutineGoal | null
  custom_goal?: string | null
  level?: RoutineLevel | null
  days_per_week?: number | null
  notes?: string | null
  is_active?: boolean
}) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from("training_routines")
    .update({
      ...data,
      name: data.name ? data.name.trim() : undefined,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)

  if (error) return { error: error.message }
  revalidateRoutines(id)
  return { success: true }
}

export async function deleteTrainingRoutineAction(id: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { error } = await supabase
    .from("training_routines")
    .delete()
    .eq("id", id)
    .eq("gym_id", GYM_ID)

  if (error) return { error: error.message }
  revalidateRoutines()
  return { success: true }
}

export async function duplicateTrainingRoutineAction(id: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data: source, error: fetchErr } = await supabase
    .from("training_routines")
    .select("name, description, goal, custom_goal, level, days_per_week, notes")
    .eq("id", id)
    .single()

  if (fetchErr || !source) return { error: "No se encontró la rutina de origen" }

  const { data: newRoutine, error: insertErr } = await supabase
    .from("training_routines")
    .insert({
      gym_id: GYM_ID,
      name: `${source.name} (Copia)`,
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
    .from("training_routine_days")
    .select("id, title, weekday, position")
    .eq("routine_id", id)

  for (const day of days ?? []) {
    const { data: newDay } = await supabase
      .from("training_routine_days")
      .insert({
        routine_id: newRoutine.id,
        title: day.title,
        weekday: day.weekday,
        position: day.position
      })
      .select("id")
      .single()

    if (!newDay) continue

    const { data: blocks } = await supabase
      .from("training_routine_blocks")
      .select("id, title, position")
      .eq("routine_day_id", day.id)

    for (const block of blocks ?? []) {
      const { data: newBlock } = await supabase
        .from("training_routine_blocks")
        .insert({
          routine_day_id: newDay.id,
          title: block.title,
          position: block.position
        })
        .select("id")
        .single()

      if (!newBlock) continue

      const { data: exercises } = await supabase
        .from("training_routine_exercises")
        .select("exercise_id, position, sets, reps, duration_seconds, rest_seconds, suggested_weight, notes")
        .eq("block_id", block.id)

      if (exercises && exercises.length > 0) {
        await supabase.from("training_routine_exercises").insert(
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

  revalidateRoutines()
  return { success: true, id: newRoutine.id }
}

// ── Guardar una clase (daily_class) en la biblioteca (1 solo día) ──
export async function saveClassAsTrainingRoutineAction(classId: string, name: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data: dc, error: fetchErr } = await supabase
    .from("daily_classes")
    .select("objective, level, notes")
    .eq("id", classId)
    .single()

  if (fetchErr || !dc) return { error: "No se encontró la clase de origen" }

  const { data: newRoutine, error: insertErr } = await supabase
    .from("training_routines")
    .insert({
      gym_id: GYM_ID,
      name: name.trim(),
      goal: dc.objective,
      level: dc.level,
      days_per_week: 1,
      notes: dc.notes,
      is_active: true
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  const { data: newDay } = await supabase
    .from("training_routine_days")
    .insert({ routine_id: newRoutine.id, title: "Día 1", weekday: null, position: 0 })
    .select("id")
    .single()

  if (newDay) {
    const { data: blocks } = await supabase
      .from("class_blocks")
      .select("id, title, position")
      .eq("daily_class_id", classId)

    for (const block of blocks ?? []) {
      const { data: newBlock } = await supabase
        .from("training_routine_blocks")
        .insert({ routine_day_id: newDay.id, title: block.title, position: block.position })
        .select("id")
        .single()

      if (newBlock) {
        const { data: exercises } = await supabase
          .from("class_block_exercises")
          .select("exercise_id, position, sets, reps, duration_seconds, rest_seconds, suggested_weight, notes")
          .eq("block_id", block.id)

        if (exercises && exercises.length > 0) {
          await supabase.from("training_routine_exercises").insert(
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

  revalidateRoutines()
  return { success: true, id: newRoutine.id }
}

// ── Guardar una asignación (client_routines) en la biblioteca ──
export async function saveAsTrainingRoutineAction(routineId: string, name: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data: source, error: fetchErr } = await supabase
    .from("client_routines")
    .select("description, goal, custom_goal, level, days_per_week, notes")
    .eq("id", routineId)
    .single()

  if (fetchErr || !source) return { error: "No se encontró la rutina de origen" }

  const { data: newRoutine, error: insertErr } = await supabase
    .from("training_routines")
    .insert({
      gym_id: GYM_ID,
      name: name.trim(),
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
    .select("id, title, weekday, position")
    .eq("routine_id", routineId)

  for (const day of days ?? []) {
    const { data: newDay } = await supabase
      .from("training_routine_days")
      .insert({
        routine_id: newRoutine.id,
        title: day.title,
        weekday: day.weekday,
        position: day.position
      })
      .select("id")
      .single()

    if (!newDay) continue

    const { data: blocks } = await supabase
      .from("client_routine_blocks")
      .select("id, title, position")
      .eq("routine_day_id", day.id)

    for (const block of blocks ?? []) {
      const { data: newBlock } = await supabase
        .from("training_routine_blocks")
        .insert({
          routine_day_id: newDay.id,
          title: block.title,
          position: block.position
        })
        .select("id")
        .single()

      if (!newBlock) continue

      const { data: exercises } = await supabase
        .from("client_routine_exercises")
        .select("exercise_id, position, sets, reps, duration_seconds, rest_seconds, suggested_weight, notes")
        .eq("block_id", block.id)

      if (exercises && exercises.length > 0) {
        await supabase.from("training_routine_exercises").insert(
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

  revalidateRoutines()
  return { success: true, id: newRoutine.id }
}

// ── Asignar a cliente (copia independiente hacia client_routines) ──
export async function assignTrainingRoutineToClientAction(routineId: string, clientId: string) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: rt, error: fetchErr } = await supabase
    .from("training_routines")
    .select("name, description, goal, custom_goal, level, days_per_week, notes")
    .eq("id", routineId)
    .single()

  if (fetchErr || !rt) return { error: "No se encontró la rutina" }

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
      source_type: "training_routine",
      source_id: routineId,
      notes: rt.notes,
      created_by: user.id,
      created_by_role: "admin"
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  const { data: days } = await supabase
    .from("training_routine_days")
    .select("id, title, weekday, position")
    .eq("routine_id", routineId)

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

    if (!newDay) continue

    const { data: blocks } = await supabase
      .from("training_routine_blocks")
      .select("id, title, position")
      .eq("routine_day_id", day.id)

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

      if (!newBlock) continue

      const { data: exercises } = await supabase
        .from("training_routine_exercises")
        .select("exercise_id, position, sets, reps, duration_seconds, rest_seconds, suggested_weight, notes")
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

  revalidateRoutines()
  updateTag("admin-routines")
  revalidatePath(ROUTES.ADMIN_RUTINAS)
  return { success: true, id: newRoutine.id }
}

// daily_classes.objective solo acepta el vocabulario técnico de clases (CHECK en DB),
// pero una rutina puede tener objetivo en vocabulario de cliente. Se traduce al programar.
const CLIENT_GOAL_TO_CLASS_OBJECTIVE: Record<string, string> = {
  ganar_musculo: "hipertrofia",
  bajar_peso: "cardio",
  mejorar_resistencia: "cardio",
  tonificar: "hipertrofia",
  mantenerse_activo: "general",
  otro: "general",
}

// ── Programar en clase (copia independiente hacia daily_classes) ──
export async function scheduleTrainingRoutineAsClassAction(
  routineId: string,
  routineDayId: string,
  classDate: string,
  time?: string,
  notes?: string
) {
  const guard = await requireAdmin()
  if ("error" in guard) return { error: guard.error }
  const { supabase, user } = guard

  const [{ data: rt, error: rtErr }, { data: day, error: dayErr }] = await Promise.all([
    supabase.from("training_routines").select("name, goal, level").eq("id", routineId).single(),
    supabase.from("training_routine_days").select("id").eq("id", routineDayId).single()
  ])

  if (rtErr || !rt) return { error: "No se encontró la rutina" }
  if (dayErr || !day) return { error: "No se encontró el día de la rutina" }

  // daily_classes no tiene columna de hora: se antepone a las notas para no perderla.
  const mergedNotes = [time ? `Hora: ${time}` : null, notes?.trim() || null].filter(Boolean).join(" · ") || null

  // Normalizar el objetivo al vocabulario técnico de clases (el CHECK de daily_classes
  // rechaza valores del vocabulario cliente como "ganar_musculo").
  const CLASS_OBJECTIVES = new Set(["fuerza", "hipertrofia", "cardio", "tecnica", "movilidad", "full_body", "general"])
  const classObjective = rt.goal
    ? (CLASS_OBJECTIVES.has(rt.goal) ? rt.goal : CLIENT_GOAL_TO_CLASS_OBJECTIVE[rt.goal] ?? null)
    : null

  const { data: newClass, error: insertErr } = await supabase
    .from("daily_classes")
    .insert({
      gym_id: GYM_ID,
      title: rt.name,
      class_date: classDate,
      objective: classObjective,
      level: rt.level,
      status: "published",
      notes: mergedNotes,
      created_by: user.id,
      source_routine_id: routineId,
      source_routine_day_id: routineDayId
    })
    .select("id")
    .single()

  if (insertErr) return { error: insertErr.message }

  const { data: blocks } = await supabase
    .from("training_routine_blocks")
    .select("id, title, position")
    .eq("routine_day_id", routineDayId)

  for (const block of blocks ?? []) {
    const { data: newBlock } = await supabase
      .from("class_blocks")
      .insert({
        daily_class_id: newClass.id,
        title: block.title,
        position: block.position
      })
      .select("id")
      .single()

    if (!newBlock) continue

    const { data: exercises } = await supabase
      .from("training_routine_exercises")
      .select("exercise_id, position, sets, reps, duration_seconds, rest_seconds, suggested_weight, notes")
      .eq("block_id", block.id)

    if (exercises && exercises.length > 0) {
      await supabase.from("class_block_exercises").insert(
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

  revalidateRoutines()
  updateTag("daily-classes")
  revalidatePath(ROUTES.ADMIN_CLASES)
  return { success: true, id: newClass.id }
}

// ── Días ──────────────────────────────────────────────────
export async function addTrainingRoutineDayAction(routineId: string, title: string, weekday: Weekday | null, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("training_routine_days")
    .insert({ routine_id: routineId, title: title.trim(), weekday, position })
    .select("id")
    .single()

  if (error) return { error: error.message }

  const { data: blocksData } = await supabase
    .from("training_routine_blocks")
    .insert(
      STANDARD_BLOCK_TITLES.map((tTitle, i) => ({
        routine_day_id: data.id,
        title: tTitle,
        position: i
      }))
    )
    .select("id, title, position")

  revalidateRoutines(routineId)
  return { success: true, id: data.id, blocks: blocksData ?? [] }
}

export async function updateTrainingRoutineDayAction(dayId: string, routineId: string, title: string, weekday: Weekday | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("training_routine_days")
    .update({ title: title.trim(), weekday })
    .eq("id", dayId)

  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true }
}

export async function deleteTrainingRoutineDayAction(dayId: string, routineId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("training_routine_days")
    .delete()
    .eq("id", dayId)

  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true }
}

export async function moveTrainingRoutineDayAction(routineId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("training_routine_days").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidateRoutines(routineId)
  return { success: true }
}

// ── Bloques ───────────────────────────────────────────────
export async function addTrainingRoutineBlockAction(dayId: string, routineId: string, title: string, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("training_routine_blocks")
    .insert({ routine_day_id: dayId, title: title.trim(), position })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true, id: data.id }
}

export async function updateTrainingRoutineBlockTitleAction(blockId: string, routineId: string, title: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("training_routine_blocks")
    .update({ title: title.trim() })
    .eq("id", blockId)

  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true }
}

export async function deleteTrainingRoutineBlockAction(blockId: string, routineId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("training_routine_blocks").delete().eq("id", blockId)
  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true }
}

export async function moveTrainingRoutineBlockAction(dayId: string, routineId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("training_routine_blocks").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidateRoutines(routineId)
  return { success: true }
}

// ── Ejercicios en bloque ──────────────────────────────────
export async function addExerciseToTrainingRoutineBlockAction(blockId: string, routineId: string, exerciseId: string, position: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("training_routine_exercises")
    .insert({
      block_id: blockId,
      exercise_id: exerciseId,
      position,
      sets: 3,
      reps: 10
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true, id: data.id }
}

export async function updateTrainingRoutineBlockExerciseAction(exerciseRowId: string, routineId: string, data: {
  sets?: number | null
  reps?: number | null
  duration_seconds?: number | null
  rest_seconds?: number | null
  suggested_weight?: string | null
  notes?: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("training_routine_exercises")
    .update(data)
    .eq("id", exerciseRowId)

  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true }
}

export async function removeExerciseFromTrainingRoutineBlockAction(exerciseRowId: string, routineId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("training_routine_exercises").delete().eq("id", exerciseRowId)
  if (error) return { error: error.message }
  revalidateRoutines(routineId)
  return { success: true }
}

export async function moveTrainingRoutineBlockExerciseAction(blockId: string, routineId: string, orderedIds: string[]) {
  const supabase = await createClient()
  const promises = orderedIds.map((id, index) =>
    supabase.from("training_routine_exercises").update({ position: index }).eq("id", id)
  )
  await Promise.all(promises)
  revalidatePath(adminRutinaBibliotecaDetalle(routineId))
  return { success: true }
}
