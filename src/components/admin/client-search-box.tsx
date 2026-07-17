"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import Link from "next/link"
import { Search, Loader2 } from "lucide-react"
import { adminClienteDetalle } from "@/constants/routes"
import { searchClientsQuickAction } from "@/actions/admin.actions"

type ClientMatch = { id: string; full_name: string | null; email: string | null }

export function ClientSearchBox() {
  const [search, setSearch] = useState("")
  const [matches, setMatches] = useState<ClientMatch[]>([])
  const [isPending, startTransition] = useTransition()
  // Descarta respuestas de búsquedas antiguas (la última tecleada gana).
  const reqIdRef = useRef(0)

  useEffect(() => {
    const q = search.trim()
    const reqId = ++reqIdRef.current
    const t = setTimeout(() => {
      if (!q) {
        if (reqId === reqIdRef.current) setMatches([])
        return
      }
      startTransition(async () => {
        const results = await searchClientsQuickAction(q)
        // Ignora si llegó una búsqueda más nueva mientras tanto.
        if (reqId === reqIdRef.current) setMatches(results)
      })
    }, q ? 300 : 0)
    return () => clearTimeout(t)
  }, [search])

  const q = search.trim()

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
      <input
        type="text"
        placeholder="Buscar cliente por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-zinc-900/60 border border-white/10 rounded-full py-3.5 pl-12 pr-10 text-sm focus:outline-none focus:border-red-600/50 text-zinc-200 placeholder-zinc-500 transition-colors"
      />
      {isPending && (
        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-zinc-500 animate-spin" />
      )}

      {q && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl">
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">
              {isPending ? "Buscando..." : "Sin resultados."}
            </p>
          ) : (
            matches.map((c, i) => (
              <Link
                key={c.id}
                href={adminClienteDetalle(c.id)}
                className={`flex flex-col px-4 py-2.5 hover:bg-zinc-800/60 transition-colors ${
                  i < matches.length - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <span className="text-sm font-medium text-zinc-200 truncate">{c.full_name ?? "Sin nombre"}</span>
                <span className="text-xs text-zinc-500 truncate">{c.email ?? ""}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
