import { redirect } from "next/navigation"
import { Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getTodayAttendance } from "@/services/attendance.service"
import { getAllClients } from "@/services/clients.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { GymQrModal } from "@/components/admin/gym-qr-modal"
import { ManualCheckInModal } from "@/components/admin/manual-checkin-modal"
import { formatDatetime } from "@/lib/dates"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export default async function AdminAsistenciasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [attendance, clients, { data: gym }] = await Promise.all([
    getTodayAttendance(GYM_ID),
    getAllClients(),
    supabase.from("gyms").select("name, checkin_token").eq("id", GYM_ID).single(),
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
      <PageHeader title="Ingresos" />
      <div className="p-4 space-y-4">
        <div>
          <p className="text-xs text-zinc-500 capitalize">{today}</p>
          <p className="text-2xl font-black text-zinc-100">
            {attendance.length} <span className="text-lg font-normal text-zinc-400">ingresos hoy</span>
          </p>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2">
          {gym && <GymQrModal token={gym.checkin_token} gymName={gym.name} />}
          <ManualCheckInModal clients={clientOptions} />
        </div>

        {attendance.length === 0 ? (
          <Card className="text-center py-12">
            <Clock className="size-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">Nadie ha ingresado hoy</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            {attendance.map((a, i) => {
              const att = a as typeof a & { client?: { profile?: { full_name?: string | null } } }
              return (
                <div key={a.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < attendance.length - 1 ? "border-b border-white/5" : ""}`}>
                  <div className="size-9 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Clock className="size-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{att.client?.profile?.full_name ?? "Cliente"}</p>
                    <p className="text-xs text-zinc-500">{formatDatetime(a.checked_in_at)} · {a.session === "am" ? "Mañana" : "Tarde"} · {a.source === "qr" ? "QR" : "Manual"}</p>
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
