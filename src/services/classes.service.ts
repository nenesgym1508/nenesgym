import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GYM_ID } from "@/constants/plans"
import { unstable_cache } from "next/cache"
import type {
  ClassObjective, ClassLevel, ClassStatus,
  BlockExercise, ClassBlock, DailyClass, DailyClassWithBlocks,
} from "@/types/class"

import type { MuscleGroup } from "@/types/exercise"

// Re-export types and labels so server components can import from here
export type { ClassObjective, ClassLevel, ClassStatus, BlockExercise, ClassBlock, DailyClass, DailyClassWithBlocks }
export { CLASS_OBJECTIVE_LABELS, CLASS_LEVEL_LABELS } from "@/types/class"

export function getDailyClasses(options?: {
  from?: string
  to?: string
  limit?: number
}): Promise<DailyClass[]> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
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
    },
    ["daily-classes", options?.from || "", options?.to || "", String(options?.limit || 0)],
    { revalidate: 3600, tags: ["daily-classes"] }
  )()
}

export async function getDailyClassWithBlocks(id: string): Promise<DailyClassWithBlocks | null> {
  const supabase = await createClient()

  // Consulta anidada única (evita el N+1 de una consulta por bloque).
  const [{ data: classData }, { data: blocks }] = await Promise.all([
    supabase.from("daily_classes").select("*").eq("id", id).eq("gym_id", GYM_ID).single(),
    supabase
      .from("class_blocks")
      .select(
        "*, exercises:class_block_exercises(*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions))"
      )
      .eq("daily_class_id", id)
      .order("position")
      .order("position", { referencedTable: "exercises" }),
  ])

  if (!classData) return null

  return {
    ...(classData as DailyClass),
    blocks: (blocks ?? []) as ClassBlock[],
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
export function getWeekMuscleBalance(mondayDate: string): Promise<{
  items: MuscleBalanceItem[]
  classCount: number
}> {
  return unstable_cache(
    async () => {
      const supabase = createAdminClient()
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
    },
    ["week-muscle-balance", mondayDate],
    { revalidate: 3600, tags: ["daily-classes"] }
  )()
}
