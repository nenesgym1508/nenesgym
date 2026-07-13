"use client"

import { useState } from "react"
import Link from "next/link"
import { Search } from "lucide-react"
import { adminClienteDetalle } from "@/constants/routes"

interface ClientOption {
  id: string
  profile: { full_name?: string | null; email?: string | null } | null
}

export function ClientSearchBox({ clients }: { clients: ClientOption[] }) {
  const [search, setSearch] = useState("")

  const q = search.toLowerCase().trim()
  const matches = q
    ? clients.filter((c) =>
        (c.profile?.full_name?.toLowerCase().includes(q) ?? false) ||
        (c.profile?.email?.toLowerCase().includes(q) ?? false)
      )
    : []

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
      <input
        type="text"
        placeholder="Buscar cliente por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-zinc-900/60 border border-white/10 rounded-full py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-red-600/50 text-zinc-200 placeholder-zinc-500 transition-colors"
      />

      {q && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl">
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-500">Sin resultados.</p>
          ) : (
            matches.slice(0, 6).map((c, i) => (
              <Link
                key={c.id}
                href={adminClienteDetalle(c.id)}
                className={`flex flex-col px-4 py-2.5 hover:bg-zinc-800/60 transition-colors ${
                  i < Math.min(matches.length, 6) - 1 ? "border-b border-white/5" : ""
                }`}
              >
                <span className="text-sm font-medium text-zinc-200 truncate">{c.profile?.full_name ?? "Sin nombre"}</span>
                <span className="text-xs text-zinc-500 truncate">{c.profile?.email ?? ""}</span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
