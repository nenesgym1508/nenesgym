import { redirect } from "next/navigation"
import Link from "next/link"
import { QrCode, TrendingUp, Calendar, Clock } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getActiveMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getClientAttendance } from "@/services/attendance.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { MembershipBadge } from "@/components/ui/badge"
import { formatDate, formatDatetime } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

export default async function ClienteDashboardPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { profile, client } = clientData
  const membership = client ? await getActiveMembership(client.id) : null
  const attendance = client ? await getClientAttendance(client.id, 5) : []

  const effectiveStatus = membership
    ? computeEffectiveStatus(
        membership.used_days,
        membership.total_days,
        membership.end_date,
        membership.grace_days,
        membership.status
      )
    : null

  const remainingDays = membership ? membership.total_days - membership.used_days : 0

  return (
    <div>
      <PageHeader title="NENE'S GYM" showLogout />
      <div className="p-4 space-y-4">
        <div>
          <p className="text-zinc-400 text-sm">Hola,</p>
          <h2 className="text-xl font-bold text-zinc-100">
            {profile.full_name ?? "Usuario"}
          </h2>
        </div>

        {membership && effectiveStatus ? (
          <Card className="bg-gradient-to-br from-red-950/50 to-zinc-900 border-red-900/40">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Membresía
              </span>
              <MembershipBadge status={effectiveStatus} />
            </div>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-5xl font-black text-zinc-100">{remainingDays}</span>
              <span className="text-zinc-400 mb-2 text-sm">
                / {membership.total_days} días restantes
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-800 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-600 transition-all"
                style={{
                  width: `${Math.max(0, Math.min(100, (remainingDays / membership.total_days) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Calendar className="size-3" />
                Vence: {formatDate(membership.end_date)}
              </span>
              {effectiveStatus === "grace" && (
                <span className="text-yellow-400 font-medium">Periodo extra activo</span>
              )}
            </div>
          </Card>
        ) : (
          <Card className="text-center py-8">
            <p className="text-zinc-500 text-sm mb-3">No tienes una membresía activa</p>
            <Link
              href={ROUTES.CLIENTE_PAGOS}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              Ver planes
            </Link>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href={ROUTES.CLIENTE_ASISTENCIA}>
            <Card className="flex flex-col items-center gap-2 py-5 hover:border-red-700/50 transition-colors cursor-pointer">
              <div className="size-10 rounded-xl bg-red-600/15 flex items-center justify-center">
                <QrCode className="size-5 text-red-500" />
              </div>
              <span className="text-sm font-medium text-zinc-200">Registrar ingreso</span>
            </Card>
          </Link>
          <Link href={ROUTES.CLIENTE_PROGRESO}>
            <Card className="flex flex-col items-center gap-2 py-5 hover:border-zinc-600/50 transition-colors cursor-pointer">
              <div className="size-10 rounded-xl bg-zinc-800 flex items-center justify-center">
                <TrendingUp className="size-5 text-zinc-300" />
              </div>
              <span className="text-sm font-medium text-zinc-200">Mi progreso</span>
            </Card>
          </Link>
        </div>

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
