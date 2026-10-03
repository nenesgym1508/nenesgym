"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { deleteFinanceEntryAction } from "@/actions/finance.actions"

export function FinanceEntryDelete({ id, concept }: { id: string; concept: string }) {
  const router = useRouter()
  const [borrando, setBorrando] = useState(false)

  const borrar = async () => {
    if (borrando) return
    if (!window.confirm(`¿Borrar "${concept}"? No se puede deshacer.`)) return
    setBorrando(true)
    try {
      const r = await deleteFinanceEntryAction(id)
      if ("error" in r && r.error) window.alert(r.error)
      else router.refresh()
    } catch {
      window.alert("No se pudo conectar. Intenta de nuevo.")
    } finally {
      setBorrando(false)
    }
  }

  return (
    <button
      type="button"
      onClick={borrar}
      disabled={borrando}
      aria-label={`Borrar ${concept}`}
      className="rounded-lg p-2 text-zinc-600 transition-colors hover:bg-white/5 hover:text-red-400 cursor-pointer disabled:opacity-50"
    >
      {borrando ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  )
}
