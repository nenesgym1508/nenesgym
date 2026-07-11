import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"

const envContent = readFileSync(new URL("./.env.local", import.meta.url), "utf-8")
const env = {}
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const routineId = process.argv[2]

async function oldWay() {
  console.time("old-nplus1")
  const { data: routine } = await supabase.from("client_routines").select("*").eq("id", routineId).single()
  const { data: days } = await supabase.from("client_routine_days").select("*").eq("routine_id", routineId).order("position")
  const daysWithBlocks = []
  for (const day of days ?? []) {
    const { data: blocks } = await supabase.from("client_routine_blocks").select("*").eq("routine_day_id", day.id).order("position")
    const blocksWithExercises = []
    for (const block of blocks ?? []) {
      const { data: exercises } = await supabase
        .from("client_routine_exercises")
        .select("*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)")
        .eq("block_id", block.id)
        .order("position")
      blocksWithExercises.push({ ...block, exercises: exercises ?? [] })
    }
    daysWithBlocks.push({ ...day, blocks: blocksWithExercises })
  }
  console.timeEnd("old-nplus1")
  return { ...routine, days: daysWithBlocks }
}

async function newWay() {
  console.time("new-nested")
  const { data: routine } = await supabase.from("client_routines").select("*").eq("id", routineId).single()
  const { data: days } = await supabase
    .from("client_routine_days")
    .select(`*, blocks:client_routine_blocks(*, exercises:client_routine_exercises(*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)))`)
    .eq("routine_id", routineId)
    .order("position")
    .order("position", { referencedTable: "blocks" })
    .order("position", { referencedTable: "blocks.exercises" })
  console.timeEnd("new-nested")
  return { ...routine, days }
}

await oldWay()
await oldWay()
await newWay()
await newWay()
