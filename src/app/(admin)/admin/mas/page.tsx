import Link from "next/link"
import { redirect } from "next/navigation"
import { LogOut, ClipboardList } from "lucide-react"
import { getAuthenticatedSession } from "@/lib/auth/session"
import { getGymSettings, getAdminPlans } from "@/services/gym.service"
import { logoutAction, currentUserHasPasswordAction } from "@/actions/auth.actions"
import { PageHeader } from "@/components/layout/page-header"
import { GymSettingsForm } from "@/components/admin/gym-settings-form"
import { PlansManager } from "@/components/admin/plans-manager"
import { ProfileSettingsForm } from "@/components/admin/profile-settings-form"
import { GRACE_DAYS_DEFAULT } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

type Tab = "gym" | "cuenta"

export default async function AdminMasPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await getAuthenticatedSession()
  if (!session) redirect(ROUTES.LOGIN)

  const { user, profile } = session
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [gym, plans, passwordState] = await Promise.all([
    getGymSettings(),
    getAdminPlans(),
    currentUserHasPasswordAction(),
  ])

  const sp = await searchParams
  const activeTab: Tab = sp.tab === "cuenta" ? "cuenta" : "gym"

  return (
    <div className="md:max-w-4xl md:mx-auto">
      {/* Header unificado estilo cliente */}
      <header className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-bebas font-bold mb-1 tracking-wide uppercase text-white">Más</h1>
          <p className="text-zinc-500 text-sm">Configuración y utilidades del sistema</p>
        </div>
      </header>

      <div className="px-6 pb-24 md:px-10 space-y-6">
        {/* Selector de pestañas */}
        <div className="flex bg-[#0a0a0a] border border-[#222] rounded-xl p-1">
          {[
            { key: "gym", label: "Gimnasio" },
            { key: "cuenta", label: "Mi cuenta" },
          ].map((t) => (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              replace
              scroll={false}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer text-center ${
                activeTab === t.key
                  ? "text-red-500 border-b-2 border-red-500 bg-zinc-900/60"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {activeTab === "gym" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GymSettingsForm
              initialName={gym?.name ?? "NENE'S GYM"}
              initialGraceDays={gym?.grace_days ?? GRACE_DAYS_DEFAULT}
            />

            <PlansManager plans={plans} />

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Módulos operativos
              </h3>
              <Link
                href={ROUTES.ADMIN_ASISTENCIAS}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
              >
                <ClipboardList className="size-5 text-zinc-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-200">Registro de ingresos</span>
                  <span className="text-xs text-zinc-500">Consulta el historial de accesos al gimnasio</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {activeTab === "cuenta" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Mis datos personales
              </h3>
              <ProfileSettingsForm
                currentEmail={user.email ?? ""}
                currentName={profile?.full_name ?? ""}
                hasPassword={passwordState.hasPassword === true}
              />
            </div>

            <div className="pt-4">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-900/30 bg-red-950/20 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/40 hover:text-red-300 hover:border-red-900/50"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
