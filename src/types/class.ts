export type ClassObjective =
  | "fuerza" | "hipertrofia" | "cardio" | "tecnica" | "movilidad" | "full_body" | "general"

export type ClassLevel = "general" | "principiante" | "intermedio" | "avanzado"

export type ClassStatus = "draft" | "published" | "archived"

export const CLASS_OBJECTIVE_LABELS: Record<ClassObjective, string> = {
  fuerza: "Fuerza",
  hipertrofia: "Hipertrofia",
  cardio: "Cardio",
  tecnica: "Técnica",
  movilidad: "Movilidad",
  full_body: "Full Body",
  general: "General",
}

export const CLASS_LEVEL_LABELS: Record<ClassLevel, string> = {
  general: "General",
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
}

export interface BlockExercise {
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
  }
}

export interface ClassBlock {
  id: string
  daily_class_id: string
  title: string
  position: number
  exercises: BlockExercise[]
}

export interface DailyClass {
  id: string
  gym_id: string
  title: string
  class_date: string
  objective: ClassObjective | null
  level: ClassLevel | null
  estimated_duration_minutes: number | null
  status: ClassStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DailyClassWithBlocks extends DailyClass {
  blocks: ClassBlock[]
}
