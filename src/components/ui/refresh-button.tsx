"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"

interface RefreshButtonProps {
  label?: string
  className?: string
}

export function RefreshButton({ label = "Refrescar", className = "" }: RefreshButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className={`flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-white/20 transition-colors disabled:opacity-50 ${className}`}
    >
      <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
      {label}
    </button>
  )
}
