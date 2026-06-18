"use client"

import { ErrorState } from "@/components/ui/states"

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen">
      <ErrorState onRetry={reset} />
    </div>
  )
}
