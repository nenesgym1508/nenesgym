import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientProgress, getActiveGoal } from "@/services/progress.service"
import { getMonthlyAttendance } from "@/services/attendance.service"
import { ProgressView } from "@/components/progress/progress-view"
import { ROUTES } from "@/constants/routes"
import { nowInBogota, todayInBogota } from "@/lib/dates"
import { type ProgressRecord } from "@/types/progress"

export const dynamic = "force-dynamic"

export default async function ClienteProgresoPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  const now = nowInBogota()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const today = todayInBogota()

  const [records, goal, monthlyAttendance] = await Promise.all([
    client ? getClientProgress(client.id, 100) : Promise.resolve([] as ProgressRecord[]),
    client ? getActiveGoal(client.id) : Promise.resolve(null),
    client ? getMonthlyAttendance(client.id, year, month) : Promise.resolve([]),
  ])

  return (
    <div>
      {/* Cabecera unificada estilo mockup */}
      <div className="mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Mi progreso</h1>
        <p className="text-zinc-500 text-sm">Tu constancia, tu transformación.</p>
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-6">
        <ProgressView
          records={records}
          goal={goal}
          monthlyAttendanceDates={monthlyAttendance.map((a) => a.check_in_date)}
          today={today}
        />
      </div>
    </div>
  )
}
