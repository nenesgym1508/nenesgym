import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { ROUTES } from "@/constants/routes"

export const metadata = {
  title: "No se pudo activar — NENE'S GYM",
  robots: { index: false, follow: false },
}

// Mensajes por código de la RPC accept_client_invitation. Deliberadamente
// vagos en los casos de conflicto: no revelan qué cuenta usó la invitación ni
// qué cliente existe detrás.
const MENSAJES: Record<string, string> = {
  ALREADY_USED: "Esta invitación ya fue utilizada. Si ya activaste tu cuenta, inicia sesión normalmente.",
  EXPIRED: "Esta invitación ha vencido. Solicita al gimnasio una nueva.",
  REVOKED: "Esta invitación ya no está disponible. Comunícate con NENE'S GYM.",
  INVALID: "Esta invitación ya no está disponible. Comunícate con NENE'S GYM.",
  ACCOUNT_HAS_DATA: "Esta cuenta ya es cliente del gimnasio y tiene su propio historial. Comunícate con NENE'S GYM para unir los dos perfiles.",
  HAS_REAL_ACCOUNT: "Esta ficha ya pertenece a una cuenta activa. Si es tuya, inicia sesión normalmente; si no, comunícate con NENE'S GYM.",
  ALREADY_LINKED: "Esta cuenta ya está vinculada a otro perfil del gimnasio. Comunícate con NENE'S GYM.",
  IS_ADMIN: "La cuenta del gimnasio no puede aceptar invitaciones de cliente. Inicia sesión con la cuenta del cliente.",
  NO_PROFILE: "Tu cuenta todavía se está preparando. Vuelve a abrir el enlace en unos segundos.",
  UNAUTHENTICATED: "Necesitas iniciar sesión para activar tu acceso. Vuelve a abrir el enlace.",
  NOT_INSTALLED: "El sistema de invitaciones aún no está disponible. Avisa al gimnasio.",
}

export default async function InvitacionErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  const mensaje = MENSAJES[code ?? ""] ?? "No pudimos activar tu acceso. Comunícate con NENE'S GYM."

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-amber-500/15">
        <AlertTriangle className="size-7 text-amber-400" />
      </div>

      <div>
        <h2 className="text-lg font-bold text-zinc-100">No se pudo activar tu acceso</h2>
        <p className="mt-1.5 text-sm text-zinc-400">{mensaje}</p>
      </div>

      <Link
        href={ROUTES.LOGIN}
        className="mt-1 flex h-11 w-full items-center justify-center rounded-lg btn-glossy-red text-sm font-semibold text-white"
      >
        Iniciar sesión
      </Link>
    </div>
  )
}
