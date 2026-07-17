import { redirect } from "next/navigation"
import { Clock } from "lucide-react"
import { getAuthenticatedSession } from "@/lib/auth/session"
import { getGymSettings } from "@/services/gym.service"
import { getTodayAttendance } from "@/services/attendance.service"
import { getAllClients } from "@/services/clients.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import dynamicImport from "next/dynamic"
const GymQrModal = dynamicImport(() => import("@/components/admin/gym-qr-modal").then(m => m.GymQrModal))
const ManualCheckInModal = dynamicImport(() => import("@/components/admin/manual-checkin-modal").then(m => m.ManualCheckInModal))
import { formatDatetime } from "@/lib/dates"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminAsistenciasPage() {
  const session = await getAuthenticatedSession()
  if (!session) redirect(ROUTES.LOGIN)

  if (session.profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [attendance, clients, gym] = await Promise.all([
    getTodayAttendance(GYM_ID),
    getAllClients(),
    getGymSettings(),
  ])

  const clientOptions = clients.map((c) => {
    const ct = c as typeof c & { profile?: { full_name?: string | null } | null }
    return { id: c.id, name: ct.profile?.full_name ?? "Sin nombre" }
  })

  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  })

  return (
    <div>
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12">
        <div>
          <h1 className="text-3xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Ingresos</h1>
          <p className="text-zinc-500 text-sm capitalize">{today}</p>
        </div>
      </header>

      <div className="px-6 pb-24 space-y-4">
        <div>
          <p className="text-2xl font-bebas font-bold text-zinc-100 uppercase tracking-wide">
            {attendance.length} <span className="text-lg font-normal text-zinc-400 lowercase">ingresos hoy</span>
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {gym && <GymQrModal token={gym.checkin_token} gymName={gym.name} />}
          <ManualCheckInModal clients={clientOptions} />
        </div>

        {attendance.length === 0 ? (
          <Card className="text-center py-12 bg-zinc-950/40 border-white/5">
            <Clock className="size-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Nadie ha ingresado hoy</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden bg-zinc-950/40 border-white/5">
            {attendance.map((a, i) => {
              const att = a as typeof a & { client?: { profile?: { full_name?: string | null } } }
              return (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < attendance.length - 1 ? "border-b border-white/5" : ""}`}>
                  <div className="size-9 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Clock className="size-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-bebas text-lg tracking-wide uppercase text-white">{att.client?.profile?.full_name ?? "Cliente"}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{formatDatetime(a.checked_in_at)} · {a.session === "am" ? "Mañana" : "Tarde"} · {a.source === "qr" ? "QR" : "Manual"}</p>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>
    </div>
  )
}
