import { createClient } from "@/lib/supabase/server"
import { GYM_ID } from "@/constants/plans"
import { getAllClients } from "@/services/clients.service"
import { unstable_cache } from "next/cache"
import type {
  ClientRoutine,
  ClientRoutineWithDays,
  RoutineDay,
  RoutineBlock,
  RoutineSession,
  RoutineStatus,
  Weekday,
} from "@/types/routine"


export function getAdminRoutines(
  options?: { status?: RoutineStatus; clientId?: string }
): Promise<(ClientRoutine & { client: { id: string; profile: { full_name: string | null } | null } | null })[]> {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      let query = supabase
        .from("client_routines")
        .select("*, client:clients(id, profile:profiles(full_name))")
        .eq("gym_id", GYM_ID)
        .eq("created_by_role", "admin")
        .order("updated_at", { ascending: false })

      if (options?.status) {
        query = query.eq("status", options.status)
      }
      if (options?.clientId) {
        query = query.eq("client_id", options.clientId)
      }

      const { data } = await query
      return (data ?? []) as any[]
    },
    ["admin-routines", options?.status || "", options?.clientId || ""],
    { revalidate: 3600, tags: ["admin-routines"] }
  )()
}

export async function getRoutineWithDays(id: string): Promise<ClientRoutineWithDays | null> {
  const supabase = await createClient()

  const [{ data: routine }, { data: days }] = await Promise.all([
    supabase.from("client_routines").select("*").eq("id", id).single(),
    supabase
      .from("client_routine_days")
      .select(
        "*, blocks:client_routine_blocks(*, exercises:client_routine_exercises(*, exercise:exercises(id, name, muscle_group, exercise_type, equipment, secondary_muscle_groups, media_url, instructions)))"
      )
      .eq("routine_id", id)
      .order("position")
      .order("position", { referencedTable: "blocks" })
      .order("position", { referencedTable: "blocks.exercises" }),
  ])

  if (!routine) return null

  const daysWithBlocks: RoutineDay[] = (days ?? []).map((day) => ({
    ...day,
    weekday: day.weekday as Weekday | null,
    blocks: (day.blocks ?? []) as RoutineBlock[],
  }))

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

export function getClientsWithoutRoutine(): Promise<
  { id: string; profile: { full_name: string | null } | null }[]
> {
  return unstable_cache(
    async () => {
      const supabase = await createClient()
      const [clients, { data: withRoutine }] = await Promise.all([
        getAllClients(),
        supabase.from("client_routines").select("client_id").eq("gym_id", GYM_ID).eq("created_by_role", "admin").neq("status", "archived"),
      ])

      const clientIdsWithRoutine = new Set((withRoutine ?? []).map((r) => r.client_id).filter(Boolean))
      return (clients as any[]).filter((c) => !clientIdsWithRoutine.has(c.id))
    },
    ["clients-without-routine"],
    { revalidate: 3600, tags: ["admin-routines"] }
  )()
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
