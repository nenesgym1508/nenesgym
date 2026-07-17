import Link from "next/link"
import { redirect } from "next/navigation"
import { LogOut, ClipboardList } from "lucide-react"
import { getAuthenticatedSession } from "@/lib/auth/session"
import { getGymSettings, getAdminPlans } from "@/services/gym.service"
import { logoutAction } from "@/actions/auth.actions"
import { PageHeader } from "@/components/layout/page-header"
import { GymSettingsForm } from "@/components/admin/gym-settings-form"
import { PlansManager } from "@/components/admin/plans-manager"
import { ProfileSettingsForm } from "@/components/admin/profile-settings-form"
import { GRACE_DAYS_DEFAULT } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminMasPage() {
  const session = await getAuthenticatedSession()
  if (!session) redirect(ROUTES.LOGIN)

  const { user, profile } = session
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [gym, plans] = await Promise.all([getGymSettings(), getAdminPlans()])

  return (
    <div>
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12">
        <div>
          <h1 className="text-3xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Más</h1>
          <p className="text-zinc-500 text-sm">Configuración y utilidades del sistema</p>
        </div>
      </header>

      <div className="px-6 pb-24 space-y-5">
        <GymSettingsForm
          initialName={gym?.name ?? "NENE'S GYM"}
          initialGraceDays={gym?.grace_days ?? GRACE_DAYS_DEFAULT}
          initialNequiNumber={gym?.nequi_number}
          initialNequiTitular={gym?.nequi_titular}
          initialDaviplataNumber={gym?.daviplata_number}
          initialDavaplataTitular={gym?.daviplata_titular}
        />

        <PlansManager plans={plans} />

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Módulos
          </h3>
          <Link
            href={ROUTES.ADMIN_ASISTENCIAS}
            className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
          >
            <ClipboardList className="size-4 text-zinc-400 shrink-0" />
            <span className="text-sm font-medium text-zinc-300">Registro de ingresos</span>
          </Link>
        </div>

        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Mi cuenta
          </h3>
          <ProfileSettingsForm
            currentEmail={user.email ?? ""}
            currentName={profile?.full_name ?? ""}
          />
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:border-red-700/50 hover:text-red-400"
          >
            <LogOut className="size-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
