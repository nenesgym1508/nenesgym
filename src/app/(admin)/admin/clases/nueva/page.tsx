import { requireAdminSession } from "@/lib/auth/session"
import { getTrainingRoutinesWithDayOptions } from "@/services/training-routines.service"
import { NuevaClaseFlow } from "@/components/admin/nueva-clase-flow"

export const dynamic = "force-dynamic"

export default async function NuevaClasePage() {
  await requireAdminSession()

  const routines = await getTrainingRoutinesWithDayOptions()

  return <NuevaClaseFlow routines={routines} />
}
