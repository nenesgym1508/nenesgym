import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Dumbbell } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getClientById } from "@/services/clients.service"
import { getActiveMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getClientProgress, getActiveGoal } from "@/services/progress.service"
import { getMonthlyAttendance } from "@/services/attendance.service"
import { getClientPayments } from "@/services/payments.service"
import { getAvailablePlans } from "@/services/payments.service"
import { Card } from "@/components/ui/card"
import { MembershipBadge, PaymentBadge } from "@/components/ui/badge"
import dynamicImport from "next/dynamic"
const ActivatePlanModal = dynamicImport(() => import("@/components/admin/activate-plan-modal").then(m => m.ActivatePlanModal))
import { AutoAprobacionToggle } from "@/components/admin/auto-aprobacion-toggle"
import { DesbloquearToggle } from "@/components/admin/desbloquear-toggle"
import { ROUTES, adminClienteRutinasDetalle } from "@/constants/routes"
import { formatDate, formatDatetime, todayInBogota, nowInBogota, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { getBmiCategory, formatCOP } from "@/lib/utils"
import { BMI_CATEGORIES, GYM_ID } from "@/constants/plans"
import { GOAL_LABELS } from "@/types/progress"
import type { MembershipStatus } from "@/types/membership"
import type { GoalType } from "@/types/progress"

export const dynamic = "force-dynamic"

export default async function AdminClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [clientData, plans] = await Promise.all([
    getClientById(id),
    getAvailablePlans(),
  ])
  if (!clientData) notFound()

  const now = nowInBogota()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [membership, progressRecords, goal, monthlyAttendance, payments] = await Promise.all([
    getActiveMembership(clientData.id),
    getClientProgress(clientData.id, 20),
    getActiveGoal(clientData.id),
    getMonthlyAttendance(clientData.id, year, month),
    getClientPayments(clientData.id),
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

  const latest = progressRecords[0] ?? null
  const previous = progressRecords[1] ?? null
  const weightDelta =
    latest?.weight_kg != null && previous?.weight_kg != null
      ? +(latest.weight_kg - previous.weight_kg).toFixed(1)
      : null
  const bmiCategory = latest?.bmi != null ? getBmiCategory(latest.bmi) : null
  const bmiInfo = bmiCategory ? BMI_CATEGORIES[bmiCategory] : null
  const monthlyCount = new Set(monthlyAttendance.map((a) => a.check_in_date)).size

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
            <p className="text-[11px] text-zinc-500 truncate">{clientProfile?.email ?? ""}</p>
          </div>
        </div>
        {effectiveStatus && <MembershipBadge status={effectiveStatus} />}
      </div>

      <div className="p-4 space-y-4">

        {/* Acciones rápidas */}
        <div className="flex flex-wrap items-center gap-2">
          {clientExt.comprobante_bloqueado && <DesbloquearToggle clientId={clientData.id} />}
          <AutoAprobacionToggle clientId={clientData.id} initialValue={clientExt.auto_aprobacion ?? false} />
          <ActivatePlanModal
            clientId={clientData.id}
            clientName={clientProfile?.full_name ?? "Cliente"}
            plans={planOptions}
          />
          <Link
            href={adminClienteRutinasDetalle(clientData.id)}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <Dumbbell className="size-3.5" />
            Rutinas
          </Link>
        </div>

        {/* Membresía */}
        {membership ? (
          <Card>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">
              Membresía activa
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl font-black text-zinc-100">{remaining}</p>
                <p className="text-[10px] text-zinc-500">días restantes</p>
              </div>
              <div>
                <p className="text-xl font-black text-zinc-100">{membership.total_days}</p>
                <p className="text-[10px] text-zinc-500">días totales</p>
              </div>
              <div>
                <p className="text-xl font-black text-zinc-100">{monthlyCount}</p>
                <p className="text-[10px] text-zinc-500">asistencias</p>
              </div>
            </div>
            <div className="mt-3 text-xs text-zinc-500">
              Vence: <span className="text-zinc-300">{formatDate(membership.end_date)}</span>
              {membership.plan && (
                <> · Plan: <span className="text-zinc-300">{membership.plan.name}</span></>
              )}
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-zinc-500 text-center py-2">Sin membresía activa</p>
          </Card>
        )}

        {/* Progreso */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Progreso físico
            </p>
            <span className="text-[10px] text-zinc-600">Registrado por el cliente</span>
          </div>

          {latest ? (
            <Card className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-black text-zinc-100">{latest.weight_kg ?? "—"}</p>
                  <p className="text-[10px] text-zinc-500">kg</p>
                  {weightDelta !== null && (
                    <p className={`text-[10px] font-medium ${weightDelta > 0 ? "text-red-400" : weightDelta < 0 ? "text-green-400" : "text-zinc-500"}`}>
                      {weightDelta > 0 ? "+" : ""}{weightDelta}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-lg font-black text-zinc-100">{latest.height_cm ?? "—"}</p>
                  <p className="text-[10px] text-zinc-500">cm altura</p>
                </div>
                <div>
                  <p className={`text-lg font-black ${bmiInfo?.color ?? "text-zinc-100"}`}>
                    {latest.bmi?.toFixed(1) ?? "—"}
                  </p>
                  <p className="text-[10px] text-zinc-500">IMC {bmiInfo?.label}</p>
                </div>
              </div>
              {latest.waist_cm != null && (
                <p className="text-xs text-zinc-500">
                  Cintura: <span className="text-zinc-300 font-medium">{latest.waist_cm} cm</span>
                </p>
              )}
              {goal && (
                <p className="text-xs text-zinc-500">
                  Objetivo:{" "}
                  <span className="text-zinc-300 font-medium">
                    {GOAL_LABELS[goal.goal_type as GoalType]}
                  </span>
                </p>
              )}
              <p className="text-[11px] text-zinc-600">
                Última medición: {formatDate(latest.measured_date ?? latest.recorded_at)}
              </p>

              {/* Historial */}
              {progressRecords.length > 1 && (
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                    Historial
                  </p>
                  {progressRecords.slice(0, 5).map((r) => (
                    <div key={r.id} className="flex items-center justify-between py-1.5 text-xs border-b border-white/5 last:border-0">
                      <span className="text-zinc-400">{formatDate(r.measured_date ?? r.recorded_at)}</span>
                      <span className="text-zinc-300 font-medium">
                        {r.weight_kg != null && `${r.weight_kg} kg`}
                        {r.bmi != null && ` · IMC ${r.bmi.toFixed(1)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center gap-2 py-4 text-center">
                <Dumbbell className="size-6 text-zinc-600" />
                <p className="text-sm text-zinc-500">Sin mediciones registradas</p>
              </div>
            </Card>
          )}
        </div>

        {/* Pagos */}
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
    </div>
  )
}
