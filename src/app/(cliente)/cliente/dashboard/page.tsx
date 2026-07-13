import { redirect } from "next/navigation"
import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getActiveMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getClientAttendance, getMonthlyAttendance } from "@/services/attendance.service"
import { getClientPayments } from "@/services/payments.service"
import { getProgressSummary } from "@/services/progress.service"
import { getActiveRoutineForClient } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { DashboardCalendar } from "@/components/cliente/dashboard-calendar"
import { MembershipSummaryCard } from "@/components/cliente/membership-summary-card"
import { TodayStatusCard } from "@/components/cliente/today-status-card"
import { TodayRoutineCard } from "@/components/cliente/today-routine-card"
import { QuickProgressCard } from "@/components/cliente/quick-progress-card"
import { WorkoutStreakCard } from "@/components/cliente/workout-streak-card"
import { MotivationalBanner } from "@/components/cliente/motivational-banner"
import { DashboardHeader } from "@/components/cliente/dashboard-header"
import {
  formatDate,
  formatDatetime,
  todayInBogota,
  nowInBogota,
  eligibleDaysElapsed,
  daysPerWeekForPlan,
  getGreeting,
  computeStreak,
} from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteDashboardPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { user, profile, client } = clientData
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [membership, attendance, payments, progress] = await Promise.all([
    client ? getActiveMembership(client.id) : Promise.resolve(null),
    client ? getClientAttendance(client.id, 90) : Promise.resolve([]),
    client ? getClientPayments(client.id) : Promise.resolve([]),
    client ? getProgressSummary(client.id) : Promise.resolve(null),
  ])

  // Fetch routines info
  const activeRoutine = client ? await getActiveRoutineForClient(client.id) : null

  const attendanceDates = attendance.map(a => {
    const [year, month, day] = a.check_in_date.split('T')[0].split('-').map(Number)
    return new Date(year, month - 1, day)
  })

  const streakDates = [...attendanceDates]

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

  const todayRows = attendance.filter(a => a.check_in_date === today)
  const sessionsToday = todayRows.length
  const alreadyToday = sessionsToday > 0
  const bothSessionsDone = sessionsToday >= 2
  const lastCheckInAt = attendance[0]?.checked_in_at ?? null

  const streak = computeStreak(streakDates, daysPerWeek, nowInBogota())
  const currentMonthStr = String(currentMonth).padStart(2, '0')
  const currentYearStr = String(currentYear)
  const monthlyCount = new Set(
    attendance
      .filter(a => {
        const [y, m] = a.check_in_date.split('T')[0].split('-')
        return y === currentYearStr && m === currentMonthStr
      })
      .map(a => a.check_in_date)
  ).size

  const latestPayment = payments[0]
  const paymentAlert =
    latestPayment && (latestPayment.status === "pending" || latestPayment.status === "rejected")
      ? { status: latestPayment.status }
      : null

  const latestProgress = progress?.latest ?? null
  const prevProgress = progress?.previous ?? null
  const weightDelta =
    latestProgress?.weight_kg != null && prevProgress?.weight_kg != null
      ? latestProgress.weight_kg - prevProgress.weight_kg
      : null
  const hasProgress = latestProgress && (latestProgress.weight_kg != null || latestProgress.bmi != null)

  const firstName = profile.full_name?.split(" ")[0] ?? "Usuario"
  const initial = firstName.charAt(0).toUpperCase()
  const greeting = getGreeting(nowInBogota())

  let parsedMembershipStart: Date | undefined
  if (membership?.start_date) {
    const [y, m, d] = membership.start_date.split('T')[0].split('-').map(Number)
    parsedMembershipStart = new Date(y, m - 1, d)
  }

  const recentAttendance = attendance.slice(0, 5)

  return (
    <div>
      <DashboardHeader
        profile={{
          full_name: profile.full_name,
          phone: profile.phone,
          email: profile.email ?? user.email ?? ""
        }}
      />
      <div className="p-4 md:px-10 md:py-8 space-y-4">
        {/* 1. Saludo + avatar */}
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both flex items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-zinc-100">
              ¡Hola {firstName}!
            </h2>
            <p className="text-sm text-zinc-400">{greeting}</p>
          </div>
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-red-600 bg-zinc-900 text-sm font-bold text-white">
            {initial}
          </div>
        </div>

        {membership && effectiveStatus ? (
          <>
            {/* 2. Membresía */}
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75 fill-mode-both">
              <MembershipSummaryCard
                status={effectiveStatus}
                remainingDays={remainingDays}
                totalDays={membership.total_days}
                startDate={membership.start_date}
                endDate={membership.end_date}
              />
            </div>

            {/* 3+4. CTA + Estado del día — bloque unificado */}
            <div className="flex flex-col gap-1">
              {bothSessionsDone && (
                <div className="flex items-center gap-3 rounded-2xl border border-green-700/40 bg-zinc-900 px-4 py-3.5">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-green-500/15">
                    <CheckCircle2 className="size-5 text-green-400" />
                  </div>
                  <span className="flex-1 text-base font-bold text-zinc-100">
                    Completaste tus 2 ingresos de hoy
                  </span>
                </div>
              )}
              <TodayStatusCard
                trainedToday={alreadyToday}
                sessionsToday={sessionsToday}
                lastCheckInAt={lastCheckInAt}
                paymentAlert={paymentAlert}
                showRegisterCta={!bothSessionsDone}
              />
              <TodayRoutineCard hasRoutine={!!activeRoutine} />
            </div>


            {/* 5. Mini resumen de progreso */}
            {hasProgress && (
              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Tu progreso
                </p>
                <QuickProgressCard
                  weightKg={latestProgress!.weight_kg}
                  bmi={latestProgress!.bmi}
                  weightDelta={weightDelta}
                />
              </div>
            )}

            {/* 6. Calendario */}
            <Card className="bg-zinc-950/50 border-white/5">
              <DashboardCalendar
                currentDate={now}
                attendanceDates={attendanceDates}
                integrated={true}
                membershipStartDate={parsedMembershipStart}
                daysPerWeek={daysPerWeek}
              />
            </Card>

            {/* 7. Gamificación */}
            <WorkoutStreakCard streak={streak} monthlyCount={monthlyCount} />

            {/* 8. Banner motivacional */}
            <MotivationalBanner />

            {/* 9. Últimos ingresos */}
            {recentAttendance.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2">
                  Últimos ingresos
                </h3>
                <div className="overflow-hidden rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)]">
                  {recentAttendance.map((a, i) => (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 px-5 py-3.5 ${
                        i < recentAttendance.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full border border-green-500/40 bg-zinc-950 flex items-center justify-center shrink-0">
                        <Clock className="size-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{formatDate(a.check_in_date)}</p>
                        <p className="text-xs text-zinc-500">{formatDatetime(a.checked_in_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)] text-center py-8 px-5">
              <p className="text-zinc-400 text-sm mb-3">No tienes una membresía activa</p>
              <Link
                href={ROUTES.CLIENTE_PAGOS}
                className="inline-flex items-center gap-2 rounded-xl btn-glossy-red px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                Ver planes
              </Link>
            </div>
            <Card className="bg-zinc-950/50 border-white/5">
              <DashboardCalendar
                currentDate={now}
                attendanceDates={attendanceDates}
                integrated={true}
                membershipStartDate={parsedMembershipStart}
                daysPerWeek={6}
              />
            </Card>
            <MotivationalBanner />
          </>
        )}
      </div>
    </div>
  )
}
