"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidateTag } from "next/cache"
import { GYM_ID } from "@/constants/plans"
import { MUSCLE_GROUP_LABELS } from "@/types/exercise"
import type { ClassObjective, ClassLevel } from "@/services/classes.service"
import type { MuscleGroup } from "@/services/exercises.service"

const COMPLEMENTARY_GROUPS: Partial<Record<MuscleGroup, MuscleGroup[]>> = {
  pecho: ["triceps", "hombro"],
  espalda: ["biceps", "hombro"],
  pierna: ["gluteo", "abdomen", "movilidad"],
  gluteo: ["pierna", "abdomen"],
  hombro: ["triceps", "pecho"],
  biceps: ["espalda"],
  triceps: ["pecho", "hombro"],
  abdomen: ["movilidad"],
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00")
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]!
}

// Ordena el pool priorizando ejercicios NO usados esta semana, con algo de azar.
function prioritize<T extends { id: string }>(pool: T[], usedIds: Set<string>): T[] {
  const shuffle = (arr: T[]) => {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
  }
  const fresh = shuffle(pool.filter((e) => !usedIds.has(e.id)))
  const used = shuffle(pool.filter((e) => usedIds.has(e.id)))
  return [...fresh, ...used]
}

function objectiveTitle(o: ClassObjective): string {
  return o.charAt(0).toUpperCase() + o.slice(1)
}

// Genera un BORRADOR de rutina (biblioteca), no una clase directa.
// El profe revisa/edita en el editor normal y luego decide asignar o programar.
export async function generateTrainingRoutineDraftAction(params: {
  muscle_group: MuscleGroup
  objective: ClassObjective
  level: ClassLevel
  estimated_duration_minutes: number
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "No autenticado" }

  const groupLabel = MUSCLE_GROUP_LABELS[params.muscle_group] ?? params.muscle_group

  const { data: allExercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, exercise_type")
    .eq("gym_id", GYM_ID)
    .eq("is_active", true)

  if (!allExercises?.length) {
    return { success: false, error: "No hay ejercicios en la biblioteca. Agrega ejercicios primero." }
  }

  // Ejercicios ya usados esta semana en rutinas de biblioteca (para evitar repetir si hay alternativas).
  const today = new Date().toISOString().split("T")[0]!
  const monday = getMonday(today)
  const sunday = addDays(monday, 6)
  const { data: weekRoutines } = await supabase
    .from("training_routines")
    .select("id")
    .eq("gym_id", GYM_ID)
    .gte("created_at", `${monday}T00:00:00`)
    .lte("created_at", `${sunday}T23:59:59`)

  const usedIds = new Set<string>()
  if (weekRoutines?.length) {
    const { data: weekDays } = await supabase
      .from("training_routine_days")
      .select("id")
      .in("routine_id", weekRoutines.map((r) => r.id))
    if (weekDays?.length) {
      const { data: weekBlocks } = await supabase
        .from("training_routine_blocks")
        .select("id")
        .in("routine_day_id", weekDays.map((d) => d.id))
      if (weekBlocks?.length) {
        const { data: weekExercises } = await supabase
          .from("training_routine_exercises")
          .select("exercise_id")
          .in("block_id", weekBlocks.map((b) => b.id))
        for (const ex of weekExercises ?? []) usedIds.add(ex.exercise_id)
      }
    }
  }

  const warmupPool = allExercises.filter((e) => e.exercise_type === "movilidad" || e.exercise_type === "cardio")

  const mainType =
    params.objective === "cardio" ? "cardio"
    : params.objective === "movilidad" ? "movilidad"
    : params.objective === "tecnica" ? "tecnica"
    : "fuerza"

  const mainPool = allExercises.filter((e) => e.muscle_group === params.muscle_group && e.exercise_type === mainType)

  const compGroups = COMPLEMENTARY_GROUPS[params.muscle_group] ?? []
  const compPool = allExercises.filter((e) => compGroups.includes(e.muscle_group as MuscleGroup) && e.exercise_type === "fuerza")

  const abPool = allExercises.filter((e) => e.muscle_group === "abdomen" && e.exercise_type === "fuerza")

  if (mainPool.length === 0) {
    return {
      success: false,
      error: `No hay suficientes ejercicios de ${groupLabel} para generar una rutina completa. Agrega más ejercicios a la biblioteca o crea la rutina manualmente.`,
    }
  }

  const warmup = prioritize(warmupPool, usedIds).slice(0, 2)
  const mainCount = params.estimated_duration_minutes >= 60 ? 4 : 3
  const main = prioritize(mainPool, usedIds).slice(0, mainCount)
  const comp = prioritize(compPool, usedIds).slice(0, 2)
  const ab = prioritize(abPool, usedIds).slice(0, 1)

  const name = `${groupLabel} — ${objectiveTitle(params.objective)}`

  const { data: newRoutine, error: routineError } = await supabase
    .from("training_routines")
    .insert({
      gym_id: GYM_ID,
      name,
      goal: params.objective,
      level: params.level,
      days_per_week: 1,
      is_active: true
    })
    .select("id")
    .single()

  if (routineError || !newRoutine) return { success: false, error: routineError?.message }

  const { data: newDay } = await supabase
    .from("training_routine_days")
    .insert({ routine_id: newRoutine.id, title: "Día 1", weekday: null, position: 0 })
    .select("id")
    .single()

  if (!newDay) return { success: true, id: newRoutine.id }

  const blocks: Array<{ title: string; exercises: typeof warmup }> = []
  if (warmup.length > 0) blocks.push({ title: "Calentamiento", exercises: warmup })
  if (main.length > 0) blocks.push({ title: "Trabajo principal", exercises: main })
  if (comp.length > 0) blocks.push({ title: "Complementarios", exercises: comp })
  if (ab.length > 0) blocks.push({ title: "Abdomen", exercises: ab })

  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i]!
    const { data: newBlock } = await supabase
      .from("training_routine_blocks")
      .insert({ routine_day_id: newDay.id, title: blk.title, position: i })
      .select("id")
      .single()

    if (!newBlock) continue

    const isStrength = blk.title !== "Calentamiento"
    for (let j = 0; j < blk.exercises.length; j++) {
      const ex = blk.exercises[j]!
      await supabase.from("training_routine_exercises").insert({
        block_id: newBlock.id,
        exercise_id: ex.id,
        position: j,
        sets: isStrength ? 3 : null,
        reps: isStrength ? 12 : null,
        duration_seconds: !isStrength ? 600 : null,
        rest_seconds: isStrength ? 60 : 30,
      })
    }
  }

  revalidateTag("training-routines", "max")
  return { success: true, id: newRoutine.id }
}
