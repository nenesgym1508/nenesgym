"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, Users, CalendarCheck, Copy, Archive, ArchiveRestore, Trash2, UserPlus, CalendarPlus, Loader2, MoreVertical } from "lucide-react"
import { formatRoutineGoal } from "@/types/routine"
import { adminRutinaBibliotecaDetalle } from "@/constants/routes"
import { ActionMenu } from "@/components/ui/action-menu"
import {
  duplicateTrainingRoutineAction,
  updateTrainingRoutineMetaAction,
  deleteTrainingRoutineAction
} from "@/actions/training-routines.actions"
import type { TrainingRoutine } from "@/services/training-routines.service"

interface TrainingRoutinesListProps {
  routines: TrainingRoutine[]
}

export function TrainingRoutinesList({ routines: initialRoutines }: TrainingRoutinesListProps) {
  const router = useRouter()
  const [routines, setRoutines] = useState(initialRoutines)
  const [search, setSearch] = useState("")
  const [, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const filtered = routines.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase().trim())
  )

  const handleDuplicate = (id: string) => {
    if (pendingId) return
    setPendingId(id)
    startTransition(async () => {
      try {
        const res = await duplicateTrainingRoutineAction(id)
        if (res.success && res.id) router.push(adminRutinaBibliotecaDetalle(res.id))
      } finally {
        setPendingId(null)
      }
    })
  }

  const handleToggleActive = (routine: TrainingRoutine) => {
    if (pendingId) return
    setPendingId(routine.id)
    startTransition(async () => {
      try {
        const res = await updateTrainingRoutineMetaAction(routine.id, { is_active: !routine.is_active })
        if (!res.error) {
          setRoutines((prev) => prev.map((r) => (r.id === routine.id ? { ...r, is_active: !r.is_active } : r)))
        }
      } finally {
        setPendingId(null)
      }
    })
  }

  const handleDelete = (id: string) => {
    if (pendingId) return
    if (!confirm("¿Eliminar esta rutina de la biblioteca permanentemente?")) return
    setPendingId(id)
    startTransition(async () => {
      try {
        const res = await deleteTrainingRoutineAction(id)
        if (!res.error) setRoutines((prev) => prev.filter((r) => r.id !== id))
      } finally {
        setPendingId(null)
      }
    })
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        placeholder="Buscar rutina..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <ClipboardList className="size-8 text-zinc-700" />
          <div>
            <p className="text-sm font-medium text-zinc-400">Sin rutinas todavía</p>
            <p className="text-xs text-zinc-600 mt-1">Crea una rutina reutilizable para asignarla o programarla más rápido.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const isRowPending = pendingId === r.id
            const menuItems = [
              {
                label: "Asignar a cliente",
                icon: <UserPlus className="size-4" />,
                onClick: () => router.push(`${adminRutinaBibliotecaDetalle(r.id)}?assign=1`),
                disabled: isRowPending
              },
              {
                label: "Programar en clase",
                icon: <CalendarPlus className="size-4" />,
                onClick: () => router.push(`${adminRutinaBibliotecaDetalle(r.id)}?schedule=1`),
                disabled: isRowPending
              },
              {
                label: "Duplicar",
                icon: <Copy className="size-4" />,
                onClick: () => handleDuplicate(r.id),
                disabled: isRowPending
              },
              {
                label: r.is_active ? "Archivar" : "Reactivar",
                icon: r.is_active ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />,
                onClick: () => handleToggleActive(r),
                disabled: isRowPending
              },
              {
                label: "Eliminar",
                icon: <Trash2 className="size-4" />,
                destructive: true,
                onClick: () => handleDelete(r.id),
                disabled: isRowPending
              }
            ]

            return (
              <div
                key={r.id}
                className={`flex items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3.5 transition-opacity ${
                  !r.is_active ? "opacity-50" : isRowPending ? "opacity-70" : ""
                }`}
              >
                <ActionMenu
                  items={menuItems}
                  triggerIcon={
                    isRowPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <MoreVertical className="size-4" />
                    )
                  }
                >
                  <Link href={adminRutinaBibliotecaDetalle(r.id)} className="flex-1 min-w-0 hover:opacity-80 transition-opacity">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{r.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
                      {r.days_per_week && <span>{r.days_per_week} días/sem</span>}
                      {r.goal && <span>{formatRoutineGoal(r.goal, r.custom_goal)}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Users className="size-3" /> {r.assigned_count ?? 0}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarCheck className="size-3" /> {r.scheduled_count ?? 0}
                      </span>
                    </div>
                  </Link>
                </ActionMenu>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
