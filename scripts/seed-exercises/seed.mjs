// Siembra la biblioteca de ejercicios desde free-exercise-db.
// Fuente: https://github.com/yuhonas/free-exercise-db (Unlicense / dominio público)
//
// Uso:
//   node scripts/seed-exercises/seed.mjs        → genera exercises.seed.sql
//   node scripts/seed-exercises/seed.mjs --apply → inserta directo en Supabase (service role)

import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const APPLY = process.argv.includes("--apply")

function loadEnv() {
  const path = join(__dirname, "..", "..", ".env.local")
  const env = {}
  if (existsSync(path)) {
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
    }
  }
  return env
}

const GYM_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"

// Ejercicios que se activan por defecto (los más reconocidos del gym)
const DEFAULT_ACTIVE = new Set([
  "Barbell_Squat",
  "Barbell_Bench_Press_-_Medium_Grip",
  "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "Bent_Over_Barbell_Row",
  "Clean_Deadlift",
  "Chin-Up",
  "Barbell_Curl",
  "Barbell_Hip_Thrust",
  "Dips_-_Triceps_Version",
  "Close-Grip_Front_Lat_Pulldown",
  "Hack_Squat",
  "Dumbbell_Lunges",
  "One-Arm_Dumbbell_Row",
  "Alternate_Hammer_Curl",
  "3_4_Sit-Up",
])
const JSON_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
const IMG_BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"

// free-exercise-db muscle → enum local
const MUSCLE_MAP = {
  abdominals: "abdomen",
  abductors: "gluteo",
  adductors: "pierna",
  biceps: "biceps",
  calves: "pierna",
  chest: "pecho",
  forearms: "biceps",
  glutes: "gluteo",
  hamstrings: "pierna",
  lats: "espalda",
  "lower back": "espalda",
  "middle back": "espalda",
  neck: "hombro",
  quadriceps: "pierna",
  shoulders: "hombro",
  traps: "espalda",
  triceps: "triceps",
}

const EQUIPMENT_MAP = {
  "body only": "peso_corporal",
  none: "peso_corporal",
  machine: "maquina",
  barbell: "barra",
  dumbbell: "mancuernas",
  cable: "polea",
  kettlebells: "mancuernas",
  bands: "banda",
  "medicine ball": "otro",
  "exercise ball": "otro",
  "e-z curl bar": "barra",
  "foam roll": "otro",
  other: "otro",
}

const CATEGORY_MAP = {
  strength: "fuerza",
  powerlifting: "fuerza",
  strongman: "fuerza",
  plyometrics: "fuerza",
  "olympic weightlifting": "tecnica",
  cardio: "cardio",
  stretching: "estiramiento",
}

// Cupos por grupo muscular (objetivo ~100, foco gimnasio de fuerza)
const CAPS = {
  pecho: 12,
  espalda: 14,
  pierna: 16,
  gluteo: 9,
  hombro: 12,
  biceps: 9,
  triceps: 9,
  abdomen: 12,
  cardio: 6,
}

