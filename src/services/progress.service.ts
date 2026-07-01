import { createClient } from "@/lib/supabase/server"
import { getBmiCategory } from "@/lib/utils"
import type { ProgressRecord, ProgressGoal } from "@/types/progress"

export async function getClientProgress(clientId: string, limit = 50): Promise<ProgressRecord[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("progress_records")
    .select("*")
    .eq("client_id", clientId)
    .order("measured_date", { ascending: false })
    .order("recorded_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as ProgressRecord[]
}

export async function getProgressSummary(clientId: string) {
  const records = await getClientProgress(clientId, 2)
  const latest = records[0] ?? null
  const previous = records[1] ?? null
  return {
    latest,
    previous,
    bmi_category: latest?.bmi != null ? getBmiCategory(latest.bmi) : null,
  }
}

export async function getActiveGoal(clientId: string): Promise<ProgressGoal | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("progress_goals")
    .select("*")
    .eq("client_id", clientId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single()
  return (data as ProgressGoal | null) ?? null
}
