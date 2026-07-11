"use client"

import Link from "next/link"
import { ChevronRight, ClipboardList } from "lucide-react"
import { formatRoutineGoal } from "@/types/routine"
import { adminRutinaPlantillaDetalle } from "@/constants/routes"
import type { RoutineTemplate } from "@/services/routine-templates.service"

interface RoutineTemplatesListProps {
  templates: RoutineTemplate[]
}

export function RoutineTemplatesList({ templates }: RoutineTemplatesListProps) {
  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-12 text-center">
        <ClipboardList className="size-8 text-zinc-700" />
        <div>
          <p className="text-sm font-medium text-zinc-400">Sin plantillas de rutinas</p>
          <p className="text-xs text-zinc-600 mt-1">
            Crea una plantilla de rutina para asignarla a tus clientes más rápido.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
      {templates.map((tpl, i) => (
        <div
          key={tpl.id}
          className={`flex items-center gap-3 px-4 py-3.5 ${
            !tpl.is_active ? "opacity-50" : ""
          } ${i < templates.length - 1 ? "border-b border-white/5" : ""}`}
        >
          <Link
            href={adminRutinaPlantillaDetalle(tpl.id)}
            className="flex-1 min-w-0 flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-200 truncate">{tpl.name}</p>
              <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                {tpl.exercise_count != null && (
                  <span>
                    {tpl.exercise_count} ejercicio{tpl.exercise_count === 1 ? "" : "s"}
                  </span>
                )}
                {tpl.goal && (
                  <span>
                    {formatRoutineGoal(tpl.goal, tpl.custom_goal)}
                  </span>
                )}
                {tpl.days_per_week && <span>{tpl.days_per_week} días/semana</span>}
              </div>
            </div>
            <ChevronRight className="size-4 text-zinc-600 shrink-0" />
          </Link>
        </div>
      ))}
    </div>
  )
}
