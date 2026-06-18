import { redirect } from "next/navigation"
import { Dumbbell, LogOut } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { logoutAction } from "@/actions/auth.actions"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { ClientProfileForm } from "@/components/cliente/profile-form"
import { ROUTES } from "@/constants/routes"

export default async function ClientePerfilPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { user, profile } = clientData

  return (
    <div>
      <PageHeader title="Mi perfil" />
      <div className="p-4 space-y-5">
        <ClientProfileForm
          currentName={profile.full_name ?? ""}
          currentPhone={profile.phone ?? ""}
          currentEmail={profile.email ?? user.email ?? ""}
        />

        {/* Mi gimnasio */}
        <Card className="flex items-center gap-3 p-4">
          <div className="size-10 rounded-xl bg-red-600/15 flex items-center justify-center">
            <Dumbbell className="size-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Mi gimnasio</p>
            <p className="text-sm font-semibold text-zinc-200">NENE&apos;S GYM</p>
          </div>
        </Card>

        {/* Cerrar sesión */}
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
