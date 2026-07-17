import { Skeleton } from "@/components/ui/skeleton"

export default function ProgresoLoading() {
  return (
    <div>
      <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4 md:px-10">
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-6">
        {/* Objetivo / resumen destacado */}
        <Skeleton className="h-28 rounded-2xl" />

        {/* Métricas resumidas */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* Historial de mediciones */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
