"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Pencil, X } from "lucide-react"
import { setAttendanceForDateAction } from "@/actions/admin.actions"
import { formatDate, todayInBogota } from "@/lib/dates"

interface AttendanceCorrectorProps {
  clientId: string
  membershipId: string
  /** Fechas 'yyyy-MM-dd' ya marcadas como asistidas. */
  attendanceDates: string[]
  startDate: string
  endDate: string
  totalDays: number
  usedDays: number
}

/**
 * Corrección manual de asistencias, en la ficha del cliente.
 *
 * Desde que los días del plan se gastan al marcar entrada (Sesión 23), un
 * olvido del cliente le regala un día y un clic de más se lo quita. Esto es el
 * arreglo: el dueño abre la lista de días del plan y marca o desmarca el que
 * corresponda.
 *
 * Solo se listan días del plan que ya pasaron: marcar el futuro no tendría
 * sentido y la RPC lo rechaza igualmente.
 */
export function AttendanceCorrector({
  clientId, membershipId, attendanceDates, startDate, endDate, totalDays, usedDays,
}: AttendanceCorrectorProps) {
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState("")

  const hoy = todayInBogota()
  const marcadas = new Set(attendanceDates)

  // Días del plan hasta hoy, del más reciente al más antiguo: un olvido casi
  // siempre es de ayer o anteayer, no del primer día del mes.
  const dias: string[] = []
  const tope = endDate < hoy ? endDate : hoy
  const d = new Date(`${startDate}T00:00:00`)
  const fin = new Date(`${tope}T00:00:00`)
  while (d <= fin) {
    dias.push(d.toISOString().slice(0, 10))
    d.setDate(d.getDate() + 1)
  }
  dias.reverse()

  const alternar = async (fecha: string) => {
    if (guardando) return
    setGuardando(fecha)
    setError("")
    try {
      const r = await setAttendanceForDateAction({
        clientId, membershipId, date: fecha, attended: !marcadas.has(fecha),
      })
      if ("error" in r && r.error) setError(r.error)
      else router.refresh()
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.")
    } finally {
      setGuardando(null)
    }
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-300 cursor-pointer"
      >
        <Pencil className="size-3" />
        ¿Olvidó marcar un día? Corregir asistencia
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-zinc-200">Corregir asistencia</p>
          <p className="text-[10px] text-zinc-500">
            Toca un día para marcarlo o quitarlo. Van {usedDays} de {totalDays}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-full p-1 text-zinc-500 hover:text-zinc-300 cursor-pointer"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      {error && <p className="mb-2 text-[11px] text-red-400">{error}</p>}

      <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
        {dias.map((fecha) => {
          const asistio = marcadas.has(fecha)
          const ocupado = guardando === fecha
          return (
            <button
              key={fecha}
              type="button"
              onClick={() => alternar(fecha)}
              disabled={!!guardando}
              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition-colors cursor-pointer disabled:opacity-50 ${
                asistio
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <span className={`text-[11px] ${asistio ? "text-emerald-300" : "text-zinc-400"}`}>
                {formatDate(fecha)}
              </span>
              {ocupado ? (
                <Loader2 className="size-3.5 animate-spin text-zinc-400" />
              ) : asistio ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
                  <Check className="size-3" /> Asistió
                </span>
              ) : (
                <span className="text-[10px] text-zinc-600">No vino</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
