import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAllClientsWithMembership, computeEffectiveStatus } from "@/services/memberships.service"
import { getAvailablePlans } from "@/services/payments.service"
import { PageHeader } from "@/components/layout/page-header"
import { ClientsList } from "@/components/admin/clients-list"
import dynamicImport from "next/dynamic"
const GymQrModal = dynamicImport(() => import("@/components/admin/gym-qr-modal").then(m => m.GymQrModal))
import { todayInBogota, eligibleDaysElapsed, daysPerWeekForPlan } from "@/lib/dates"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import type { MembershipStatus } from "@/types/membership"

export const dynamic = "force-dynamic"

export default async function AdminClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [rawClients, plans, { data: gym }] = await Promise.all([
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

  // Precalcular estado de membresía en el servidor (computeEffectiveStatus
  // depende de memberships.service, que no puede importarse desde un client component).
  const today = todayInBogota()
  const clients = (rawClients as any[]).map((c) => {
    const latestMem = (c.memberships as Array<{
      status: string; total_days: number; used_days: number
      start_date: string; end_date: string; grace_days: number
      plan: { name: string; days?: number } | null
    }> | undefined)?.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0]

    const elapsedDays = latestMem
      ? eligibleDaysElapsed(latestMem.start_date, today, daysPerWeekForPlan(latestMem.plan?.days ?? latestMem.total_days))
      : 0
    const remainingDays = latestMem ? Math.max(0, latestMem.total_days - elapsedDays) : 0
    const effectiveStatus: MembershipStatus | null = latestMem
      ? computeEffectiveStatus(elapsedDays, latestMem.total_days, latestMem.end_date, latestMem.grace_days, latestMem.status as MembershipStatus)
      : null

    return {
      id: c.id,
      auto_aprobacion: c.auto_aprobacion,
      comprobante_bloqueado: c.comprobante_bloqueado,
      profile: c.profile,
      effectiveStatus,
      remainingDays,
      planName: latestMem?.plan?.name ?? null,
      startDate: latestMem?.start_date ?? null,
      endDate: latestMem?.end_date ?? null,
    }
  })

  return (
    <div className="md:max-w-6xl md:mx-auto">
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Clientes</h1>
          <p className="text-zinc-500 text-sm">Gestiona ingresos y membresías</p>
        </div>
        {gym && <GymQrModal token={gym.checkin_token} gymName={gym.name} />}
      </header>

      <div className="px-6 pb-24 md:px-10">
        <ClientsList clients={clients} plans={planOptions} />
      </div>
    </div>
  )
}
