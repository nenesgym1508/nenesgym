import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type { RoutineGoal, RoutineLevel, Weekday } from "@/types/routine"
import type { MuscleGroup, Equipment } from "@/types/exercise"

export interface RoutineTemplate {
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
}

export interface RoutineTemplateDay {
  id: string
  template_id: string
  title: string
  weekday: Weekday | null
  position: number
  blocks: RoutineTemplateBlock[]
}

export interface RoutineTemplateBlock {
  id: string
  template_day_id: string
  title: string
  position: number
  exercises: RoutineTemplateBlockExercise[]
}

export interface RoutineTemplateBlockExercise {
  id: string
  template_block_id: string
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

export async function getRoutineTemplates(): Promise<RoutineTemplate[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("routine_templates")
    .select("*")
    .eq("gym_id", GYM_ID)
    .eq("is_active", true)
    .order("name")

  const templates = (data ?? []) as RoutineTemplate[]
  if (templates.length === 0) return templates

  const { data: days } = await supabase
    .from("routine_template_days")
    .select("id, template_id")
    .in("template_id", templates.map((t: any) => t.id))

  if (!days || days.length === 0) {
    return templates.map((t) => ({ ...t, exercise_count: 0 }))
  }

  const { data: blocks } = await supabase
    .from("routine_template_blocks")
    .select("id, template_day_id")
    .in("template_day_id", (days as any[]).map((d: any) => d.id))

  if (!blocks || blocks.length === 0) {
    return templates.map((t) => ({ ...t, exercise_count: 0 }))
  }

  const { data: exercises } = await supabase
    .from("routine_template_block_exercises")
    .select("id, template_block_id")
    .in("template_block_id", (blocks as any[]).map((b: any) => b.id))

  const counts = new Map<string, number>()
  const dayToTemplate = new Map<string, string>()
  const blockToTemplate = new Map<string, string>()

  for (const d of (days as any[])) {
    dayToTemplate.set(d.id, d.template_id)
  }
  for (const b of (blocks as any[])) {
    const tId = dayToTemplate.get(b.template_day_id)
    if (tId) blockToTemplate.set(b.id, tId)
  }
  for (const ex of (exercises ?? []) as any[]) {
    const tId = blockToTemplate.get(ex.template_block_id)
    if (tId) {
      counts.set(tId, (counts.get(tId) ?? 0) + 1)
    }
  }

  return templates.map((t) => ({
    ...t,
    exercise_count: counts.get(t.id) ?? 0,
  }))
}

export async function getRoutineTemplateWithDays(id: string): Promise<(RoutineTemplate & { days: RoutineTemplateDay[] }) | null> {
  const supabase = await createClient()

  const [{ data: tpl }, { data: days }] = await Promise.all([
    supabase.from("routine_templates").select("*").eq("id", id).eq("gym_id", GYM_ID).single(),
    supabase
      .from("routine_template_days")
      .select(
        "*, blocks:routine_template_blocks(*, exercises:routine_template_block_exercises(*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)))"
      )
      .eq("template_id", id)
      .order("position")
      .order("position", { referencedTable: "blocks" })
      .order("position", { referencedTable: "blocks.exercises" }),
  ])

  if (!tpl) return null

  const daysWithBlocks: RoutineTemplateDay[] = (days ?? []).map((day) => ({
    ...day,
    weekday: day.weekday as Weekday | null,
    blocks: (day.blocks ?? []) as RoutineTemplateBlock[],
  }))

  return {
    ...(tpl as RoutineTemplate),
    days: daysWithBlocks,
  }
}
