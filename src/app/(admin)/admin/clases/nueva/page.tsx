import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getTrainingRoutinesWithDayOptions } from "@/services/training-routines.service"
import { NuevaClaseFlow } from "@/components/admin/nueva-clase-flow"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function NuevaClasePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const routines = await getTrainingRoutinesWithDayOptions()

  return <NuevaClaseFlow routines={routines} />
}
