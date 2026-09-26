import { Skeleton } from "@/components/ui/skeleton"

/** Pantalla de carga de Rutinas. Ver la nota en clases/loading.tsx. */
export default function RutinasLoading() {
  return (
    <div className="md:max-w-6xl md:mx-auto">
      <div className="flex items-start justify-between mb-6 px-6 pt-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <div className="px-6 pb-24 space-y-4">
        {/* Buscador / filtros */}
        <Skeleton className="h-11 rounded-xl" />

        {/* Tarjetas de rutina */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
