import { createClient } from "@/lib/supabase/server"

export async function getClientAttendance(clientId: string, limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("client_id", clientId)
    .order("check_in_date", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getTodayAttendance(gymId: string) {
  const supabase = await createClient()
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  const { data } = await supabase
    .from("attendance")
    .select(
      `
      *,
      client:clients(
        id,
        profile:profiles(full_name)
      )
    `
    )
    .eq("gym_id", gymId)
    .eq("check_in_date", today)
    .order("checked_in_at", { ascending: false })
  return data ?? []
}

export async function getRecentAttendance(gymId: string, days = 7) {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  const { data } = await supabase
    .from("attendance")
    .select("check_in_date, client_id")
    .eq("gym_id", gymId)
    .gte("check_in_date", sinceStr)
    .order("check_in_date", { ascending: false })
  return data ?? []
}

export async function getMonthlyAttendance(clientId: string, year: number, month: number) {
  const supabase = await createClient()
  const startDate = new Date(year, month - 1, 1).toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  const endDate = new Date(year, month, 0).toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  
  const { data } = await supabase
    .from("attendance")
    .select("check_in_date")
    .eq("client_id", clientId)
    .gte("check_in_date", startDate)
    .lte("check_in_date", endDate)
    .order("check_in_date", { ascending: false })
  
  return data ?? []
}
