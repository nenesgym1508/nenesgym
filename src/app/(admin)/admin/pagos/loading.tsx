import { Skeleton } from "@/components/ui/skeleton"

function PendingPaymentSkeleton() {
  return (
    <div className="rounded-3xl border border-white/8 bg-zinc-900/60 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-2 text-right">
          <Skeleton className="h-4 w-16 ml-auto" />
          <Skeleton className="h-4 w-16 rounded-full ml-auto" />
        </div>
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-xl" />
        <Skeleton className="h-10 flex-1 rounded-xl" />
      </div>
    </div>
  )
}

export default function PagosLoading() {
  return (
    <div className="md:max-w-6xl md:mx-auto">
      <div className="mb-6 px-6 pt-12 md:px-10 md:pt-10 space-y-2">
        <Skeleton className="h-8 w-24 md:h-10 md:w-32" />
        <Skeleton className="h-4 w-44" />
      </div>

      <div className="px-6 pb-24 md:px-10 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <PendingPaymentSkeleton key={i} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-3 w-32" />
          <div className="rounded-2xl border border-white/8 bg-zinc-900/60 divide-y divide-white/5 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-4 w-16 ml-auto" />
                  <Skeleton className="h-4 w-16 rounded-full ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
