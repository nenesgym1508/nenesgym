"use server"

import { createClient } from "@/lib/supabase/server"
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

export async function generateClassAction(params: {
  class_date: string
  muscle_group: MuscleGroup
  objective: ClassObjective
  level: ClassLevel
  estimated_duration_minutes: number
  force?: boolean
}): Promise<{ success: boolean; id?: string; error?: string; warning?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "No autenticado" }
  const userId = user.id

  const groupLabel = MUSCLE_GROUP_LABELS[params.muscle_group] ?? params.muscle_group

  // Aviso (no bloqueo) si ayer se trabajó el mismo grupo muscular.
  if (!params.force) {
    const yesterday = addDays(params.class_date, -1)
    const { data: prevClass } = await supabase
      .from("daily_classes")
      .select("id")
      .eq("gym_id", GYM_ID)
      .eq("class_date", yesterday)
      .neq("status", "archived")
      .maybeSingle()

    if (prevClass) {
      const { data: prevBlocks } = await supabase
        .from("class_blocks")
        .select("class_block_exercises(exercise:exercises(muscle_group))")
        .eq("daily_class_id", prevClass.id)

      const prevGroups = new Set<string>()
      for (const b of prevBlocks ?? []) {
        for (const be of (b.class_block_exercises ?? []) as { exercise: { muscle_group: string | null } | null }[]) {
          if (be.exercise?.muscle_group) prevGroups.add(be.exercise.muscle_group)
        }
      }
      if (prevGroups.has(params.muscle_group)) {
        return {
          success: false,
          warning: `Ayer también preparaste ${groupLabel}. ¿Quieres continuar?`,
        }
      }
    }
  }

  // Obtener ejercicios activos del gym
  const { data: allExercises } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, exercise_type")
    .eq("gym_id", GYM_ID)
    .eq("is_active", true)

  if (!allExercises?.length) {
    return { success: false, error: "No hay ejercicios en la biblioteca. Agrega ejercicios primero." }
  }

  // Ejercicios ya usados esta semana (para evitar repetir si hay alternativas).
  const monday = getMonday(params.class_date)
  const sunday = addDays(monday, 6)
  const { data: weekClasses } = await supabase
    .from("daily_classes")
    .select("id")
    .eq("gym_id", GYM_ID)
    .gte("class_date", monday)
    .lte("class_date", sunday)
    .neq("status", "archived")

  const usedIds = new Set<string>()
  if (weekClasses?.length) {
    const { data: weekBlocks } = await supabase
      .from("class_blocks")
      .select("class_block_exercises(exercise_id)")
      .in("daily_class_id", weekClasses.map((c) => c.id))
    for (const b of weekBlocks ?? []) {
      for (const be of (b.class_block_exercises ?? []) as { exercise_id: string }[]) {
        usedIds.add(be.exercise_id)
      }
    }
  }

  // Calentamiento: movilidad o cardio (cualquier grupo muscular)
  const warmupPool = allExercises.filter(
    (e) => e.exercise_type === "movilidad" || e.exercise_type === "cardio"
  )

  // Principales: para hipertrofia/fuerza usamos type='fuerza'.
  const mainType =
    params.objective === "cardio" ? "cardio"
    : params.objective === "movilidad" ? "movilidad"
    : params.objective === "tecnica" ? "tecnica"
    : "fuerza"

  const mainPool = allExercises.filter(
    (e) => e.muscle_group === params.muscle_group && e.exercise_type === mainType
  )

  const compGroups = COMPLEMENTARY_GROUPS[params.muscle_group] ?? []
  const compPool = allExercises.filter(
    (e) => compGroups.includes(e.muscle_group as MuscleGroup) && e.exercise_type === "fuerza"
  )

  const abPool = allExercises.filter(
    (e) => e.muscle_group === "abdomen" && e.exercise_type === "fuerza"
  )

  if (mainPool.length === 0) {
    return {
      success: false,
      error: `No hay suficientes ejercicios de ${groupLabel} para generar una clase completa. Agrega más ejercicios a la biblioteca o crea la clase manualmente.`,
    }
  }

  // Selección priorizando ejercicios frescos de la semana.
  const warmup = prioritize(warmupPool, usedIds).slice(0, 2)
  const mainCount = params.estimated_duration_minutes >= 60 ? 4 : 3
  const main = prioritize(mainPool, usedIds).slice(0, mainCount)
  const comp = prioritize(compPool, usedIds).slice(0, 2)
  const ab = prioritize(abPool, usedIds).slice(0, 1)

  const title = `${groupLabel} — ${CLASS_OBJECTIVE_TITLE(params.objective)}`

  const { data: newClass, error: classError } = await supabase
    .from("daily_classes")
    .insert({
      gym_id: GYM_ID,
      title,
      class_date: params.class_date,
      objective: params.objective,
      level: params.level,
      estimated_duration_minutes: params.estimated_duration_minutes,
      status: "draft",
      created_by: userId,
    })
    .select("id")
    .single()

  if (classError || !newClass) return { success: false, error: classError?.message }

  const blocks: Array<{ title: string; exercises: typeof warmup }> = []
  if (warmup.length > 0) blocks.push({ title: "Calentamiento", exercises: warmup })
  if (main.length > 0) blocks.push({ title: "Trabajo principal", exercises: main })
  if (comp.length > 0) blocks.push({ title: "Complementarios", exercises: comp })
  if (ab.length > 0) blocks.push({ title: "Abdomen", exercises: ab })

  for (let i = 0; i < blocks.length; i++) {
    const blk = blocks[i]!
    const { data: newBlock } = await supabase
      .from("class_blocks")
      .insert({ daily_class_id: newClass.id, title: blk.title, position: i })
      .select("id")
      .single()

    if (!newBlock) continue

    const isStrength = blk.title !== "Calentamiento"
    for (let j = 0; j < blk.exercises.length; j++) {
      const ex = blk.exercises[j]!
      await supabase.from("class_block_exercises").insert({
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

  return { success: true, id: newClass.id }
}

function CLASS_OBJECTIVE_TITLE(o: ClassObjective): string {
  return o.charAt(0).toUpperCase() + o.slice(1)
}
