"use client"

import { useState } from "react"
import { Zap, Loader2 } from "lucide-react"
import { toggleAutoAprobacionAction } from "@/actions/admin.actions"

interface AutoAprobacionToggleProps {
  clientId: string
  initialValue: boolean
}

export function AutoAprobacionToggle({ clientId, initialValue }: AutoAprobacionToggleProps) {
  const [value, setValue] = useState(initialValue)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const next = !value
    const result = await toggleAutoAprobacionAction(clientId, next)
    if (!result.error) setValue(next)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={value ? "Auto-aprobación activa (clic para desactivar)" : "Auto-aprobación inactiva (clic para activar)"}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold transition-colors disabled:opacity-50 ${
        value
          ? "border-blue-600/40 bg-blue-600/10 text-blue-400 hover:bg-blue-600/20"
          : "border-white/10 bg-white/5 text-zinc-500 hover:border-white/20 hover:text-zinc-400"
      }`}
    >
      {loading ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        <Zap className={`size-3 ${value ? "fill-blue-400" : ""}`} />
      )}
      Auto
    </button>
  )
}
