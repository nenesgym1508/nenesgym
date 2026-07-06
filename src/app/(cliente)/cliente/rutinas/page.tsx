import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Plus, ClipboardList } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientRoutines, getAssignedRoutine } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteRoutinesHubPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  if (!client) redirect(ROUTES.CLIENTE_DASHBOARD)

  const [assignedRoutine, myRoutines] = await Promise.all([
    getAssignedRoutine(client.id),
    getClientRoutines(client.id)
  ])

  // Filter custom routines (those created by client themselves)
  const customRoutines = myRoutines.filter((r) => r.created_by_role === "client")

  return (
    <div className="pb-24">
      <PageHeader title="Mis Rutinas" />
      <div className="p-4 space-y-5">
        {/* Rutina Asignada por Admin */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Asignada por el Gimnasio
          </h3>
          {assignedRoutine ? (
            <Link href={`/cliente/rutinas/${assignedRoutine.id}`}>
              <Card className="flex items-center justify-between p-4 border-red-600/20 bg-zinc-900/60 hover:bg-zinc-800/40 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-200 truncate">{assignedRoutine.title}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {assignedRoutine.goal ? `Objetivo: ${assignedRoutine.goal}` : "Rutina de entrenamiento"}
                  </p>
                </div>
                <ChevronRight className="size-4 text-zinc-600 shrink-0 ml-2" />
              </Card>
            </Link>
          ) : (
            <Card className="p-6 text-center text-zinc-500 text-xs bg-zinc-900/30">
              No tienes rutinas asignadas por tu profesor en este momento.
            </Card>
          )}
        </div>

        {/* Botón Nueva Rutina */}
        <Link
          href="/cliente/rutinas/nueva"
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="size-4" />
          Crear mi propia rutina
        </Link>

        {/* Mis rutinas creadas */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Mis Planes Personalizados ({customRoutines.length})
          </h3>
          {customRoutines.length === 0 ? (
            <Card className="p-8 text-center text-zinc-500 text-xs bg-zinc-900/20">
              Aún no has creado planes personalizados. ¡Haz clic en el botón de arriba para crear uno!
            </Card>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
              {customRoutines.map((r, idx) => (
                <Link
                  key={r.id}
                  href={`/cliente/rutinas/${r.id}`}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/20 transition-colors ${
                    idx < customRoutines.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{r.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {r.goal ? `Objetivo: ${r.goal}` : "Personalizada"} · {r.days_per_week ? `${r.days_per_week} días/sem` : "Sin días"}
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
