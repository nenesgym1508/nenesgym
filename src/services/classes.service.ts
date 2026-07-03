import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type {
  ClassObjective, ClassLevel, ClassStatus,
  BlockExercise, ClassBlock, DailyClass, DailyClassWithBlocks,
} from "@/types/class"
import type { MuscleGroup } from "@/types/exercise"

// Re-export types and labels so server components can import from here
export type { ClassObjective, ClassLevel, ClassStatus, BlockExercise, ClassBlock, DailyClass, DailyClassWithBlocks }
export { CLASS_OBJECTIVE_LABELS, CLASS_LEVEL_LABELS } from "@/types/class"

export async function getDailyClasses(options?: {
  from?: string
  to?: string
  limit?: number
}): Promise<DailyClass[]> {
  const supabase = await createClient()
  let query = supabase
    .from("daily_classes")
    .select("*")
    .eq("gym_id", GYM_ID)
    .order("class_date", { ascending: false })

  if (options?.from) query = query.gte("class_date", options.from)
  if (options?.to) query = query.lte("class_date", options.to)
  if (options?.limit) query = query.limit(options.limit)

  const { data } = await query
  return (data ?? []) as DailyClass[]
}

export async function getDailyClassByDate(date: string): Promise<DailyClass | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("daily_classes")
    .select("*")
    .eq("gym_id", GYM_ID)
    .eq("class_date", date)
    .neq("status", "archived")
    .single()
  return (data as DailyClass | null) ?? null
}

export async function getDailyClassWithBlocks(id: string): Promise<DailyClassWithBlocks | null> {
  const supabase = await createClient()
  const { data: classData } = await supabase
    .from("daily_classes")
    .select("*")
    .eq("id", id)
    .eq("gym_id", GYM_ID)
    .single()

  if (!classData) return null

  const { data: blocks } = await supabase
    .from("class_blocks")
    .select("*")
    .eq("daily_class_id", id)
    .order("position")

  const blocksWithExercises: ClassBlock[] = []

  for (const block of blocks ?? []) {
    const { data: blockExercises } = await supabase
      .from("class_block_exercises")
      .select("*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)")
      .eq("block_id", block.id)
      .order("position")

    blocksWithExercises.push({
      ...block,
      exercises: (blockExercises ?? []) as BlockExercise[],
    })
  }

  return {
    ...(classData as DailyClass),
    blocks: blocksWithExercises,
  }
}

export async function getWeekClasses(mondayDate: string): Promise<DailyClass[]> {
  const monday = new Date(mondayDate)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const from = monday.toISOString().split("T")[0]!
  const to = sunday.toISOString().split("T")[0]!

  return getDailyClasses({ from, to })
}

export type MuscleBalanceItem = { group: MuscleGroup; count: number }

// Conteo de ejercicios por grupo muscular principal en las clases de la semana.
export async function getWeekMuscleBalance(mondayDate: string): Promise<{
  items: MuscleBalanceItem[]
  classCount: number
}> {
  const supabase = await createClient()
  const monday = new Date(mondayDate + "T12:00:00")
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const from = mondayDate
  const to = sunday.toISOString().split("T")[0]!

  const { data: classes } = await supabase
    .from("daily_classes")
    .select("id")
    .eq("gym_id", GYM_ID)
    .gte("class_date", from)
    .lte("class_date", to)
    .neq("status", "archived")

  if (!classes?.length) return { items: [], classCount: 0 }

  const { data: blocks } = await supabase
    .from("class_blocks")
    .select("class_block_exercises(exercise:exercises(muscle_group))")
    .in("daily_class_id", classes.map((c) => c.id))

  const counts = new Map<string, number>()
  for (const b of blocks ?? []) {
    const list = (b.class_block_exercises ?? []) as { exercise: { muscle_group: string | null } | null }[]
    for (const be of list) {
      const g = be.exercise?.muscle_group
      if (g) counts.set(g, (counts.get(g) ?? 0) + 1)
    }
  }

  const items = [...counts.entries()]
    .map(([group, count]) => ({ group: group as MuscleGroup, count }))
    .sort((a, b) => b.count - a.count)

  return { items, classCount: classes.length }
}
