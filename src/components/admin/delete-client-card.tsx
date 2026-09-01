"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2, AlertTriangle } from "lucide-react"
import { deleteClientCompletelyAction } from "@/actions/admin.actions"
import { LoadingButton } from "@/components/ui/loading-button"
import { ROUTES } from "@/constants/routes"

/**
 * Eliminar un cliente de la base para siempre.
 *
 * Va al FINAL de la ficha y cerrado por defecto: no es una acción del día a día
 * y no debe competir por la atención con los botones que sí se usan.
 *
 * ⚠️ Pide escribir ELIMINAR, no un simple "¿estás seguro?". La diferencia no es
 * ceremonia: un confirm() se acepta por reflejo, y aquí no hay papelera ni
 * copia de seguridad. Escribir la palabra obliga a mirar de quién se trata.
 */
export function DeleteClientCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [palabra, setPalabra] = useState("")
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  const confirmado = palabra.trim().toUpperCase() === "ELIMINAR"

  const eliminar = async () => {
    if (!confirmado) return
    setCargando(true)
    setError("")
    let r: Awaited<ReturnType<typeof deleteClientCompletelyAction>>
    try {
      r = await deleteClientCompletelyAction(clientId, palabra)
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.")
      setCargando(false)
      return
    }
    if ("error" in r) {
      setError(r.error)
      setCargando(false)
      return
    }
    // Se sale de la ficha: acaba de dejar de existir.
    router.replace(ROUTES.ADMIN_CLIENTES)
    router.refresh()
  }

  if (!abierto) {
    return (
      <div className="mt-8 border-t border-white/5 pt-5">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 text-xs font-medium text-zinc-600 hover:text-red-400 cursor-pointer"
        >
          <Trash2 className="size-3.5" />
          Eliminar este cliente
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 rounded-2xl border border-red-900/40 bg-red-950/10 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-300">
            Eliminar a {clientName} para siempre
          </p>
          <p className="mt-1 text-[11px] leading-normal text-zinc-400">
            Se borra su ficha, su historial completo —membresías, pagos, asistencias, rutinas y
            progreso— y su cuenta de acceso. <strong className="text-zinc-200">No se puede
            deshacer</strong>: no hay papelera ni copia de seguridad.
          </p>
          <p className="mt-1.5 text-[11px] leading-normal text-zinc-500">
            Si solo quieres que deje de venir, no hace falta borrarlo: al vencer su plan queda
            como inactivo y conservas su historial.
          </p>

          <label htmlFor="borrar_confirmacion" className="mt-3 block text-[11px] font-medium text-zinc-400">
            Escribe <strong className="text-zinc-200">ELIMINAR</strong> para confirmar
          </label>
          <input
            id="borrar_confirmacion"
            type="text"
            autoComplete="off"
            value={palabra}
            onChange={(e) => { setPalabra(e.target.value); setError("") }}
            placeholder="ELIMINAR"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm tracking-wider text-zinc-100 outline-none focus:border-red-600 placeholder:text-zinc-600"
          />

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => { setAbierto(false); setPalabra(""); setError("") }}
              disabled={cargando}
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.02] py-2 text-xs font-medium text-zinc-300 hover:border-white/25 disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>
            <LoadingButton
              onClick={eliminar}
              pending={cargando}
              pendingText="Eliminando..."
              disabled={!confirmado}
              className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-40 cursor-pointer"
            >
              Eliminar definitivamente
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  )
}
