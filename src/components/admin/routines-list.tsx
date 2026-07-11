"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, Plus, BookOpen } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ChipSelect } from "@/components/ui/chip-select"
import { adminRutinaDetalle, ROUTES } from "@/constants/routes"
import { ROUTINE_STATUS_LABELS, type RoutineStatus } from "@/types/routine"

type RoutineRow = {
  id: string
  title: string
  status: RoutineStatus
  days_per_week: number | null
  client: { id: string; profile: { full_name: string | null } | null } | null
}

interface RoutinesListProps {
  routines: RoutineRow[]
}

const FILTER_OPTIONS: { value: RoutineStatus | ""; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "active", label: ROUTINE_STATUS_LABELS.active },
  { value: "paused", label: ROUTINE_STATUS_LABELS.paused },
  { value: "completed", label: ROUTINE_STATUS_LABELS.completed },
  { value: "archived", label: ROUTINE_STATUS_LABELS.archived },
  { value: "draft", label: ROUTINE_STATUS_LABELS.draft },
]

const EMPTY_LABELS: Record<RoutineStatus | "", string> = {
  "": "No hay rutinas todavía.",
  active: "No hay rutinas activas.",
  paused: "No hay rutinas pausadas.",
  completed: "No hay rutinas completadas.",
  archived: "No hay rutinas archivadas.",
  draft: "No hay borradores de rutina.",
}

export function RoutinesList({ routines }: RoutinesListProps) {
  const [filter, setFilter] = useState<RoutineStatus | "">("active")
  const [searchQuery, setSearchQuery] = useState("")

  const filtered = routines.filter((r) => {
    // Filtro por estado (chip)
    if (filter && r.status !== filter) return false
    // Filtro por búsqueda de texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      const matchesTitle = r.title.toLowerCase().includes(q)
      const matchesClient = r.client?.profile?.full_name?.toLowerCase().includes(q) ?? false
      if (!matchesTitle && !matchesClient) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Accesos rápidos - responsive */}
      <div className="grid grid-cols-2 gap-2">
        <Link
          href={ROUTES.ADMIN_RUTINAS_PLANTILLAS}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3.5 hover:bg-zinc-800/60 transition-colors"
        >
          <BookOpen className="size-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">Plantillas</span>
        </Link>
        <Link
          href={ROUTES.ADMIN_RUTINAS_NUEVA}
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="size-4" />
          Nueva rutina
        </Link>
      </div>

      {/* Buscador en ancho completo */}
      <div className="w-full">
        <input
          type="text"
          placeholder="Buscar por cliente o rutina..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-zinc-900/60 px-4 py-3.5 text-sm text-zinc-200 outline-none focus:border-red-600/50 transition-colors placeholder-zinc-500"
        />
      </div>

      {/* Chips de filtro */}
      <ChipSelect options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

      {/* Conteo */}
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {filtered.length} rutina{filtered.length === 1 ? "" : "s"}
      </h3>

      {/* Listado */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-zinc-500 text-sm">
          {searchQuery.trim() ? "No se encontraron rutinas para esta búsqueda." : EMPTY_LABELS[filter]}
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
          {filtered.map((r, idx) => (
            <Link
              key={r.id}
              href={adminRutinaDetalle(r.id)}
              className={`flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/20 transition-colors ${
                idx < filtered.length - 1 ? "border-b border-white/5" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-200 truncate">{r.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {r.client?.profile?.full_name ?? "Sin cliente"} · {ROUTINE_STATUS_LABELS[r.status]}
                  {r.days_per_week ? ` · ${r.days_per_week} días/sem` : ""}
                </p>
              </div>
              <ChevronRight className="size-4 text-zinc-600 shrink-0 ml-2" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
