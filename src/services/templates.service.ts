import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type { MuscleGroup, Equipment } from "@/types/exercise"

export interface ClassTemplate {
  id: string
  gym_id: string
  name: string
  objective: string | null
  level: string | null
  estimated_duration_minutes: number | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  exercise_count?: number
}

export interface TemplateBlock {
  id: string
  template_id: string
  title: string
  position: number
  exercises: TemplateBlockExercise[]
}

export interface TemplateBlockExercise {
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

export async function getTemplates(): Promise<ClassTemplate[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("class_templates")
    .select("*")
    .eq("gym_id", GYM_ID)
    .eq("is_active", true)
    .order("name")

  const templates = (data ?? []) as ClassTemplate[]
  if (templates.length === 0) return templates

  const { data: blocks } = await supabase
    .from("template_blocks")
    .select("template_id, template_block_exercises(id)")
    .in("template_id", templates.map((t) => t.id))

  const counts = new Map<string, number>()
  for (const b of (blocks ?? []) as { template_id: string; template_block_exercises: { id: string }[] | null }[]) {
    const n = b.template_block_exercises?.length ?? 0
    counts.set(b.template_id, (counts.get(b.template_id) ?? 0) + n)
  }

  return templates.map((t) => ({ ...t, exercise_count: counts.get(t.id) ?? 0 }))
}

export async function getTemplateWithBlocks(id: string): Promise<(ClassTemplate & { blocks: TemplateBlock[] }) | null> {
  const supabase = await createClient()
  const { data: tpl } = await supabase
    .from("class_templates")
    .select("*")
    .eq("id", id)
    .eq("gym_id", GYM_ID)
    .single()

  if (!tpl) return null

  const { data: blocks } = await supabase
    .from("template_blocks")
    .select("*")
    .eq("template_id", id)
    .order("position")

  const blocksWithExercises: TemplateBlock[] = []
  for (const block of blocks ?? []) {
    const { data: exercises } = await supabase
      .from("template_block_exercises")
      .select("*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)")
      .eq("template_block_id", block.id)
      .order("position")
    blocksWithExercises.push({ ...block, exercises: (exercises ?? []) as TemplateBlockExercise[] })
  }

  return { ...(tpl as ClassTemplate), blocks: blocksWithExercises }
}
