"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, Plus, UserPlus } from "lucide-react"
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

type ClientWithoutRoutine = { id: string; profile: { full_name: string | null } | null }

interface RoutinesListProps {
  routines: RoutineRow[]
  clientsWithoutRoutine?: ClientWithoutRoutine[]
}

type FilterValue = RoutineStatus | "" | "sin_rutina"

const FILTER_OPTIONS: { value: FilterValue; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "active", label: ROUTINE_STATUS_LABELS.active },
  { value: "paused", label: ROUTINE_STATUS_LABELS.paused },
  { value: "completed", label: ROUTINE_STATUS_LABELS.completed },
  { value: "archived", label: ROUTINE_STATUS_LABELS.archived },
  { value: "draft", label: ROUTINE_STATUS_LABELS.draft },
  { value: "sin_rutina", label: "Sin rutina" },
]

const EMPTY_LABELS: Record<FilterValue, string> = {
  "": "No hay deportistas ni rutinas registradas.",
  active: "No hay rutinas activas.",
  paused: "No hay rutinas pausadas.",
  completed: "No hay rutinas completadas.",
  archived: "No hay rutinas archivadas.",
  draft: "No hay borradores de rutina.",
  sin_rutina: "Todos los clientes tienen una rutina asignada.",
}

export function RoutinesList({ routines, clientsWithoutRoutine = [] }: RoutinesListProps) {
  const [filter, setFilter] = useState<FilterValue>("")
  const [searchQuery, setSearchQuery] = useState("")

  const q = searchQuery.toLowerCase().trim()

  // Combinación y unificación de filas
  const unifiedRows = [
    ...routines.map((r) => ({
      type: "routine" as const,
      id: r.id,
      title: r.title,
      status: r.status,
      days_per_week: r.days_per_week,
      clientName: r.client?.profile?.full_name ?? "Sin nombre",
      clientId: r.client?.id,
      href: adminRutinaDetalle(r.id),
    })),
    ...clientsWithoutRoutine.map((c) => ({
      type: "no_routine" as const,
      id: `no-routine-${c.id}`,
      title: "Sin rutina asignada",
      status: "sin_rutina" as const,
      days_per_week: null,
      clientName: c.profile?.full_name ?? "Sin nombre",
      clientId: c.id,
      href: `${ROUTES.ADMIN_RUTINAS_NUEVA}?clientId=${c.id}`,
    })),
  ]

  // Ordenar alfabéticamente por el nombre del cliente
  unifiedRows.sort((a, b) => a.clientName.localeCompare(b.clientName))

  // Aplicar filtros
  const filteredRows = unifiedRows.filter((row) => {
    // 1. Filtrar por estado (pestaña)
    if (filter === "sin_rutina") {
      if (row.type !== "no_routine") return false
    } else if (filter !== "") {
      if (row.type !== "routine" || row.status !== filter) return false
    }

    // 2. Filtrar por búsqueda de texto
    if (q) {
      const matchesClient = row.clientName.toLowerCase().includes(q)
      const matchesTitle = row.type === "routine" && row.title.toLowerCase().includes(q)
      if (!matchesClient && !matchesTitle) return false
    }

    return true
  })

  return (
    <div className="space-y-4">
      {/* Accesos rápidos */}
      <Link
        href={ROUTES.ADMIN_RUTINAS_NUEVA}
        className="flex items-center justify-center gap-2 rounded-2xl btn-glossy-red px-4 py-3.5 text-sm font-semibold text-white"
      >
        <Plus className="size-4" />
        Nueva rutina
      </Link>

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
        {filteredRows.length} {filteredRows.length === 1 ? "registro" : "registros"}
      </h3>

      {/* Listado */}
      {filteredRows.length === 0 ? (
        <Card className="p-8 text-center text-zinc-500 text-sm bg-[#0a0a0a] border border-[#222]">
          {q ? "No se encontraron resultados para esta búsqueda." : EMPTY_LABELS[filter]}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredRows.map((row) => (
            <Link
              key={row.id}
              href={row.href}
              className="flex items-center justify-between rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3.5 hover:bg-zinc-800/40 transition-colors cursor-pointer"
            >
              <div className="min-w-0 flex-1">
                <p className="font-bebas text-lg tracking-wide uppercase text-white truncate">
                  {row.clientName}
                </p>
                {row.type === "routine" ? (
                  <>
                    <p className="text-sm font-semibold text-zinc-300 mt-0.5 truncate">{row.title}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {ROUTINE_STATUS_LABELS[row.status as RoutineStatus]}
                      {row.days_per_week ? ` · ${row.days_per_week} días/sem` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-red-500 mt-1 font-semibold flex items-center gap-1">
                    Sin rutina asignada
                  </p>
                )}
              </div>
              
              {row.type === "routine" ? (
                <ChevronRight className="size-4 text-zinc-600 shrink-0 ml-2" />
              ) : (
                <UserPlus className="size-4 text-red-500 shrink-0 ml-2 animate-pulse" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
