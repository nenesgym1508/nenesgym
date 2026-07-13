"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { ChevronRight, Plus, Save, Check } from "lucide-react"
import { Card } from "@/components/ui/card"
import { adminRutinaDetalle, ROUTES } from "@/constants/routes"
import { formatRoutineGoal, ROUTINE_STATUS_LABELS, type ClientRoutine } from "@/types/routine"
import { saveAsTrainingRoutineAction } from "@/actions/training-routines.actions"

interface ClientRoutinesSectionProps {
  clientId: string
  routines: ClientRoutine[]
}

export function ClientRoutinesSection({ clientId, routines }: ClientRoutinesSectionProps) {
  const assigned = routines.filter((r) => r.created_by_role === "admin")
  const ownCreated = routines.filter((r) => r.created_by_role === "client")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Rutinas</p>
        <Link
          href={`${ROUTES.ADMIN_RUTINAS_NUEVA}?clientId=${clientId}`}
          className="flex items-center gap-1 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
        >
          <Plus className="size-3.5" />
          Asignar rutina
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Asignadas por ti</p>
        {assigned.length === 0 ? (
          <Card className="p-4 text-center text-xs text-zinc-500">Aún no le has asignado ninguna rutina.</Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 divide-y divide-white/5">
            {assigned.map((r) => (
              <Link
                key={r.id}
                href={adminRutinaDetalle(r.id)}
                className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/40 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{r.title}</p>
                  <p className="text-[11px] text-zinc-500">
                    {ROUTINE_STATUS_LABELS[r.status]}
                    {r.days_per_week ? ` · ${r.days_per_week} días/sem` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 text-zinc-600 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Creadas por el cliente</p>
        {ownCreated.length === 0 ? (
          <Card className="p-4 text-center text-xs text-zinc-500">El cliente no ha creado rutinas propias.</Card>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 divide-y divide-white/5">
            {ownCreated.map((r) => (
              <OwnRoutineRow key={r.id} routine={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OwnRoutineRow({ routine }: { routine: ClientRoutine }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    startTransition(async () => {
      const res = await saveAsTrainingRoutineAction(routine.id, routine.title)
      if (res.success) setSaved(true)
    })
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-2">
      <Link href={adminRutinaDetalle(routine.id)} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
        <p className="text-sm font-medium text-zinc-200 truncate">{routine.title}</p>
        <p className="text-[11px] text-zinc-500">
          {routine.goal ? formatRoutineGoal(routine.goal, routine.custom_goal) : ROUTINE_STATUS_LABELS[routine.status]}
          {routine.days_per_week ? ` · ${routine.days_per_week} días/sem` : ""}
        </p>
      </Link>
      <button
        onClick={handleSave}
        disabled={isPending || saved}
        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
      >
        {saved ? (
          <><Check className="size-3.5 text-green-400" /> Guardada</>
        ) : (
          <><Save className="size-3.5" /> Guardar en biblioteca</>
        )}
      </button>
    </div>
  )
}
