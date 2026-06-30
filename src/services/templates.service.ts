import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"

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
  return (data ?? []) as ClassTemplate[]
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
      .select("*, exercise:exercises(id, name, muscle_group)")
      .eq("template_block_id", block.id)
      .order("position")
    blocksWithExercises.push({ ...block, exercises: (exercises ?? []) as TemplateBlockExercise[] })
  }

  return { ...(tpl as ClassTemplate), blocks: blocksWithExercises }
}
