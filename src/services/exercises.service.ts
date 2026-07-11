import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type { MuscleGroup, Equipment, ExerciseType, Exercise, UsageTag } from "@/types/exercise"

// Re-export types and labels so server components can import from here
export type { MuscleGroup, Equipment, ExerciseType, Exercise, UsageTag }
export {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  USAGE_TAG_LABELS,
} from "@/types/exercise"

export async function getExercises(filters?: {
  muscle_group?: MuscleGroup
  exercise_type?: ExerciseType
  search?: string
  includeInactive?: boolean
  visibility?: "gym" | "client"
}): Promise<Exercise[]> {
  const supabase = await createClient()
  let query = (supabase as any)
    .from("exercises")
    .select("*")
    .eq("gym_id", GYM_ID)
    .order("name")

  if (!filters?.includeInactive) query = query.eq("is_active", true)
  if (filters?.muscle_group) query = query.eq("muscle_group", filters.muscle_group)
  if (filters?.exercise_type) query = query.eq("exercise_type", filters.exercise_type)
  if (filters?.search) query = query.ilike("name", `%${filters.search}%`)
  if (filters?.visibility) query = query.eq("visibility", filters.visibility)

  const { data } = await query
  return (data ?? []) as Exercise[]
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .eq("gym_id", GYM_ID)
    .single()
  return (data as Exercise | null) ?? null
}

// "Creados por mí" — ejercicios privados creados por este cliente
export async function getMyCreatedExercises(clientId: string): Promise<Exercise[]> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from("exercises")
    .select("*")
    .eq("gym_id", GYM_ID)
    .eq("owner_client_id", clientId)
    .eq("visibility", "client")
    .eq("is_active", true)
    .order("name")
  return (data ?? []) as Exercise[]
}

// "Mis ejercicios" (pantalla de gestión) — por defecto están los ejercicios
// que el admin tiene activos ahora mismo. Un registro explícito en
// client_exercise_library (añadir/quitar) SIEMPRE gana sobre ese default:
// si el cliente añadió a mano un ejercicio que el admin luego desactivó,
// sigue apareciendo; si lo quitó a mano, no vuelve a aparecer aunque el
// admin lo reactive.
export async function getMyLibrary(clientId: string): Promise<Exercise[]> {
  const supabase = await createClient()
  const [{ data: gymExercises }, { data: libRows }] = await Promise.all([
    (supabase as any).from("exercises").select("*").eq("gym_id", GYM_ID).eq("visibility", "gym").order("name"),
    (supabase as any).from("client_exercise_library").select("exercise_id, is_active").eq("client_id", clientId),
  ])
  const overrides = new Map<string, boolean>(
    (libRows ?? []).map((r: { exercise_id: string; is_active: boolean }) => [r.exercise_id, r.is_active])
  )
  return ((gymExercises ?? []) as Exercise[]).filter((e) => overrides.get(e.id) ?? e.is_active)
}

// Unión {biblioteca por defecto, con overrides} ∪ {creados por mí} — usado
// por el picker de rutinas para su vista por defecto "Mis ejercicios".
export async function getMyExerciseIds(clientId: string): Promise<string[]> {
  const supabase = await createClient()
  const [{ data: gymRows }, { data: libRows }, { data: ownRows }] = await Promise.all([
    (supabase as any).from("exercises").select("id, is_active").eq("gym_id", GYM_ID).eq("visibility", "gym"),
    (supabase as any).from("client_exercise_library").select("exercise_id, is_active").eq("client_id", clientId),
    (supabase as any).from("exercises").select("id").eq("owner_client_id", clientId).eq("is_active", true),
  ])
  const overrides = new Map<string, boolean>(
    (libRows ?? []).map((r: { exercise_id: string; is_active: boolean }) => [r.exercise_id, r.is_active])
  )
  const ids = new Set<string>()
  ;(gymRows ?? []).forEach((r: { id: string; is_active: boolean }) => {
    if (overrides.get(r.id) ?? r.is_active) ids.add(r.id)
  })
  ;(ownRows ?? []).forEach((r: { id: string }) => ids.add(r.id))
  return [...ids]
}
