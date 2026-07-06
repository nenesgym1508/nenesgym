import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import type {
  ClientRoutine,
  ClientRoutineWithDays,
  RoutineDay,
  RoutineBlock,
  RoutineExercise,
  RoutineSession,
  RoutineStatus,
  Weekday,
} from "@/types/routine"

export async function getAdminRoutines(options?: { status?: RoutineStatus; clientId?: string }): Promise<ClientRoutine[]> {
  const supabase = await createClient()
  let query = supabase
    .from("client_routines")
    .select("*")
    .eq("gym_id", GYM_ID)
    .order("created_at", { ascending: false })

  if (options?.status) {
    query = query.eq("status", options.status)
  }
  if (options?.clientId) {
    query = query.eq("client_id", options.clientId)
  }

  const { data } = await query
  return (data ?? []) as ClientRoutine[]
}

export async function getActiveRoutinesWithClient(): Promise<(ClientRoutine & { client: { id: string; profile: { full_name: string | null } | null } | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("client_routines")
    .select("*, client:clients(id, profile:profiles(full_name))")
    .eq("gym_id", GYM_ID)
    .eq("status", "active")
    .order("updated_at", { ascending: false })

  return (data ?? []) as any[]
}

export async function getRoutineWithDays(id: string): Promise<ClientRoutineWithDays | null> {
  const supabase = await createClient()
  const { data: routine } = await supabase
    .from("client_routines")
    .select("*")
    .eq("id", id)
    .single()

  if (!routine) return null

  const { data: days } = await supabase
    .from("client_routine_days")
    .select("*")
    .eq("routine_id", id)
    .order("position")

  const daysWithBlocks: RoutineDay[] = []

  for (const day of days ?? []) {
    const { data: blocks } = await supabase
      .from("client_routine_blocks")
      .select("*")
      .eq("routine_day_id", day.id)
      .order("position")

    const blocksWithExercises: RoutineBlock[] = []

    for (const block of blocks ?? []) {
      const { data: exercises } = await supabase
        .from("client_routine_exercises")
        .select("*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)")
        .eq("block_id", block.id)
        .order("position")

      blocksWithExercises.push({
        ...block,
        exercises: (exercises ?? []) as RoutineExercise[],
      })
    }

    daysWithBlocks.push({
      ...day,
      weekday: day.weekday as Weekday | null,
      blocks: blocksWithExercises,
    })
  }

  return {
    ...(routine as ClientRoutine),
    days: daysWithBlocks,
  }
}

export async function getClientRoutines(clientId: string): Promise<ClientRoutine[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("client_routines")
    .select("*")
    .eq("client_id", clientId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })

  return (data ?? []) as ClientRoutine[]
}

export async function getAssignedRoutine(clientId: string): Promise<ClientRoutine | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("client_routines")
    .select("*")
    .eq("client_id", clientId)
    .eq("created_by_role", "admin")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return null
  return data[0] as ClientRoutine
}

export async function getActiveRoutineForClient(clientId: string): Promise<ClientRoutine | null> {
  const adminAssigned = await getAssignedRoutine(clientId)
  if (adminAssigned) return adminAssigned

  const supabase = await createClient()
  const { data } = await supabase
    .from("client_routines")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)

  if (!data || data.length === 0) return null
  return data[0] as ClientRoutine
}

export async function getRoutineSessionForDate(routineId: string, date: string): Promise<RoutineSession | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("client_routine_sessions")
    .select("*")
    .eq("routine_id", routineId)
    .eq("session_date", date)
    .maybeSingle()

  return (data as RoutineSession | null) ?? null
}
