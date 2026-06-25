"use client"

import { useEffect } from "react"
import { CheckCircle2 } from "lucide-react"

interface SuccessToastProps {
  open: boolean
  title: string
  subtitle?: string
  message?: string
  duration?: number
  onClose: () => void
}

export function SuccessToast({
  open,
  title,
  subtitle,
  message,
  duration = 4000,
  onClose,
}: SuccessToastProps) {
  useEffect(() => {
    if (!open) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[120] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
      role="status"
      aria-live="polite"
    >
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 w-full max-w-sm rounded-2xl border border-green-500/30 bg-zinc-900/95 p-5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-green-500/15">
            <CheckCircle2 className="size-8 text-green-400" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-green-400">{title}</p>
            {subtitle && <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>}
            {message && <p className="mt-1 text-sm text-zinc-300">{message}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
