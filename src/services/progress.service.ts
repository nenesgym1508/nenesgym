import { createClient } from "@/lib/supabase/server"
import { getBmiCategory } from "@/lib/utils"

export async function getClientProgress(clientId: string, limit = 20) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("progress_records")
    .select("*")
    .eq("client_id", clientId)
    .order("recorded_at", { ascending: false })
    .limit(limit)
  return data ?? []
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
