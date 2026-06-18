"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, X, Search, Loader2, CheckCircle2 } from "lucide-react"

interface ClientOption {
  id: string
  name: string
}

export function ManualCheckInModal({ clients }: { clients: ClientOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(q))
  }, [clients, query])

  async function register(c: ClientOption) {
    setPendingId(c.id)
    setMsg(null)
    const { manualCheckInAction } = await import("@/actions/admin.actions")
    const result = await manualCheckInAction(c.id)
    setPendingId(null)
    if (result?.error) setMsg({ type: "err", text: `${c.name}: ${result.error}` })
    else {
      setMsg({ type: "ok", text: `Ingreso registrado para ${c.name}` })
      router.refresh()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/25"
      >
        <UserPlus className="size-4" />
        Ingreso manual
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[80vh] w-full max-w-sm flex-col rounded-t-2xl border border-white/10 bg-zinc-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/8 p-4">
              <h3 className="text-base font-bold text-zinc-100">Registrar ingreso manual</h3>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-5" />
              </button>
            </div>

            <div className="p-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-red-600"
                />
              </div>
              {msg && (
                <p
                  className={`mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                    msg.type === "ok"
                      ? "border border-green-500/20 bg-green-500/10 text-green-400"
                      : "border border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {msg.type === "ok" && <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
                  {msg.text}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">Sin resultados</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {filtered.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="truncate text-sm text-zinc-200">{c.name}</span>
                      <button
                        onClick={() => register(c)}
                        disabled={pendingId === c.id}
                        className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {pendingId === c.id ? <Loader2 className="size-4 animate-spin" /> : "Registrar"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
