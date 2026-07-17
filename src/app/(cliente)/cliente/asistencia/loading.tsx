import { Skeleton } from "@/components/ui/skeleton"

export default function AsistenciaLoading() {
  return (
    <div>
      <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4 md:px-10">
        <Skeleton className="h-4 w-20" />
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-4">
        {/* Estado del día */}
        <Skeleton className="h-14 rounded-2xl" />

        {/* Segmented control Escanear / Código manual */}
        <Skeleton className="h-11 w-full rounded-xl" />

        {/* Zona de escaneo / entrada */}
        <Skeleton className="h-64 rounded-2xl" />

        {/* Últimos ingresos */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
