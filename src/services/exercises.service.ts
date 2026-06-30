import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type { MuscleGroup, Equipment, ExerciseType, Exercise } from "@/types/exercise"

// Re-export types and labels so server components can import from here
export type { MuscleGroup, Equipment, ExerciseType, Exercise }
export {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
} from "@/types/exercise"

export async function getExercises(filters?: {
  muscle_group?: MuscleGroup
  exercise_type?: ExerciseType
  search?: string
  includeInactive?: boolean
}): Promise<Exercise[]> {
  const supabase = await createClient()
  let query = supabase
    .from("exercises")
    .select("*")
    .eq("gym_id", GYM_ID)
    .order("name")

  if (!filters?.includeInactive) query = query.eq("is_active", true)
  if (filters?.muscle_group) query = query.eq("muscle_group", filters.muscle_group)
  if (filters?.exercise_type) query = query.eq("exercise_type", filters.exercise_type)
  if (filters?.search) query = query.ilike("name", `%${filters.search}%`)

  const { data } = await query
  return (data ?? []) as Exercise[]
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .eq("gym_id", GYM_ID)
    .single()
  return (data as Exercise | null) ?? null
}
