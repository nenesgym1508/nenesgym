import { createClient } from "@/lib/supabase/server"
import { todayInBogota, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import type { MembershipStatus } from "@/types/membership"

export async function getActiveMembership(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("memberships")
    .select("*, plan:plans(name, days, duration_days, price_cents)")
    .eq("client_id", clientId)
    .neq("status", "cancelled")
    .order("end_date", { ascending: false })
    .limit(1)
    .single()
  return data
}

export async function getMembershipsForClient(clientId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("memberships")
    .select("*, plan:plans(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
  return data ?? []
}

export function computeEffectiveStatus(
  usedDays: number,
  totalDays: number,
  endDate: string,
  graceDays: number,
  status: MembershipStatus
): MembershipStatus {
  if (status === "cancelled") return "cancelled"
  if (usedDays >= totalDays) return "exhausted"
  const today = todayInBogota()
  if (today <= endDate) return "active"
  const graceEnd = new Date(endDate)
  graceEnd.setDate(graceEnd.getDate() + graceDays)
  const graceEndStr = graceEnd.toISOString().split("T")[0]
  if (today <= graceEndStr) return "grace"
  return "expired"
}

// ─── Búsqueda + filtros + paginación de clientes (admin) ──────────────────────
// La búsqueda, el filtro de estado y la paginación se resuelven en Postgres vía la
// RPC `admin_search_clients` (ver migrations/admin_search_clients.sql). Si la función
// aún no está aplicada en la base, cae con gracia a la carga completa + filtro en JS
// (comportamiento previo), correcto para volúmenes pequeños. El badge exacto se calcula
// siempre en JS con computeEffectiveStatus (fuente de verdad del estado mostrado).

export type ClientStatusFilter = "todos" | "activos" | "sin_membresia"

export type AdminClientRow = {
  id: string
  auto_aprobacion: boolean
  comprobante_bloqueado?: boolean
  profile: { full_name?: string | null; email?: string | null } | null
  effectiveStatus: MembershipStatus | null
  remainingDays: number
  planName: string | null
  startDate: string | null
  endDate: string | null
}

type MembershipLike = {
  status: string
  total_days: number
  start_date: string
  end_date: string
  grace_days: number
  plan: { name?: string | null; days?: number | null } | null
}

// Calcula el badge (estado efectivo + días restantes) a partir de la membresía vigente.
function computeClientBadge(mem: MembershipLike | null, today: string) {
  if (!mem) {
    return { effectiveStatus: null as MembershipStatus | null, remainingDays: 0, planName: null, startDate: null, endDate: null }
  }
  const daysPerWeek = daysPerWeekForPlan(mem.plan?.days ?? mem.total_days)
  const elapsed = eligibleDaysElapsed(mem.start_date, today, daysPerWeek)
  const remainingDays = Math.max(0, mem.total_days - elapsed)
  const effectiveStatus = computeEffectiveStatus(
    elapsed, mem.total_days, mem.end_date, mem.grace_days, mem.status as MembershipStatus
  )
  return {
    effectiveStatus,
    remainingDays,
    planName: mem.plan?.name ?? null,
    startDate: mem.start_date,
    endDate: mem.end_date,
  }
}

export type AdminClientsPage = { rows: AdminClientRow[]; total: number; page: number; pageSize: number }

export async function searchAdminClients(
  { search = "", status = "todos", page = 1, pageSize = 20 }:
  { search?: string; status?: ClientStatusFilter; page?: number; pageSize?: number }
): Promise<AdminClientsPage> {
  const supabase = await createClient()
  const today = todayInBogota()
  const q = search.trim()
  const offset = (page - 1) * pageSize

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("admin_search_clients", {
    p_search: q || null,
    p_status: status,
    p_today: today,
    p_limit: pageSize,
    p_offset: offset,
  })

  if (error) {
    // 42883 = function does not exist → la migración aún no fue aplicada; usar fallback.
    if (error.code === "42883" || /does not exist/i.test(error.message ?? "")) {
      return fallbackSearchAdminClients({ search: q, status, page, pageSize, today })
    }
    throw error
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: AdminClientRow[] = (data ?? []).map((r: any) => ({
    id: r.id,
    auto_aprobacion: r.auto_aprobacion,
    comprobante_bloqueado: r.comprobante_bloqueado,
    profile: { full_name: r.full_name, email: r.email },
    ...computeClientBadge(r.membership as MembershipLike | null, today),
  }))
  const total = Number((data?.[0]?.total_count as number | undefined) ?? 0)
  return { rows, total, page, pageSize }
}

// Fallback sin RPC: carga completa (limit 500) + búsqueda/filtro/paginación en JS.
async function fallbackSearchAdminClients(
  { search, status, page, pageSize, today }:
  { search: string; status: ClientStatusFilter; page: number; pageSize: number; today: string }
): Promise<AdminClientsPage> {
  const raw = await getAllClientsWithMembership()
  const q = search.toLowerCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: AdminClientRow[] = (raw as any[]).map((c: any) => {
    const latest = (c.memberships as MembershipLike[] | undefined)
      ?.filter((m) => m.status !== "cancelled")
      .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0] ?? null
    return {
      id: c.id,
      auto_aprobacion: c.auto_aprobacion,
      comprobante_bloqueado: c.comprobante_bloqueado,
      profile: c.profile as AdminClientRow["profile"],
      ...computeClientBadge(latest, today),
    }
  })

  const searched = q
    ? all.filter((c) =>
        (c.profile?.full_name?.toLowerCase().includes(q) ?? false) ||
        (c.profile?.email?.toLowerCase().includes(q) ?? false))
    : all

  const filtered = searched.filter((c) => {
    if (status === "activos") return c.effectiveStatus === "active" || c.effectiveStatus === "grace"
    if (status === "sin_membresia") return !c.effectiveStatus || c.effectiveStatus === "exhausted" || c.effectiveStatus === "cancelled"
    return true
  })

  filtered.sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? ""))
  const total = filtered.length
  const rows = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
  return { rows, total, page, pageSize }
}

export async function getAllClientsWithMembership() {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("clients")
    .select(
      `
      id,
      auto_aprobacion,
      comprobante_bloqueado,
      profile:profiles!inner(id, full_name, email, phone, role),
      memberships(
        id, status, total_days, used_days, start_date, end_date, grace_days,
        plan:plans(name, days)
      )
    `
    )
    .eq("profile.role", "client")
    .order("created_at", { ascending: false })
    .limit(500)
  return (data ?? []) as Array<{ id: string; auto_aprobacion: boolean; comprobante_bloqueado: boolean; profile: unknown; memberships: unknown[] }>
}
