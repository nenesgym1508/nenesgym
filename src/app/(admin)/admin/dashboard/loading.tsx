import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="px-6 py-6 pb-24 md:pb-10 md:px-10 md:py-8 lg:px-12 space-y-6 md:space-y-8 md:max-w-6xl md:mx-auto">
      {/* Header (mobile) */}
      <div className="flex items-center gap-4 md:hidden">
        <Skeleton className="size-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-32" />
        </div>
      </div>

      {/* Título + búsqueda */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 md:h-10 md:w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-12 w-full md:w-80 rounded-full" />
      </div>

      {/* Botón registrar pago */}
      <Skeleton className="h-14 w-full md:w-56 rounded-2xl" />

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 md:h-36 rounded-2xl" />
        ))}
      </div>

      {/* Pagos por aprobar + ingresos de hoy */}
      <div className="md:grid md:grid-cols-3 md:gap-6 space-y-6 md:space-y-0">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
