import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAdminSession } from "@/lib/auth/session"
import { getClientById } from "@/services/clients.service"
import { getActiveMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getClientProgress, getActiveGoal } from "@/services/progress.service"
import { getClientAttendance, getMonthlyAttendance } from "@/services/attendance.service"
import { getClientPayments, getAvailablePlans } from "@/services/payments.service"
import { getClientRoutines } from "@/services/routines.service"
import { Card } from "@/components/ui/card"
import { MembershipBadge, PaymentBadge } from "@/components/ui/badge"
import { MembershipSummaryCard } from "@/components/cliente/membership-summary-card"
import { DashboardCalendar } from "@/components/cliente/dashboard-calendar"
import { ProgressView } from "@/components/progress/progress-view"
import { ClienteDetalleTabs, type ClienteDetalleTab } from "@/components/admin/cliente-detalle-tabs"
import { ClientRoutinesSection } from "@/components/admin/client-routines-section"
import dynamicImport from "next/dynamic"
const ActivatePlanModal = dynamicImport(() => import("@/components/admin/activate-plan-modal").then(m => m.ActivatePlanModal))
import { AutoAprobacionToggle } from "@/components/admin/auto-aprobacion-toggle"
import { DesbloquearToggle } from "@/components/admin/desbloquear-toggle"
import { AdjustMembershipModal } from "@/components/admin/adjust-membership-modal"
import { ClientAccessCard } from "@/components/admin/client-access-card"
import { getClientAccessState } from "@/services/invitations.service"
import { ROUTES } from "@/constants/routes"
import { formatDate, todayInBogota, nowInBogota, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { formatCOP } from "@/lib/utils"
import { isPlaceholderEmail } from "@/lib/placeholder-email"
import type { MembershipStatus } from "@/types/membership"
import type { ProgressRecord } from "@/types/progress"

export const dynamic = "force-dynamic"

export default async function AdminClienteDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab: tabParam } = await searchParams
  const activeTab: ClienteDetalleTab = tabParam === "rutinas" || tabParam === "progreso" ? tabParam : "plan"

  await requireAdminSession()

  const [clientData, plans] = await Promise.all([
    getClientById(id),
    getAvailablePlans(),
  ])
  if (!clientData) notFound()

  const now = nowInBogota()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  // getClientAccessState va DENTRO de este lote, no antes.
  //
  // Estaba suelto entre los dos Promise.all y bloqueaba a las otras siete
  // consultas sin que ninguna lo necesitara: solo depende de clientData.id, que
  // ya está resuelto arriba. Eran ~240ms de espera en cada apertura de ficha,
  // puro tiempo muerto.
  const [
    membership, progressRecords, goal, monthlyAttendance,
    attendance, payments, routines, accessState,
  ] = await Promise.all([
    getActiveMembership(clientData.id),
    getClientProgress(clientData.id, 100),
    getActiveGoal(clientData.id),
    getMonthlyAttendance(clientData.id, year, month),
    getClientAttendance(clientData.id, 90),
    getClientPayments(clientData.id),
    getClientRoutines(clientData.id),
    getClientAccessState(clientData.id),
  ])

  const clientProfile = clientData.profile as { full_name?: string | null; email?: string | null } | null
  const clientExt = clientData as typeof clientData & {
    auto_aprobacion?: boolean
    comprobante_bloqueado?: boolean
  }

  const today = todayInBogota()
  const daysPerWeek = membership ? daysPerWeekForPlan(membership.plan?.days ?? membership.total_days) : 6
  const elapsed = membership ? eligibleDaysElapsed(membership.start_date, today, daysPerWeek) : 0
  const remaining = membership ? Math.max(0, membership.total_days - elapsed) : 0
  const effectiveStatus = membership
    ? computeEffectiveStatus(elapsed, membership.total_days, membership.end_date, membership.grace_days, membership.status as MembershipStatus)
    : null

  const planOptions = plans.map((p) => ({
    id: p.id, name: p.name, days: p.days,
    duration_days: p.duration_days, price_cents: p.price_cents,
  }))

  const firstName = clientProfile?.full_name?.split(" ")[0] ?? "Cliente"
  const initial = firstName.charAt(0).toUpperCase()

  return (
    <div>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/5 bg-background/95 md:backdrop-blur px-4 py-3 flex items-center gap-3">
        <Link
          href={ROUTES.ADMIN_CLIENTES}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
          aria-label="Volver"
        >
          <ArrowLeft className="size-4 text-zinc-400" />
        </Link>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-100 truncate">
              {clientProfile?.full_name ?? "Sin nombre"}
            </p>
            {/* El correo marcador (cliente dado de alta sin correo) no se muestra nunca. */}
            {isPlaceholderEmail(clientProfile?.email) ? (
              <span className="inline-flex items-center rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                Sin cuenta de acceso
              </span>
            ) : (
              <p className="text-[11px] text-zinc-500 truncate">{clientProfile?.email ?? ""}</p>
            )}
          </div>
        </div>
        {effectiveStatus && <MembershipBadge status={effectiveStatus} />}
      </div>

      <div className="p-4 space-y-4">
        {/* Ajustes de cuenta (no específicos de un plan) */}
        <div className="flex flex-wrap items-center gap-2">
          {clientExt.comprobante_bloqueado && <DesbloquearToggle clientId={clientData.id} />}
          <AutoAprobacionToggle clientId={clientData.id} initialValue={clientExt.auto_aprobacion ?? false} />
        </div>

        {/* La invitación no forma parte del cobro: se puede enviar (o reenviar)
            en cualquier momento después del alta. */}
        <ClientAccessCard clientId={clientData.id} state={accessState} />

        <ClienteDetalleTabs clientId={clientData.id} active={activeTab} />

        {/* ── PLAN ─────────────────────────────────────────────────────── */}
        {activeTab === "plan" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {membership && effectiveStatus ? (
              <MembershipSummaryCard
                status={effectiveStatus}
                remainingDays={remaining}
                totalDays={membership.total_days}
                startDate={membership.start_date}
                endDate={membership.end_date}
              />
            ) : (
              <Card>
                <p className="text-sm text-zinc-500 text-center py-2">Sin membresía activa</p>
              </Card>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <ActivatePlanModal
                clientId={clientData.id}
                clientName={clientProfile?.full_name ?? "Cliente"}
                plans={planOptions}
                isActive={effectiveStatus === "active" || effectiveStatus === "grace"}
                currentEndDate={membership?.end_date ?? undefined}
              />
              {membership && (
                <AdjustMembershipModal
                  clientId={clientData.id}
                  clientName={clientProfile?.full_name ?? "Cliente"}
                  membershipId={membership.id}
                  startDate={membership.start_date}
                  totalDays={membership.total_days}
                  endDate={membership.end_date}
                  graceDays={membership.grace_days}
                  status={membership.status as MembershipStatus}
                />
              )}
            </div>

            <Card className="bg-zinc-950/50 border-white/5">
              <DashboardCalendar
                currentDateStr={today}
                todayStr={today}
                attendanceDates={attendance.map((a) => a.check_in_date)}
                integrated
                membershipStartDate={membership?.start_date}
                membershipEndDate={membership?.end_date}
                daysPerWeek={daysPerWeek}
              />
            </Card>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                Pagos recientes
              </p>
              {payments.length > 0 ? (
                <Card className="p-0 overflow-hidden">
                  {payments.slice(0, 6).map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center justify-between px-4 py-3 ${i < Math.min(payments.length, 6) - 1 ? "border-b border-white/5" : ""}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">
                          {formatCOP(p.amount_cents)}
                        </p>
                        <p className="text-xs text-zinc-500">{formatDate(p.created_at)}</p>
                      </div>
                      <PaymentBadge status={p.status} />
                    </div>
                  ))}
                </Card>
              ) : (
                <Card>
                  <p className="text-sm text-zinc-500 text-center py-2">Sin pagos registrados</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* ── RUTINAS ──────────────────────────────────────────────────── */}
        {activeTab === "rutinas" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ClientRoutinesSection clientId={clientData.id} routines={routines} />
          </div>
        )}

        {/* ── PROGRESO ─────────────────────────────────────────────────── */}
        {activeTab === "progreso" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProgressView
              records={progressRecords as ProgressRecord[]}
              goal={goal}
              monthlyAttendanceDates={monthlyAttendance.map((a) => a.check_in_date)}
              today={today}
              clientId={clientData.id}
            />
          </div>
        )}
      </div>
    </div>
  )
}
