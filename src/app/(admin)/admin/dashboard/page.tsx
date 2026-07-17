import { redirect } from "next/navigation"
import Link from "next/link"
import { Users, CreditCard, CheckSquare, Clock, Plus, LogOut } from "lucide-react"
import { getAuthenticatedSession } from "@/lib/auth/session"
import { getPendingPayments } from "@/services/payments.service"
import { getTodayAttendance } from "@/services/attendance.service"
import { countClients } from "@/services/clients.service"
import { logoutAction } from "@/actions/auth.actions"
import { ClientSearchBox } from "@/components/admin/client-search-box"
import { PendingPaymentsPreview } from "@/components/admin/pending-payments-preview"
import { formatDatetime } from "@/lib/dates"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
  const session = await getAuthenticatedSession()
  if (!session) redirect(ROUTES.LOGIN)

  const { profile } = session
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [pendingPayments, todayAttendance, clientCount] = await Promise.all([
    getPendingPayments(),
    getTodayAttendance(GYM_ID),
    countClients(),
  ])

  const hasPending = pendingPayments.length > 0
  const initial = (profile?.full_name ?? "A").charAt(0).toUpperCase()

  const stats = [
    { label: "Clientes", value: clientCount, icon: Users, href: ROUTES.ADMIN_CLIENTES, urgent: false },
    { label: "Pagos pendientes", value: pendingPayments.length, icon: CreditCard, href: ROUTES.ADMIN_PAGOS, urgent: hasPending },
    { label: "Ingresos hoy", value: todayAttendance.length, icon: CheckSquare, href: ROUTES.ADMIN_ASISTENCIAS, urgent: false },
  ]

  return (
    <div className="px-6 py-6 pb-24 md:pb-10 md:px-10 md:py-8 lg:px-12 space-y-6 md:space-y-8 md:max-w-6xl md:mx-auto">
      {/* Header (mobile only — el sidebar de escritorio ya muestra perfil y logout) */}
      <header className="flex items-center justify-between md:hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border border-white/8 flex items-center justify-center text-xl font-bold bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
            {initial}
          </div>
          <div>
            <p className="text-zinc-500 text-xs">Bienvenido,</p>
            <h1 className="text-lg font-bold tracking-tight text-zinc-100">{profile?.full_name ?? "Admin"}</h1>
          </div>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer p-2 rounded-lg hover:bg-zinc-900">
            <LogOut className="size-6" />
          </button>
        </form>
      </header>

      {/* Title Section + búsqueda (en fila en escritorio) */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Inicio</h2>
          <p className="text-zinc-500 text-sm">Resumen general del gimnasio</p>
        </div>
        <div className="md:w-80 shrink-0">
          <ClientSearchBox />
        </div>
      </div>

      <Link
        href={ROUTES.ADMIN_CLIENTES}
        className="flex w-full md:w-auto items-center justify-center gap-2 rounded-2xl btn-glossy-red px-4 md:px-10 py-4 text-sm font-semibold text-white"
      >
        <Plus className="size-5" />
        Registrar pago
      </Link>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {stats.map(({ label, value, icon: Icon, href, urgent }) => (
          <Link key={href} href={href} className="flex h-full">
            <div
              className={`relative overflow-hidden flex flex-col items-center justify-center text-center rounded-2xl border border-white/8 bg-zinc-900/60 p-4 md:p-6 w-full h-full transition-colors hover:border-white/20 hover:bg-zinc-800/40 ${
                urgent ? "border-red-600/30 bg-red-950/15" : ""
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent"></div>
              <Icon className="size-6 md:size-7 text-red-500 mb-2 relative z-10" />
              <span className="text-2xl md:text-3xl font-black mb-0.5 relative z-10 text-zinc-100">{value}</span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider relative z-10 leading-tight flex items-center justify-center text-center h-8">
                {label === "Pagos pendientes" ? <>Pagos<br/>pendientes</> : label}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Pagos por aprobar + Ingresos de hoy: 2 columnas en escritorio */}
      <div className="md:grid md:grid-cols-3 md:gap-6 space-y-6 md:space-y-0">
        <div className="md:col-span-2">
          <PendingPaymentsPreview payments={pendingPayments as any} />
        </div>

        {todayAttendance.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Ingresos de hoy ({todayAttendance.length})
              </h3>
              <Link href={ROUTES.ADMIN_ASISTENCIAS} className="text-xs text-red-500 hover:text-red-400">
                Ver todos
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
              {todayAttendance.slice(0, 5).map((a, i) => {
                const att = a as typeof a & { client?: { profile?: { full_name?: string | null } } }
                return (
                  <Link
                    key={a.id}
                    href={ROUTES.ADMIN_ASISTENCIAS}
                    className={`flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-800/20 transition-colors ${i < Math.min(todayAttendance.length, 5) - 1 ? "border-b border-white/5" : ""}`}
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-white/8">
                      <Clock className="size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {att.client?.profile?.full_name ?? "Cliente"}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{formatDatetime(a.checked_in_at)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
