"use client"

import { useState } from "react"
import { LockOpen, Loader2 } from "lucide-react"
import { desbloquearComprobanteAction } from "@/actions/admin.actions"

interface DesbloquearToggleProps {
  clientId: string
}

export function DesbloquearToggle({ clientId }: DesbloquearToggleProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleDesbloquear = async () => {
    setLoading(true)
    await desbloquearComprobanteAction(clientId)
    setLoading(false)
    setDone(true)
  }

  if (done) return null

  return (
    <button
      onClick={handleDesbloquear}
      disabled={loading}
      title="Desbloquear comprobantes"
      className="flex items-center gap-1 rounded-lg border border-red-700/50 bg-red-950/30 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-900/40 transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 className="size-3 animate-spin" /> : <LockOpen className="size-3" />}
      Desbloq.
    </button>
  )
}
