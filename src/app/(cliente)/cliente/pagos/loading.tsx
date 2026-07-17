import { Skeleton } from "@/components/ui/skeleton"

export default function PagosLoading() {
  return (
    <div>
      <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4 md:px-10">
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-6">
        {/* Formulario de subida de comprobante / planes */}
        <Skeleton className="h-56 rounded-2xl" />

        {/* Historial de pagos */}
        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
