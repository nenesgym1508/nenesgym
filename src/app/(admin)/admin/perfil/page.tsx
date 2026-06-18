import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { ProfileSettingsForm } from "@/components/admin/profile-settings-form"
import { ROUTES } from "@/constants/routes"

export default async function AdminPerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  return (
    <div>
      <PageHeader title="Mi perfil" />
      <div className="p-4">
        <ProfileSettingsForm
          currentEmail={user.email ?? ""}
          currentName={profile?.full_name ?? ""}
        />
      </div>
    </div>
  )
}
