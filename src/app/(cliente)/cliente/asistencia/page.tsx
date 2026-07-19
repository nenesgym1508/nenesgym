import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, CircleDashed, Clock, AlertTriangle } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientAttendance } from "@/services/attendance.service"
import { getActiveMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { ClientCheckInButton } from "@/components/asistencia/client-checkin-button"
import {
  formatDate,
  formatDatetime,
  todayInBogota,
  daysPerWeekForPlan,
  eligibleDaysElapsed,
} from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteAsistenciaPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  
  const [recent, membership] = await Promise.all([
    client ? getClientAttendance(client.id, 15) : Promise.resolve([]),
    client ? getActiveMembership(client.id) : Promise.resolve(null),
  ])

  const today = todayInBogota()
  const daysPerWeek = membership
    ? daysPerWeekForPlan(membership.plan?.days ?? membership.total_days)
    : 6
  const elapsedDays = membership
    ? eligibleDaysElapsed(membership.start_date, today, daysPerWeek)
    : 0

  const effectiveStatus = membership
    ? computeEffectiveStatus(
        elapsedDays,
        membership.total_days,
        membership.end_date,
        membership.grace_days,
        membership.status
      )
    : null

  const hasActivePlan = effectiveStatus === "active" || effectiveStatus === "grace"
  const alreadyToday = recent[0]?.check_in_date === today

  return (
    <div>
      <PageHeader title="Entrada" />
      <div className="p-4 md:px-10 md:py-8 space-y-4">
        {!hasActivePlan ? (
          <Card className="flex items-center justify-between gap-4 p-4 border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
                <AlertTriangle className="size-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bebas text-base tracking-wide uppercase text-white">No tienes un plan activo</h3>
                <p className="text-xs text-zinc-500 leading-tight">
                  Activa o renueva tu membresía para poder registrar tus ingresos.
                </p>
              </div>
            </div>
            <Link
              href={ROUTES.CLIENTE_PAGOS}
              className="shrink-0 inline-flex h-9 items-center justify-center rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white px-4 transition-colors shadow-lg shadow-red-600/10 cursor-pointer"
            >
              Ver planes
            </Link>
          </Card>
        ) : (
          <>
            {/* Estado del día */}
            <Card
              className={`flex items-center gap-3 p-3.5 ${
                alreadyToday ? "border-green-700/40 bg-green-500/5" : "border-white/8"
              }`}
            >
              {alreadyToday ? (
                <CheckCircle2 className="size-5 shrink-0 text-green-400" />
              ) : (
                <CircleDashed className="size-5 shrink-0 text-zinc-400" />
              )}
              <p className="text-sm font-medium text-zinc-200">
                {alreadyToday ? "Ya registraste tu ingreso hoy" : "Aún no has registrado tu ingreso hoy"}
              </p>
            </Card>

            <ClientCheckInButton
              alreadyToday={alreadyToday}
              lastCheckedInAt={recent[0]?.checked_in_at}
            />
          </>
        )}

        {/* Últimos ingresos */}
        {recent.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Últimos ingresos
            </h3>
            <Card className="p-0 overflow-hidden">
              {recent.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < recent.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Clock className="size-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{formatDate(a.check_in_date)}</p>
                    <p className="text-xs text-zinc-500">{formatDatetime(a.checked_in_at)}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
