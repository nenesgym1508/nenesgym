import { redirect } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getGymSettings, getAdminPlans } from "@/services/gym.service"
import { logoutAction } from "@/actions/auth.actions"
import { PageHeader } from "@/components/layout/page-header"
import { GymSettingsForm } from "@/components/admin/gym-settings-form"
import { PlansManager } from "@/components/admin/plans-manager"
import { ProfileSettingsForm } from "@/components/admin/profile-settings-form"
import { GRACE_DAYS_DEFAULT } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

export default async function AdminMasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const [gym, plans] = await Promise.all([getGymSettings(), getAdminPlans()])

  return (
    <div>
      <PageHeader title="Más" />
      <div className="p-4 space-y-5">
        <GymSettingsForm
          initialName={gym?.name ?? "NENE'S GYM"}
          initialGraceDays={gym?.grace_days ?? GRACE_DAYS_DEFAULT}
        />

        <PlansManager plans={plans} />

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
