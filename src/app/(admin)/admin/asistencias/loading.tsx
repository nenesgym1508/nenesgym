import { Skeleton } from "@/components/ui/skeleton"

export default function AsistenciasLoading() {
  return (
    <div className="md:max-w-6xl md:mx-auto">
      <div className="flex items-start justify-between mb-6 px-6 pt-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>

      <div className="px-6 pb-24 space-y-4">
        {/* Conteo de ingresos del día */}
        <Skeleton className="h-8 w-48" />

        {/* Acciones (QR / código manual) */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-40 rounded-xl" />
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>

        {/* Lista de ingresos de hoy */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