function sqlStr(v) {
  if (v == null || v === "") return "NULL"
  return "'" + String(v).replace(/'/g, "''") + "'"
}

function sqlArray(arr) {
  if (!arr || arr.length === 0) return "NULL"
  return "ARRAY[" + arr.map((x) => sqlStr(x)).join(",") + "]::text[]"
}

const main = async () => {
  const res = await fetch(JSON_URL)
  if (!res.ok) throw new Error("No se pudo descargar el JSON: " + res.status)
  const all = await res.json()

  // Mapear + filtrar a valores conocidos
  const mapped = []
  for (const ex of all) {
    const primary = MUSCLE_MAP[ex.primaryMuscles?.[0]]
    const equipment = EQUIPMENT_MAP[ex.equipment] ?? null
    const type = CATEGORY_MAP[ex.category] ?? null
    if (!primary || !type) continue

    const secondary = [...new Set((ex.secondaryMuscles ?? [])
      .map((m) => MUSCLE_MAP[m])
      .filter((m) => m && m !== primary))]

    mapped.push({
      name: ex.name,
      muscle_group: primary,
      secondary_muscle_groups: secondary,
      equipment,
      exercise_type: type,
      instructions: null, // instrucciones en inglés omitidas — el admin las agrega en español
      media_url: ex.images?.[0] ? IMG_BASE + ex.images[0] : null,
      external_id: ex.id,
      level: ex.level,
      mechanic: ex.mechanic,
      category: ex.category,
    })
  }

  // Curar: priorizar compuestos, con imagen, nivel principiante; equipo de gimnasio común.
  const commonEquip = new Set(["barra", "mancuernas", "maquina", "polea", "peso_corporal", "banda"])
  const score = (e) =>
    (e.mechanic === "compound" ? 2 : 0) +
    (e.media_url ? 1 : 0) +
    (e.level === "beginner" ? 1 : e.level === "intermediate" ? 0.5 : 0) +
    (commonEquip.has(e.equipment) ? 1 : 0)

  const byGroup = {}
  for (const e of mapped) {
    const bucket = e.exercise_type === "cardio" ? "cardio" : e.muscle_group
    ;(byGroup[bucket] ??= []).push(e)
  }

  const curated = []
  const seenNames = new Set()
  for (const [bucket, cap] of Object.entries(CAPS)) {
    const list = (byGroup[bucket] ?? [])
      .filter((e) => commonEquip.has(e.equipment))
      .sort((a, b) => score(b) - score(a))
    let n = 0
    for (const e of list) {
      if (n >= cap) break
      if (seenNames.has(e.name.toLowerCase())) continue
      seenNames.add(e.name.toLowerCase())
      curated.push(e)
      n++
    }
  }

  // SQL
  const values = curated.map((e) =>
    `(${sqlStr(GYM_ID)}, ${sqlStr(e.name)}, ${sqlStr(e.muscle_group)}, ${sqlArray(e.secondary_muscle_groups)}, ` +
    `${sqlStr(e.equipment)}, ${sqlStr(e.exercise_type)}, ${sqlStr(e.instructions)}, ${sqlStr(e.media_url)}, ` +
    `'free_exercise_db', ${sqlStr(e.external_id)}, ${DEFAULT_ACTIVE.has(e.external_id)})`
  )

  const sql =
    `-- Seed generado por scripts/seed-exercises/seed.mjs\n` +
    `-- Fuente: free-exercise-db (Unlicense). ${curated.length} ejercicios.\n` +
    `INSERT INTO exercises\n` +
    `  (gym_id, name, muscle_group, secondary_muscle_groups, equipment, exercise_type, instructions, media_url, source, external_id, is_active)\n` +
    `VALUES\n${values.join(",\n")}\n` +
    `ON CONFLICT DO NOTHING;\n`

  const out = join(__dirname, "exercises.seed.sql")
  writeFileSync(out, sql, "utf8")
  console.log(`SQL generado: ${curated.length} ejercicios → ${out}`)

  // Resumen por grupo
  const summary = {}
  for (const e of curated) {
    const k = e.exercise_type === "cardio" ? "cardio" : e.muscle_group
    summary[k] = (summary[k] ?? 0) + 1
  }
  console.log(summary)

  if (APPLY) {
    const env = loadEnv()
    const url = env.NEXT_PUBLIC_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local")

    const { createClient } = await import("@supabase/supabase-js")
    const supabase = createClient(url, key, { auth: { persistSession: false } })

    // Evitar duplicados: no reinsertar external_id ya presentes.
    const { data: existing } = await supabase
      .from("exercises")
      .select("external_id")
      .eq("gym_id", GYM_ID)
      .not("external_id", "is", null)
    const seen = new Set((existing ?? []).map((r) => r.external_id))

    const rows = curated
      .filter((e) => !seen.has(e.external_id))
      .map((e) => ({
        gym_id: GYM_ID,
        name: e.name,
        muscle_group: e.muscle_group,
        secondary_muscle_groups: e.secondary_muscle_groups.length ? e.secondary_muscle_groups : null,
        equipment: e.equipment,
        exercise_type: e.exercise_type,
        instructions: e.instructions,
        media_url: e.media_url,
        source: "free_exercise_db",
        external_id: e.external_id,
        is_active: DEFAULT_ACTIVE.has(e.external_id),
      }))

    if (rows.length === 0) {
      console.log("Nada que insertar (ya estaban todos).")
      return
    }
    const { error } = await supabase.from("exercises").insert(rows)
    if (error) throw error
    console.log(`Insertados ${rows.length} ejercicios en Supabase.`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
