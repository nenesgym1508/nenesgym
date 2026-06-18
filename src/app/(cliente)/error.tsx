"use client"

import { ErrorState } from "@/components/ui/states"

export default function ClienteError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen">
      <ErrorState onRetry={reset} />
    </div>
  )
}
