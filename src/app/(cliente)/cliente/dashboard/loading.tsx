import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div>
      <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4 md:px-10">
        <Skeleton className="h-4 w-28" />
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-4">
        {/* Saludo + avatar */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="size-11 rounded-full" />
        </div>

        {/* Membresía */}
        <Skeleton className="h-32 rounded-2xl" />

        {/* CTA registrar entrada */}
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />

        {/* Calendario */}
        <div className="rounded-2xl border border-white/5 bg-zinc-950/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="size-6 rounded-md" />
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={`d${i}`} className="h-3 w-full" />
            ))}
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-md" />
            ))}
          </div>
        </div>

        {/* Últimos ingresos */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}
