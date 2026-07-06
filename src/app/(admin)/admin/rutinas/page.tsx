import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, ClipboardList, BookOpen, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAdminRoutines, getActiveRoutinesWithClient } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { ROUTES, adminRutinaDetalle } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminRoutinesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [activeRoutines, allRoutines] = await Promise.all([
    getActiveRoutinesWithClient(),
    getAdminRoutines()
  ])

  return (
    <div className="pb-24">
      <PageHeader title="Rutinas Clientes" showLogout />
      <div className="p-4 space-y-4">
        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={ROUTES.ADMIN_RUTINAS_PLANTILLAS}
            className="flex items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
          >
            <BookOpen className="size-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Plantillas</span>
          </Link>
          <Link
            href={ROUTES.ADMIN_RUTINAS_NUEVA}
            className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
          >
            <Plus className="size-4" />
            Nueva rutina
          </Link>
        </div>

        {/* Rutinas activas por cliente */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Rutinas Activas ({activeRoutines.length})
          </h3>
          {activeRoutines.length === 0 ? (
            <Card className="p-8 text-center text-zinc-500 text-sm">
              No hay rutinas activas asignadas en este momento.
            </Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
              {activeRoutines.map((r, idx) => (
                <Link
                  key={r.id}
                  href={adminRutinaDetalle(r.id)}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/20 transition-colors ${
                    idx < activeRoutines.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{r.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                      Cliente: {r.client?.profile?.full_name ?? "Sin nombre"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-zinc-600 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Historial / Todas las rutinas */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Todas las rutinas ({allRoutines.length})
          </h3>
          {allRoutines.length === 0 ? (
            <Card className="p-8 text-center text-zinc-500 text-sm">
              Aún no has creado ninguna rutina.
            </Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
              {allRoutines.map((r, idx) => (
                <Link
                  key={r.id}
                  href={adminRutinaDetalle(r.id)}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/20 transition-colors ${
                    idx < allRoutines.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{r.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Estado: {r.status} · {r.days_per_week ? `${r.days_per_week} días/sem` : "Sin días"}
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-zinc-600 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
