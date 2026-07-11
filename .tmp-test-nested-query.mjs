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

console.time("nested-query")
const { data, error } = await supabase
  .from("client_routine_days")
  .select(`
    *,
    blocks:client_routine_blocks(
      *,
      exercises:client_routine_exercises(
        *,
        exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)
      )
    )
  `)
  .eq("routine_id", routineId)
  .order("position")
  .order("position", { referencedTable: "blocks" })
  .order("position", { referencedTable: "blocks.exercises" })
console.timeEnd("nested-query")

if (error) {
  console.log("ERROR:", JSON.stringify(error, null, 2))
} else {
  console.log("Days:", data.length)
  for (const day of data) {
    console.log(` Day "${day.title}" (pos ${day.position}) -> blocks:`, day.blocks.map(b => `${b.title}(pos ${b.position}, ex:${b.exercises.length})`))
  }
}
