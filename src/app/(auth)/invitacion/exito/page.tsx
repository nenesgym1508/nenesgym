import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { ROUTES } from "@/constants/routes"

export const metadata = {
  title: "Cuenta activada — NENE'S GYM",
  robots: { index: false, follow: false },
}

/**
 * Confirmación tras vincular. El cliente encuentra todo su historial porque nunca
 * cambió su `clients.id`: solo se movió el puntero al perfil de su cuenta.
 */
export default function InvitacionExitoPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
        <CheckCircle2 className="size-8 text-green-400" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-zinc-100">Cuenta activada</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Tu perfil ya está vinculado a NENE&apos;S GYM.
        </p>
      </div>

      <div className="w-full rounded-xl border border-white/8 bg-white/[0.02] p-4 text-left">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Ahora puedes consultar
        </p>
        <ul className="mt-2 space-y-1 text-sm text-zinc-300">
          <li>• Tu membresía</li>
          <li>• Tus rutinas</li>
          <li>• Tus pagos</li>
          <li>• Tus asistencias</li>
          <li>• Tu progreso</li>
        </ul>
      </div>

      <Link
        href={ROUTES.CLIENTE_DASHBOARD}
        className="flex h-11 w-full items-center justify-center rounded-lg btn-glossy-red text-sm font-semibold text-white"
      >
        Ir a mi inicio
      </Link>
    </div>
  )
}
