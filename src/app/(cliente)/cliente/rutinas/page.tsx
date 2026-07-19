import Link from "next/link"
import { redirect } from "next/navigation"
import { ChevronRight, Plus, Calendar, Dumbbell } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientRoutines, getAssignedRoutine } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { formatRoutineGoal, type RoutineStatus } from "@/types/routine"
import { CustomRoutinesList } from "@/components/cliente/custom-routines-list"

const STATUS_BADGE_CLASSES: Record<RoutineStatus, string> = {
  active: "text-green-500 bg-green-500/10 border-green-500/20",
  draft: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  paused: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  completed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  archived: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
}

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
      <div className="p-4 md:px-10 md:py-8 space-y-5">
        {/* Rutina Asignada por Admin */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Asignada por el Gimnasio
          </h3>
          {assignedRoutine ? (
            <Link
              href={`/cliente/rutinas/${assignedRoutine.id}`}
              className="block rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)] space-y-3.5 hover:border-red-600/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-full border border-red-500/40 shadow-[0_0_10px_rgba(220,38,38,0.15)] flex items-center justify-center bg-zinc-950 shrink-0">
                    <Dumbbell className="size-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bebas font-bold text-xl tracking-wide uppercase text-white truncate">
                      {assignedRoutine.title}
                    </h4>
                    <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-2.5 py-0.5 mt-1 inline-block font-semibold">
                      Asignada
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 text-zinc-500 shrink-0" />
              </div>

              <div className="border-t border-white/5" />

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl border border-white/5 bg-zinc-950 flex items-center justify-center shrink-0">
                  <Calendar className="size-5 text-red-500" />
                </div>
                <div className="min-w-0 text-xs text-zinc-400 space-y-0.5">
                  <p className="truncate">
                    <span className="text-zinc-500 font-medium">Objetivo:</span>{" "}
                    {assignedRoutine.goal ? formatRoutineGoal(assignedRoutine.goal, assignedRoutine.custom_goal) : "Sin definir"}
                  </p>
                  <p className="truncate">
                    <span className="text-zinc-500 font-medium">Frecuencia:</span>{" "}
                    {assignedRoutine.days_per_week ? `${assignedRoutine.days_per_week} días/sem` : "Sin definir"}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <Card className="p-6 text-center text-zinc-500 text-xs bg-zinc-900/30">
              No tienes rutinas asignadas por tu profesor en este momento.
            </Card>
          )}
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/cliente/rutinas/nueva"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl btn-glossy-red px-4 md:px-8 py-3 text-sm font-semibold text-white cursor-pointer"
          >
            <Plus className="size-4" />
            Crear mi propia rutina
          </Link>
          <Link
            href={ROUTES.CLIENTE_RUTINAS_EJERCICIOS}
            className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
          >
            <Dumbbell className="size-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Ejercicios</span>
          </Link>
        </div>

        {/* Mis rutinas creadas */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Mis Planes Personalizados ({customRoutines.length})
          </h3>
          <CustomRoutinesList routines={customRoutines} />
        </div>
      </div>
    </div>
  )
}
