import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type { RoutineGoal, RoutineLevel, Weekday } from "@/types/routine"
import type { MuscleGroup, Equipment } from "@/types/exercise"
import { unstable_cache } from "next/cache"

export interface TrainingRoutine {
  id: string
  gym_id: string
  name: string
  description: string | null
  goal: RoutineGoal | null
  custom_goal: string | null
  level: RoutineLevel | null
  days_per_week: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  exercise_count?: number
  assigned_count?: number
  scheduled_count?: number
}


export interface TrainingRoutineDay {
  id: string
  routine_id: string
  title: string
  weekday: Weekday | null
  position: number
  blocks: TrainingRoutineBlock[]
}

export interface TrainingRoutineBlock {
  id: string
  routine_day_id: string
  title: string
  position: number
  exercises: TrainingRoutineExercise[]
}

export interface TrainingRoutineExercise {
  id: string
  block_id: string
  exercise_id: string
  position: number
  sets: number | null
  reps: number | null
  duration_seconds: number | null
  rest_seconds: number | null
  suggested_weight: string | null
  notes: string | null
  exercise: {
    id: string
    name: string
    muscle_group: string | null
    exercise_type: string | null
    equipment: Equipment | null
    secondary_muscle_groups: MuscleGroup[] | null
    media_url: string | null
    instructions: string | null
  }
}

export function getTrainingRoutines(search?: string): Promise<TrainingRoutine[]> {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      let query = supabase
        .from("training_routines")
        .select("*")
        .eq("gym_id", GYM_ID)
        .order("name")

      if (search?.trim()) {
        query = query.ilike("name", `%${search.trim()}%`)
      }

      const { data } = await query
      const routines = (data ?? []) as TrainingRoutine[]
      if (routines.length === 0) return routines

      const routineIds = routines.map((r) => r.id)

      const [{ data: days }, { data: assignments }, { data: scheduled }] = await Promise.all([
        supabase.from("training_routine_days").select("id, routine_id").in("routine_id", routineIds),
        supabase.from("client_routines").select("id, source_id").eq("source_type", "training_routine").in("source_id", routineIds),
        supabase.from("daily_classes").select("id, source_routine_id").in("source_routine_id", routineIds),
      ])

      const assignedCounts = new Map<string, number>()
      for (const a of (assignments ?? []) as any[]) {
        assignedCounts.set(a.source_id, (assignedCounts.get(a.source_id) ?? 0) + 1)
      }
      const scheduledCounts = new Map<string, number>()
      for (const s of (scheduled ?? []) as any[]) {
        scheduledCounts.set(s.source_routine_id, (scheduledCounts.get(s.source_routine_id) ?? 0) + 1)
      }

      if (!days || days.length === 0) {
        return routines.map((r) => ({
          ...r,
          exercise_count: 0,
          assigned_count: assignedCounts.get(r.id) ?? 0,
          scheduled_count: scheduledCounts.get(r.id) ?? 0,
        }))
      }

      const { data: blocks } = await supabase
        .from("training_routine_blocks")
        .select("id, routine_day_id")
        .in("routine_day_id", (days as any[]).map((d: any) => d.id))

      const dayToRoutine = new Map<string, string>()
      for (const d of days as any[]) dayToRoutine.set(d.id, d.routine_id)

      if (!blocks || blocks.length === 0) {
        return routines.map((r) => ({
          ...r,
          exercise_count: 0,
          assigned_count: assignedCounts.get(r.id) ?? 0,
          scheduled_count: scheduledCounts.get(r.id) ?? 0,
        }))
      }

      const { data: exercises } = await supabase
        .from("training_routine_exercises")
        .select("id, block_id")
        .in("block_id", (blocks as any[]).map((b: any) => b.id))

      const blockToRoutine = new Map<string, string>()
      for (const b of blocks as any[]) {
        const rId = dayToRoutine.get(b.routine_day_id)
        if (rId) blockToRoutine.set(b.id, rId)
      }

      const exerciseCounts = new Map<string, number>()
      for (const ex of (exercises ?? []) as any[]) {
        const rId = blockToRoutine.get(ex.block_id)
        if (rId) exerciseCounts.set(rId, (exerciseCounts.get(rId) ?? 0) + 1)
      }

      return routines.map((r) => ({
        ...r,
        exercise_count: exerciseCounts.get(r.id) ?? 0,
        assigned_count: assignedCounts.get(r.id) ?? 0,
        scheduled_count: scheduledCounts.get(r.id) ?? 0,
      }))
    },
    ["training-routines", search || ""],
    { revalidate: 3600, tags: ["training-routines"] }
  )()
}

export interface TrainingRoutineWithDayOptions extends TrainingRoutine {
  days: { id: string; title: string }[]
}

// Versión liviana para pickers (Programar en clase / Nueva clase): trae solo id+title de los días, sin bloques/ejercicios.
export async function getTrainingRoutinesWithDayOptions(): Promise<TrainingRoutineWithDayOptions[]> {
  const supabase = await createClient()
  const { data: routines } = await supabase
    .from("training_routines")
    .select("*")
    .eq("gym_id", GYM_ID)
    .eq("is_active", true)
    .order("name")

  const list = (routines ?? []) as TrainingRoutine[]
  if (list.length === 0) return []

  const { data: days } = await supabase
    .from("training_routine_days")
    .select("id, title, routine_id, position")
    .in("routine_id", list.map((r) => r.id))
    .order("position")

  return list.map((r) => ({
    ...r,
    days: (days ?? []).filter((d: any) => d.routine_id === r.id).map((d: any) => ({ id: d.id, title: d.title })),
  }))
}

export async function getTrainingRoutineWithDays(id: string): Promise<(TrainingRoutine & { days: TrainingRoutineDay[] }) | null> {
  const supabase = await createClient()

  const [{ data: routine }, { data: days }] = await Promise.all([
    supabase.from("training_routines").select("*").eq("id", id).eq("gym_id", GYM_ID).single(),
    supabase
      .from("training_routine_days")
      .select(
        "*, blocks:training_routine_blocks(*, exercises:training_routine_exercises(*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)))"
      )
      .eq("routine_id", id)
      .order("position")
      .order("position", { referencedTable: "blocks" })
      .order("position", { referencedTable: "blocks.exercises" }),
  ])

  if (!routine) return null

  const daysWithBlocks: TrainingRoutineDay[] = (days ?? []).map((day) => ({
    ...day,
    weekday: day.weekday as Weekday | null,
    blocks: (day.blocks ?? []) as TrainingRoutineBlock[],
  }))

  return {
    ...(routine as TrainingRoutine),
    days: daysWithBlocks,
  }
}
