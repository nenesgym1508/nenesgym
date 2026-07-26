"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ChevronRight, Plus, Save, Check, Dumbbell, Calendar } from "lucide-react"
import { adminRutinaDetalle, ROUTES } from "@/constants/routes"
import { formatRoutineGoal, ROUTINE_STATUS_LABELS, type ClientRoutine, type RoutineStatus } from "@/types/routine"
import { saveAsTrainingRoutineAction } from "@/actions/training-routines.actions"

// Mismo diseño de tarjeta grande que ve el cliente en /cliente/rutinas
// (ver custom-routines-list.tsx), adaptado a las rutas y acciones del admin.

const STATUS_BADGE_CLASSES: Record<RoutineStatus, string> = {
  active: "text-green-500 bg-green-500/10 border-green-500/20",
  draft: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",
  paused: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  completed: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  archived: "text-zinc-500 bg-zinc-500/10 border-zinc-500/20",
}

interface ClientRoutinesSectionProps {
  clientId: string
  routines: ClientRoutine[]
}

export function ClientRoutinesSection({ clientId, routines }: ClientRoutinesSectionProps) {
  const assigned = routines.filter((r) => r.created_by_role === "admin")
  const ownCreated = routines.filter((r) => r.created_by_role === "client")

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Rutinas</p>
        <Link
          href={`${ROUTES.ADMIN_RUTINAS_NUEVA}?clientId=${clientId}`}
          className="flex items-center gap-1.5 rounded-xl btn-glossy-red px-3.5 py-2 text-xs font-semibold text-white"
        >
          <Plus className="size-3.5" />
          Asignar rutina
        </Link>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Asignadas por ti</h3>
        {assigned.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs rounded-3xl border border-zinc-800 bg-zinc-900/20">
            Aún no le has asignado ninguna rutina.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assigned.map((r) => (
              <RoutineCard key={r.id} routine={r} />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Creadas por el cliente
        </h3>
        {ownCreated.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 text-xs rounded-3xl border border-zinc-800 bg-zinc-900/20">
            El cliente no ha creado rutinas propias.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ownCreated.map((r) => (
              <RoutineCard key={r.id} routine={r} showSaveToLibrary />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RoutineCard({ routine: r, showSaveToLibrary }: { routine: ClientRoutine; showSaveToLibrary?: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveAsTrainingRoutineAction(r.id, r.title)
      if (res.success) setSaved(true)
    })
  }

  return (
    <div className="relative rounded-3xl border border-zinc-700 bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 shadow-[0_4px_25px_rgba(0,0,0,0.65)] overflow-hidden hover:border-red-600/40 transition-colors">
      <Link href={adminRutinaDetalle(r.id)} className="block p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
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
      </Link>

      <div className="flex items-center justify-between gap-3 px-5 pb-5">
        <Link href={adminRutinaDetalle(r.id)} className="flex items-center gap-3 min-w-0 flex-1">
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
        </Link>
        {showSaveToLibrary && (
          <button
            onClick={handleSave}
            disabled={isPending || saved}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-900/80 border border-white/5 px-2.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {saved ? (
              <><Check className="size-3.5 text-green-400" /> Guardada</>
            ) : (
              <><Save className="size-3.5" /> Guardar</>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
