import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, CreditCard, CheckSquare, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getPendingPayments } from "@/services/payments.service"
import { getTodayAttendance } from "@/services/attendance.service"
import { getAllClients } from "@/services/clients.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { PaymentBadge } from "@/components/ui/badge"
import { formatCOP } from "@/lib/utils"
import { formatDate, formatDatetime } from "@/lib/dates"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [pendingPayments, todayAttendance, allClients] = await Promise.all([
    getPendingPayments(),
    getTodayAttendance(GYM_ID),
    getAllClients(),
  ])

  const hasPending = pendingPayments.length > 0
  const initial = (profile?.full_name ?? "A").charAt(0).toUpperCase()

  const stats = [
    { label: "Clientes", value: allClients.length, icon: Users, href: ROUTES.ADMIN_CLIENTES, urgent: false },
    { label: "Pagos pendientes", value: pendingPayments.length, icon: CreditCard, href: ROUTES.ADMIN_PAGOS, urgent: hasPending },
    { label: "Ingresos hoy", value: todayAttendance.length, icon: CheckSquare, href: ROUTES.ADMIN_ASISTENCIAS, urgent: false },
  ]

  return (
    <div>
      <PageHeader title="Panel Admin" showLogout />
      <div className="p-4 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/8 text-lg font-bold text-zinc-100">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-zinc-500 text-xs">Bienvenido,</p>
            <h2 className="text-lg font-bold text-zinc-100 truncate">{profile?.full_name ?? "Admin"}</h2>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon, href, urgent }) => (
            <Link key={href} href={href}>
              <Card
                className={`flex flex-col items-center gap-2 py-4 transition-colors hover:border-white/20 ${
                  urgent ? "border-red-600/30 bg-red-950/10" : ""
                }`}
              >
                <div className={`flex size-9 items-center justify-center rounded-full ${urgent ? "bg-red-600" : "bg-white/8"}`}>
                  <Icon className="size-5 text-white" />
                </div>
                <span className="text-2xl font-black text-zinc-100">{value}</span>
                <span className="text-[10px] text-zinc-500 text-center leading-tight uppercase tracking-wide">{label}</span>
              </Card>
            </Link>
          ))}
        </div>

        {pendingPayments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Pagos por aprobar
              </h3>
              <Link href={ROUTES.ADMIN_PAGOS} className="text-xs text-red-500 hover:text-red-400">
                Ver todos
              </Link>
            </div>
            <Card className="p-0 overflow-hidden">
              {pendingPayments.slice(0, 3).map((p, i) => {
                const pay = p as typeof p & { client?: { profile?: { full_name?: string | null } }; plan?: { name: string } | null }
                return (
                  <Link
                    key={p.id}
                    href={ROUTES.ADMIN_PAGOS}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors ${i < Math.min(pendingPayments.length, 3) - 1 ? "border-b border-white/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {pay.client?.profile?.full_name ?? "Cliente"}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {pay.plan?.name ?? "Pago"} · {formatDate(p.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-zinc-200">{formatCOP(p.amount_cents)}</p>
                      <PaymentBadge status={p.status} />
                    </div>
                  </Link>
                )
              })}
            </Card>
          </div>
        )}

        {todayAttendance.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Ingresos de hoy ({todayAttendance.length})
              </h3>
              <Link href={ROUTES.ADMIN_ASISTENCIAS} className="text-xs text-red-500 hover:text-red-400">
                Ver todos
              </Link>
            </div>
            <Card className="p-0 overflow-hidden">
              {todayAttendance.slice(0, 5).map((a, i) => {
                const att = a as typeof a & { client?: { profile?: { full_name?: string | null } } }
                return (
                  <Link
                    key={a.id}
                    href={ROUTES.ADMIN_ASISTENCIAS}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors ${i < Math.min(todayAttendance.length, 5) - 1 ? "border-b border-white/5" : ""}`}
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/8">
                      <Clock className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {att.client?.profile?.full_name ?? "Cliente"}
                      </p>
                      <p className="text-xs text-zinc-500">{formatDatetime(a.checked_in_at)}</p>
                    </div>
                  </Link>
                )
              })}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
