import { Skeleton } from "@/components/ui/skeleton"

export default function RutinasLoading() {
  return (
    <div className="pb-24">
      <div className="flex h-14 items-center gap-3 border-b border-white/8 px-4 md:px-10">
        <Skeleton className="h-4 w-24" />
      </div>

      <div className="p-4 md:px-10 md:py-8 space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-12 flex-1 md:flex-none md:w-56 rounded-2xl" />
          <Skeleton className="h-12 w-28 rounded-2xl" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-3 w-44" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
