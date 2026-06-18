import { createClient } from "@/lib/supabase/server"
import { todayInBogota } from "@/lib/dates"
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

export async function getAllClientsWithMembership() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("clients")
    .select(
      `
      id,
      profile:profiles!inner(id, full_name, email, phone, role),
      memberships(
        id, status, total_days, used_days, end_date, grace_days,
        plan:plans(name)
      )
    `
    )
    .eq("profile.role", "client")
    .order("created_at", { ascending: false })
  return data ?? []
}
