import { Skeleton } from "@/components/ui/skeleton"

function ClientCardSkeleton() {
  return (
    <div className="h-full flex flex-col rounded-3xl border border-zinc-700 bg-zinc-900/40 p-5 space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3.5 w-14 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
      <div className="border-t border-white/5" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="size-14 rounded-full" />
      </div>
      <div className="border-t border-white/5" />
      <div className="grid grid-cols-2 gap-3 pt-1">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
    </div>
  )
}

export default function ClientesLoading() {
  return (
    <div className="md:max-w-6xl md:mx-auto">
      <div className="flex items-start justify-between mb-6 px-6 pt-12 md:px-10 md:pt-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32 md:h-10 md:w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="px-6 pb-24 md:px-10 space-y-6">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-11 w-full rounded-xl" />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
