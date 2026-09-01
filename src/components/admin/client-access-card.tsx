"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Smartphone, CheckCircle2, Clock, AlertTriangle, Loader2, Ban } from "lucide-react"
import { revokeInvitationAction } from "@/actions/invitations.actions"
import { InvitationActions } from "@/components/admin/invitation-actions"
import { formatDate } from "@/lib/dates"
import type { ClientAccessState } from "@/services/invitations.service"

interface ClientAccessCardProps {
  clientId: string
  state: ClientAccessState
}

/**
 * "Acceso a la app" en la ficha del cliente.
 *
 * La invitación NO es parte del cobro: esta tarjeta existe para poder mandarla
 * (o volver a mandarla) en cualquier momento después del alta.
 */
export function ClientAccessCard({ clientId, state }: ClientAccessCardProps) {
  const router = useRouter()
  const [revoking, setRevoking] = useState(false)

  const revoke = async () => {
    if (!state.invitationId) return
    setRevoking(true)
    await revokeInvitationAction(state.invitationId, clientId)
    setRevoking(false)
    // staleTimes.dynamic = 60 en producción: sin esto el estado tardaría hasta
    // un minuto en reflejarse.
    router.refresh()
  }

  if (state.status === "no_disponible") {
    return (
      <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-3">
        <Header />
        <p className="mt-1 text-[11px] text-zinc-500">
          El módulo de invitaciones aún no está instalado en la base de datos.
        </p>
      </div>
    )
  }

  if (state.status === "activa") {
    return (
      <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-3">
        <div className="flex items-center justify-between">
          <Header />
          <span className="inline-flex items-center gap-1 rounded-md border border-green-500/25 bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-400">
            <CheckCircle2 className="size-3" /> Activo
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-zinc-500">
          {state.acceptedEmail ? `Vinculado con ${state.acceptedEmail}` : "Cuenta vinculada"}
          {state.acceptedAt ? ` el ${formatDate(state.acceptedAt)}` : ""}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/8 bg-zinc-900/40 p-3">
      <div className="flex items-center justify-between">
        <Header />
        {state.status === "invitada" && (
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
            <Clock className="size-3" /> Invitación enviada
          </span>
        )}
        {state.status === "vencida" && (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle className="size-3" /> Vencida
          </span>
        )}
        {state.status === "sin_activar" && (
          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Sin activar
          </span>
        )}
      </div>

      {state.status === "invitada" && state.expiresAt && (
        <p className="mt-1.5 text-[11px] text-zinc-500">Vence el {formatDate(state.expiresAt)}</p>
      )}
      {state.status === "vencida" && (
        <p className="mt-1.5 text-[11px] text-zinc-500">Genera una nueva para que pueda entrar.</p>
      )}
      {state.status === "sin_activar" && (
        <p className="mt-1.5 text-[11px] text-zinc-500">
          El cliente existe en el gimnasio pero todavía no puede entrar a la app.
        </p>
      )}

      {/* Intentos fallidos: la señal de que alguien está abriendo el enlace y
          algo lo bloquea (cuenta con historial propio, enlace ya usado…). */}
      {state.attempts > 0 && (
        <p className="mt-1 text-[11px] text-amber-400/80">
          {state.attempts} {state.attempts === 1 ? "intento" : "intentos"} de activación sin completar.
        </p>
      )}

      <div className="mt-2.5">
        <InvitationActions
          clientId={clientId}
          generateLabel={state.status === "sin_activar" ? "Enviar invitación" : "Generar nueva invitación"}
          onGenerated={() => router.refresh()}
        />
      </div>

      {state.status === "invitada" && state.invitationId && (
        <button
          onClick={revoke}
          disabled={revoking}
          className="mt-1 flex w-full items-center justify-center gap-1.5 py-1 text-[11px] text-zinc-500 hover:text-red-400 disabled:opacity-50 cursor-pointer"
        >
          {revoking ? <Loader2 className="size-3 animate-spin" /> : <Ban className="size-3" />}
          Anular la invitación actual
        </button>
      )}
    </div>
  )
}

function Header() {
  return (
    <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
      <Smartphone className="size-3.5" /> Acceso a la app
    </h4>
  )
}
