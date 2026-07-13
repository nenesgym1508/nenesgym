import { Skeleton } from "@/components/ui/skeleton"

export default function EntrenamientoLoading() {
  return (
    <div className="pb-24 md:max-w-6xl md:mx-auto">
      <div className="mb-6 px-6 pt-12 md:px-10 md:pt-10 space-y-2">
        <Skeleton className="h-8 w-44 md:h-10 md:w-56" />
        <Skeleton className="h-4 w-52" />
      </div>

      <div className="px-6 md:px-10 space-y-4">
        <Skeleton className="h-12 w-full rounded-2xl" />

        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-12 flex-1 md:w-40 md:flex-none rounded-2xl" />
          <Skeleton className="h-12 w-32 rounded-2xl" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
