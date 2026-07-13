import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Dumbbell } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getTrainingRoutines } from "@/services/training-routines.service"
import { getAdminRoutines, getClientsWithoutRoutine } from "@/services/routines.service"
import { PageHeader } from "@/components/layout/page-header"
import { TrainingRoutinesList } from "@/components/admin/training-routines-list"
import { RoutinesList } from "@/components/admin/routines-list"
import { ClasesAgenda } from "@/components/admin/clases-agenda"
import { EntrenamientoTabs, type EntrenamientoTab } from "@/components/admin/entrenamiento-tabs"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminEntrenamientoPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const { tab: tabParam } = await searchParams
  const tab: EntrenamientoTab = tabParam === "asignaciones" || tabParam === "clases" ? tabParam : "rutinas"

  const asignacionesData =
    tab === "asignaciones"
      ? await Promise.all([getAdminRoutines(), getClientsWithoutRoutine()]).then(
          ([routines, clientsWithoutRoutine]) => ({ routines, clientsWithoutRoutine })
        )
      : null

  return (
    <div className="pb-24 md:max-w-6xl md:mx-auto">
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Entrenamiento</h1>
          <p className="text-zinc-500 text-sm">Planificación de clases y programas</p>
        </div>
      </header>

      <div className="px-6 md:px-10 space-y-4">
        <EntrenamientoTabs active={tab} />

        {tab === "rutinas" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Link
                href={ROUTES.ADMIN_RUTINAS_BIBLIOTECA_NUEVA}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl btn-glossy-red px-4 md:px-8 py-3 text-sm font-semibold text-white cursor-pointer"
              >
                <Plus className="size-4" />
                Nueva rutina
              </Link>
              <Link
                href={ROUTES.ADMIN_CLASES_EJERCICIOS}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
              >
                <Dumbbell className="size-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-300">Ejercicios</span>
              </Link>
            </div>
            <TrainingRoutinesList routines={await getTrainingRoutines()} />
          </div>
        )}

        {tab === "asignaciones" && (
          <RoutinesList
            routines={asignacionesData!.routines}
            clientsWithoutRoutine={asignacionesData!.clientsWithoutRoutine}
          />
        )}

        {tab === "clases" && <ClasesAgenda />}
      </div>
    </div>
  )
}
