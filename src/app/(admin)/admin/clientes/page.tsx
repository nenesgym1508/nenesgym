import { redirect } from "next/navigation"
import { Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAllClientsWithMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getAvailablePlans } from "@/services/payments.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { MembershipBadge } from "@/components/ui/badge"
import { GymQrModal } from "@/components/admin/gym-qr-modal"
import { ActivatePlanModal } from "@/components/admin/activate-plan-modal"
import { formatDate } from "@/lib/dates"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import type { MembershipStatus } from "@/types/membership"

export default async function AdminClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [clients, plans, { data: gym }] = await Promise.all([
    getAllClientsWithMembership(),
    getAvailablePlans(),
    supabase.from("gyms").select("name, checkin_token").eq("id", GYM_ID).single(),
  ])

  const planOptions = plans.map((p) => ({
    id: p.id,
    name: p.name,
    days: p.days,
    duration_days: p.duration_days,
    price_cents: p.price_cents,
  }))

  return (
    <div>
      <PageHeader title={`Clientes (${clients.length})`} />
      <div className="p-4 space-y-3">
        {/* Barra de acciones */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-zinc-500">Gestiona ingresos y membresías</p>
          {gym && <GymQrModal token={gym.checkin_token} gymName={gym.name} />}
        </div>

        {clients.length === 0 ? (
          <Card className="text-center py-12">
            <Users className="size-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No hay clientes registrados</p>
          </Card>
        ) : (
          <Card className="p-0 overflow-hidden">
            {clients.map((c, i) => {
              const ct = c as typeof c & {
                profile: { full_name?: string | null; email?: string | null } | null
                memberships?: Array<{ status: string; total_days: number; used_days: number; end_date: string; grace_days: number; plan: { name: string } | null }>
              }
              const latestMem = ct.memberships?.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0]
              const effectiveStatus = latestMem
                ? computeEffectiveStatus(latestMem.used_days, latestMem.total_days, latestMem.end_date, latestMem.grace_days, latestMem.status as MembershipStatus)
                : null
              return (
                <div key={c.id} className={`px-4 py-3.5 ${i < clients.length - 1 ? "border-b border-white/5" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{ct.profile?.full_name ?? "Sin nombre"}</p>
                      <p className="text-xs text-zinc-500 truncate">{ct.profile?.email ?? ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {effectiveStatus ? <MembershipBadge status={effectiveStatus} /> : <span className="text-xs text-zinc-600">Sin membresía</span>}
                      <ActivatePlanModal
                        clientId={c.id}
                        clientName={ct.profile?.full_name ?? "Cliente"}
                        plans={planOptions}
                      />
                    </div>
                  </div>
                  {latestMem && (
                    <p className="text-xs text-zinc-600 mt-1">
                      {latestMem.plan?.name ?? "Plan personalizado"} · Vence {formatDate(latestMem.end_date)} · {latestMem.total_days - latestMem.used_days} días restantes
                    </p>
                  )}
                </div>
              )
            })}
          </Card>
        )}
      </div>
    </div>
  )
}
