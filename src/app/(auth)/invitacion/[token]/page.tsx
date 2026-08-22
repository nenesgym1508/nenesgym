import Link from "next/link"
import { CheckCircle2, Clock, Ban } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getInvitationByToken } from "@/services/invitations.service"
import { InvitationAccept } from "@/components/auth/invitation-accept"
import { ROUTES } from "@/constants/routes"

// Ruta PÚBLICA. No hace falta tocar el middleware: usa denylist (solo protege
// /cliente*, /admin*, /login y /register), así que /invitacion/* sale antes de
// consultar auth.
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Activa tu acceso — NENE'S GYM",
  // El enlace es una credencial: que no acabe en un buscador ni se filtre por referer.
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
}

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const info = await getInvitationByToken(token)

  if (info.code !== "OK") {
    return <InvitacionNoDisponible code={info.code} />
  }

  // Si ya hay sesión, el componente pide confirmación explícita antes de
  // vincular: la tablet del mostrador o un móvil compartido son casos reales.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div>
      <div className="mb-5 text-center">
        <h2 className="text-xl font-bold text-zinc-100">Tu perfil ya está listo</h2>
        <p className="mt-1 text-sm text-zinc-400">
          {info.firstName ? `Hola, ${info.firstName}. ` : ""}
          El gimnasio creó tu perfil y activó tu membresía.
        </p>
      </div>

      <div className="mb-5 rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Activa tu acceso para consultar
        </p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-300">
          <li>• Tu membresía</li>
          <li>• Tus rutinas</li>
          <li>• Tus pagos</li>
          <li>• Tus asistencias</li>
          <li>• Tu progreso</li>
        </ul>
        {info.planName && (
          <div className="mt-3 border-t border-white/5 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
              Plan actual
            </p>
            <p className="mt-0.5 text-sm font-semibold text-zinc-100">{info.planName}</p>
          </div>
        )}
      </div>

      <InvitationAccept
        token={token}
        firstName={info.firstName}
        currentEmail={user?.email ?? null}
      />
    </div>
  )
}

/**
 * Invitación no utilizable. Revocada e inexistente comparten el mismo mensaje
 * genérico a propósito: no revelar detalles internos ni permitir distinguir
 * un token inventado de uno anulado.
 */
function InvitacionNoDisponible({ code }: { code: "INVALID" | "EXPIRED" | "REVOKED" | "ACCEPTED" }) {
  if (code === "ACCEPTED") {
    return (
      <Estado
        icon={<CheckCircle2 className="size-7 text-green-400" />}
        tone="green"
        title="Esta invitación ya fue utilizada"
        body="Si ya activaste tu cuenta, inicia sesión normalmente en NENE'S GYM."
        cta={{ href: ROUTES.LOGIN, label: "Iniciar sesión" }}
      />
    )
  }

  if (code === "EXPIRED") {
    return (
      <Estado
        icon={<Clock className="size-7 text-amber-400" />}
        tone="amber"
        title="Esta invitación ha vencido"
        body="Solicita al gimnasio una nueva invitación."
      />
    )
  }

  return (
    <Estado
      icon={<Ban className="size-7 text-zinc-400" />}
      tone="zinc"
      title="Esta invitación ya no está disponible"
      body="Comunícate con NENE'S GYM."
    />
  )
}

function Estado({
  icon,
  tone,
  title,
  body,
  cta,
}: {
  icon: React.ReactNode
  tone: "green" | "amber" | "zinc"
  title: string
  body: string
  cta?: { href: string; label: string }
}) {
  const ring =
    tone === "green" ? "bg-green-500/15" : tone === "amber" ? "bg-amber-500/15" : "bg-white/5"
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className={`flex size-14 items-center justify-center rounded-full ${ring}`}>{icon}</div>
      <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
      <p className="text-sm text-zinc-400">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-lg btn-glossy-red text-sm font-semibold text-white"
        >
          {cta.label}
        </Link>
      )}
    </div>
  )
}
