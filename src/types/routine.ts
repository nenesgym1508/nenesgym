import type { MuscleGroup, Equipment } from "@/types/exercise"
import { CLASS_OBJECTIVE_LABELS, CLASS_LEVEL_LABELS, type ClassObjective, type ClassLevel } from "@/types/class"

// Vocabulario en lenguaje humano para el selector de objetivo del cliente
// (chips en "Nueva rutina" y en "Editar datos" cuando la rutina es propia).
// "otro" es un valor controlado más — el texto real que escribe el cliente
// se guarda aparte en la columna `custom_goal` (ver ClientRoutine), no aquí.
export type ClientRoutineGoal = "ganar_musculo" | "bajar_peso" | "mantenerse_activo" | "otro"
export const CLIENT_ROUTINE_GOAL_LABELS: Record<ClientRoutineGoal, string> = {
  ganar_musculo: "Ganar masa",
  bajar_peso: "Bajar grasa",
  mantenerse_activo: "Mantenerme",
  otro: "Otro",
}

// Vocabulario técnico heredado de Clases — usado en los flujos del admin
// (crear/editar rutina, plantillas), donde el trainer sí conoce estos términos.
export const ADMIN_ROUTINE_GOAL_LABELS = CLASS_OBJECTIVE_LABELS

export type RoutineGoal = ClassObjective | ClientRoutineGoal
export type RoutineLevel = ClassLevel

// Mapa combinado (ambos vocabularios) — solo para mostrar/traducir un valor
// ya guardado sin importar si vino del flujo admin o del flujo cliente.
export const ROUTINE_GOAL_LABELS: Record<RoutineGoal, string> = {
  ...CLASS_OBJECTIVE_LABELS,
  ...CLIENT_ROUTINE_GOAL_LABELS,
}
export const ROUTINE_LEVEL_LABELS = CLASS_LEVEL_LABELS

export type RoutineStatus = "draft" | "active" | "paused" | "completed" | "archived"
export type RoutineSourceType = "custom" | "template" | "class" | "client_created"
export type RoutineCreatedByRole = "admin" | "client"
export type RoutineSessionStatus = "completed" | "skipped"
export type Weekday = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom"

export const ROUTINE_STATUS_LABELS: Record<RoutineStatus, string> = {
  draft: "Borrador", active: "Activa", paused: "Pausada", completed: "Completada", archived: "Archivada",
}
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  lun: "Lunes", mar: "Martes", mie: "Miércoles", jue: "Jueves", vie: "Viernes", sab: "Sábado", dom: "Domingo",
}

export interface RoutineExercise {
  id: string; block_id: string; exercise_id: string; position: number
  sets: number | null; reps: number | null; duration_seconds: number | null
  rest_seconds: number | null; suggested_weight: string | null; notes: string | null
  exercise: {
    id: string; name: string; muscle_group: string | null; exercise_type: string | null
    equipment: Equipment | null; secondary_muscle_groups: MuscleGroup[] | null
    media_url: string | null; instructions: string | null
  }
}
export interface RoutineBlock { id: string; routine_day_id: string; title: string; position: number; exercises: RoutineExercise[] }
export interface RoutineDay { id: string; routine_id: string; title: string; weekday: Weekday | null; position: number; blocks: RoutineBlock[] }

export interface ClientRoutine {
  id: string; gym_id: string; client_id: string | null
  created_by: string | null; created_by_role: RoutineCreatedByRole | null
  title: string; description: string | null; goal: RoutineGoal | null; custom_goal: string | null
  level: RoutineLevel | null
  days_per_week: number | null; status: RoutineStatus
  source_type: RoutineSourceType | null; source_id: string | null
  start_date: string | null; end_date: string | null; notes: string | null
  created_at: string; updated_at: string
}
export interface ClientRoutineWithDays extends ClientRoutine { days: RoutineDay[] }

// Texto a mostrar para el objetivo de una rutina: si es "otro", usa el texto
// personalizado que escribió el cliente en vez de la etiqueta genérica "Otro".
export function formatRoutineGoal(goal: string | null, customGoal?: string | null): string | null {
  if (!goal) return null
  if (goal === "otro" && customGoal) return customGoal
  return ROUTINE_GOAL_LABELS[goal as RoutineGoal] ?? goal
}

export interface RoutineSession {
  id: string; gym_id: string; client_id: string; routine_id: string
  routine_day_id: string | null; session_date: string
  status: RoutineSessionStatus; note: string | null; created_at: string
}
