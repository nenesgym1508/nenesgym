"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, Calendar, Dumbbell, Trash2, Loader2, AlertTriangle } from "lucide-react"
import { deleteRoutineAction } from "@/actions/routines.actions"
import { formatRoutineGoal, ROUTINE_STATUS_LABELS, type RoutineStatus } from "@/types/routine"

const STATUS_BADGE_CLASSES: Record<RoutineStatus, string> = {
  active: "text-green-500 bg-green-500/10 border-green-500/20",
  draft: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  paused: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  completed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  archived: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
}

interface Routine {
  id: string
  title: string
  status: RoutineStatus
  goal: string | null
  custom_goal: string | null
  days_per_week: number | null
}

interface CustomRoutineCardProps {
  routine: Routine
}

function CustomRoutineCard({ routine: r }: CustomRoutineCardProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const result = await deleteRoutineAction(r.id)
    setDeleting(false)
    if (result.error) {
      setError(result.error)
    } else {
      setConfirmOpen(false)
      router.refresh()
    }
  }

  return (
    <>
      <div className="relative rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)] overflow-hidden hover:border-red-600/40 transition-colors">
        {/* Botón eliminar — esquina superior derecha */}
        <button
          onClick={(e) => { e.preventDefault(); setConfirmOpen(true) }}
          className="absolute top-3 right-3 z-10 flex size-8 items-center justify-center rounded-xl bg-zinc-900/80 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all"
          aria-label="Eliminar rutina"
        >
          <Trash2 className="size-3.5" />
        </button>

        <Link href={`/cliente/rutinas/${r.id}`} className="block p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full border border-zinc-600 flex items-center justify-center bg-zinc-950 shrink-0">
                <Dumbbell className="size-5 text-zinc-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-bebas font-bold text-xl tracking-wide uppercase text-white truncate">
                  {r.title}
                </h4>
                <span className={`text-[10px] rounded-md px-2.5 py-0.5 mt-1 inline-block font-semibold border ${STATUS_BADGE_CLASSES[r.status]}`}>
                  {ROUTINE_STATUS_LABELS[r.status]}
                </span>
              </div>
            </div>
            <ChevronRight className="size-5 text-zinc-500 shrink-0" />
          </div>

          <div className="border-t border-white/5" />

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl border border-white/5 bg-zinc-950 flex items-center justify-center shrink-0">
              <Calendar className="size-5 text-red-500" />
            </div>
            <div className="min-w-0 text-xs text-zinc-400 space-y-0.5">
              <p className="truncate">
                <span className="text-zinc-500 font-medium">Objetivo:</span>{" "}
                {r.goal ? formatRoutineGoal(r.goal, r.custom_goal) : "Personalizada"}
              </p>
              <p className="truncate">
                <span className="text-zinc-500 font-medium">Frecuencia:</span>{" "}
                {r.days_per_week ? `${r.days_per_week} días/sem` : "Sin definir"}
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* Modal de confirmación */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono y texto */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="size-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-bebas tracking-wide uppercase">
                  Eliminar rutina
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  ¿Estás seguro que quieres eliminar{" "}
                  <span className="font-semibold text-zinc-200">{r.title}</span>?
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-400 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 h-11 rounded-lg border border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white transition-colors text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Eliminar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface CustomRoutinesListProps {
  routines: Routine[]
}

export function CustomRoutinesList({ routines }: CustomRoutinesListProps) {
  if (routines.length === 0) {
    return (
      <div className="p-8 text-center text-zinc-500 text-xs rounded-3xl border border-zinc-800 bg-zinc-900/20">
        Aún no has creado planes personalizados. ¡Toca el botón de arriba para crear uno!
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {routines.map((r) => (
        <CustomRoutineCard key={r.id} routine={r} />
      ))}
    </div>
  )
}
