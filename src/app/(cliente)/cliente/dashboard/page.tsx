import { redirect } from "next/navigation"
import Link from "next/link"
import { QrCode, TrendingUp, Calendar, Clock, CheckCircle2, AlertTriangle, Hourglass } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getActiveMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getClientAttendance, getMonthlyAttendance } from "@/services/attendance.service"
import { getClientPayments } from "@/services/payments.service"
import { getProgressSummary } from "@/services/progress.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { MembershipBadge } from "@/components/ui/badge"
import { DashboardCalendar } from "@/components/cliente/dashboard-calendar"
import { formatDate, formatDatetime, todayInBogota, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteDashboardPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { profile, client } = clientData
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [membership, attendance, monthlyAttendanceData, payments, progress] = await Promise.all([
    client ? getActiveMembership(client.id) : Promise.resolve(null),
    client ? getClientAttendance(client.id, 5) : Promise.resolve([]),
    client ? getMonthlyAttendance(client.id, currentYear, currentMonth) : Promise.resolve([]),
    client ? getClientPayments(client.id) : Promise.resolve([]),
    client ? getProgressSummary(client.id) : Promise.resolve(null),
  ])

  const attendanceDates = monthlyAttendanceData.map(a => {
    const [year, month, day] = a.check_in_date.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
  })

  // Modelo base calendario: las faltas (días hábiles transcurridos sin asistir)
  // también descuentan de la membresía.
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

  const remainingDays = membership ? Math.max(0, membership.total_days - elapsedDays) : 0
  const alreadyToday = attendance[0]?.check_in_date === todayInBogota()

  // Aviso de pago: solo si el más reciente está pendiente o rechazado.
  const latestPayment = payments[0]
  const paymentAlert =
    latestPayment && (latestPayment.status === "pending" || latestPayment.status === "rejected")
      ? latestPayment
      : null

  const latestProgress = progress?.latest ?? null

  let parsedMembershipStart: Date | undefined
  if (membership?.start_date) {
    const [y, m, d] = membership.start_date.split('T')[0].split('-').map(Number)
    parsedMembershipStart = new Date(y, m - 1, d)
  }


  return (
    <div>
      <PageHeader title="NENE'S GYM" showLogout showInstall />
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-zinc-400 text-sm">¡Hola!</p>
            <h2 className="text-xl font-bold text-zinc-100 truncate">
              {profile.full_name ?? "Usuario"}
            </h2>
          </div>
          <Link href={ROUTES.CLIENTE_ASISTENCIA} className="shrink-0">
            <div
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 transition-colors ${
                alreadyToday
                  ? "border-green-700/40 bg-green-500/10"
                  : "border-red-700/40 bg-red-600/10 hover:bg-red-600/15"
              }`}
            >
              {alreadyToday ? (
                <CheckCircle2 className="size-4 text-green-400" />
              ) : (
                <QrCode className="size-4 text-red-500" />
              )}
              <span className="text-xs font-semibold text-zinc-200">
                {alreadyToday ? "Ya ingresaste" : "Registrar entrada"}
              </span>
            </div>
          </Link>
        </div>

        {membership && effectiveStatus ? (
          <Card className="bg-gradient-to-b from-red-950/20 to-zinc-950/80 border-red-900/30 overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  MEMBRESÍA
                </span>
                <MembershipBadge status={effectiveStatus} />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-zinc-100 leading-none">{remainingDays}</span>
                <span className="text-zinc-400 mb-0.5 text-xs">
                  / {membership.total_days} días restantes
                </span>
              </div>
              <div className="flex flex-col gap-1.5 mt-3 text-xs text-zinc-500">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Activación:
                  </span>
                  <span className="text-zinc-300 font-medium">{formatDate(membership.start_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Vence:
                  </span>
                  <span className="text-zinc-300 font-medium">{formatDate(membership.end_date)}</span>
                </div>
              </div>
            </div>
            
            <div className="px-2 pb-2">
              <DashboardCalendar
                currentDate={now}
                attendanceDates={attendanceDates}
                integrated={true}
                membershipStartDate={parsedMembershipStart}
                daysPerWeek={daysPerWeek}
              />
            </div>
          </Card>
        ) : (
          <>
            <Card className="text-center py-8">
              <p className="text-zinc-500 text-sm mb-3">No tienes una membresía activa</p>
              <Link
                href={ROUTES.CLIENTE_PAGOS}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Ver planes
              </Link>
            </Card>
            <DashboardCalendar
              currentDate={now}
              attendanceDates={attendanceDates}
              membershipStartDate={parsedMembershipStart}
              daysPerWeek={6}
            />
          </>
        )}

        {/* Aviso de pago pendiente / rechazado */}
        {paymentAlert && (
          <Link href={ROUTES.CLIENTE_PAGOS}>
            <Card
              className={`flex items-start gap-3 p-3.5 ${
                paymentAlert.status === "pending"
                  ? "border-yellow-600/30 bg-yellow-500/5"
                  : "border-red-600/30 bg-red-500/5"
              }`}
            >
              {paymentAlert.status === "pending" ? (
                <Hourglass className="size-5 shrink-0 text-yellow-400" />
              ) : (
                <AlertTriangle className="size-5 shrink-0 text-red-400" />
              )}
              <div className="text-sm">
                <p className="font-semibold text-zinc-100">
                  {paymentAlert.status === "pending"
                    ? "Pago pendiente de aprobación"
                    : "Pago rechazado"}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {paymentAlert.status === "pending"
                    ? "Tu comprobante está en revisión."
                    : paymentAlert.note || "Toca para ver el detalle y volver a enviarlo."}
                </p>
              </div>
            </Card>
          </Link>
        )}

        {/* Mini resumen de progreso */}
        {latestProgress && (latestProgress.weight_kg != null || latestProgress.bmi != null) && (
          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                <TrendingUp className="size-5 text-zinc-300" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Tu progreso</p>
                <p className="text-sm font-semibold text-zinc-100">
                  {latestProgress.weight_kg != null && <span>{latestProgress.weight_kg} kg</span>}
                  {latestProgress.weight_kg != null && latestProgress.bmi != null && (
                    <span className="text-zinc-600"> · </span>
                  )}
                  {latestProgress.bmi != null && (
                    <span>IMC {latestProgress.bmi.toFixed(1)}</span>
                  )}
                </p>
              </div>
            </div>
            <Link href={ROUTES.CLIENTE_PROGRESO} className="text-xs font-medium text-red-400 hover:text-red-300">
              Ver más
            </Link>
          </Card>
        )}


        {attendance.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">
              Últimos ingresos
            </h3>
            <Card className="p-0 overflow-hidden">
              {attendance.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < attendance.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Clock className="size-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      {formatDate(a.check_in_date)}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDatetime(a.checked_in_at)}
                    </p>
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
