"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownLeft, ArrowUpRight, Check, Loader2 } from "lucide-react"
import { createFinanceEntryAction } from "@/actions/finance.actions"
import { formatCOP } from "@/lib/utils"

type Kind = "income" | "expense"

// Conceptos de un toque. Rellenan el campo; se pueden editar después.
// Son los movimientos típicos de un gimnasio de barrio, para no escribir lo
// mismo cada vez desde el celular.
const SUGERENCIAS: Record<Kind, string[]> = {
  income: ["Venta de bebidas", "Suplementos", "Clase personalizada", "Otro ingreso"],
  expense: ["Arriendo", "Servicios", "Pago entrenador", "Equipos", "Mantenimiento", "Aseo"],
}

export function FinanceEntryForm({ today }: { today: string }) {
  const router = useRouter()
  const [kind, setKind] = useState<Kind>("expense")
  const [concept, setConcept] = useState("")
  // Pesos enteros como texto: solo dígitos, sin puntos ni signo.
  const [pesos, setPesos] = useState("")
  const [fecha, setFecha] = useState(today)
  const [estado, setEstado] = useState<"idle" | "loading" | "done">("idle")
  const [error, setError] = useState("")

  const amountCents = (Number.parseInt(pesos || "0", 10) || 0) * 100

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (estado === "loading") return
    // El botón NUNCA se deshabilita por datos incompletos: dice qué falta.
    // Lección de la Sesión 21 — un botón gris sin explicación el dueño lo
    // reportó como avería ("lo verde tiene dificultad").
    if (!concept.trim()) return setError("Escribe un concepto o toca uno de los de arriba.")
    if (amountCents <= 0) return setError("Escribe el monto.")
    if (!fecha) return setError("Elige la fecha.")
    setEstado("loading")
    setError("")
    try {
      const r = await createFinanceEntryAction({ kind, concept, amountCents, occurredOn: fecha })
      if ("error" in r && r.error) {
        setError(r.error)
        setEstado("idle")
        return
      }
      setConcept("")
      setPesos("")
      setFecha(today)
      setEstado("done")
      router.refresh()
      setTimeout(() => setEstado("idle"), 1800)
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.")
      setEstado("idle")
    }
  }

  const esIngreso = kind === "income"

  return (
    <form
      onSubmit={guardar}
      className="bg-[#0f0f11]/80 border border-white/5 rounded-2xl p-4 md:p-5 space-y-4"
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 font-mono">
        Anotar movimiento
      </h3>

      {/* Ingreso / Egreso */}
      <div className="grid grid-cols-2 gap-2">
        {(["income", "expense"] as const).map((k) => {
          const activo = kind === k
          const ingreso = k === "income"
          return (
            <button
              key={k}
              type="button"
              aria-pressed={activo}
              onClick={() => { setKind(k); setConcept(""); setError("") }}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                activo
                  ? ingreso
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/50 bg-red-500/10 text-red-300"
                  : "border-white/10 text-zinc-400 hover:border-white/25"
              }`}
            >
              {ingreso ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
              {ingreso ? "Ingreso" : "Gasto"}
            </button>
          )
        })}
      </div>

      {/* Concepto */}
      <div className="space-y-2">
        <label htmlFor="fin-concepto" className="text-xs font-medium text-zinc-400">Concepto</label>
        <div className="flex flex-wrap gap-1.5">
          {SUGERENCIAS[kind].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setConcept(s); setError("") }}
              className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                concept === s
                  ? "border-white/30 bg-white/10 text-zinc-100"
                  : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          id="fin-concepto"
          type="text"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          maxLength={120}
          placeholder={esIngreso ? "Ej: venta de bebidas" : "Ej: pago del arriendo"}
          className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/30"
        />
      </div>

      {/* Monto y fecha */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label htmlFor="fin-monto" className="text-xs font-medium text-zinc-400">Monto</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">$</span>
            <input
              id="fin-monto"
              type="text"
              inputMode="numeric"
              value={pesos ? Number(pesos).toLocaleString("es-CO") : ""}
              onChange={(e) => setPesos(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="0"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 py-2.5 pl-6 pr-3 text-sm text-zinc-200 outline-none focus:border-white/30"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="fin-fecha" className="text-xs font-medium text-zinc-400">Fecha</label>
          <input
            id="fin-fecha"
            type="date"
            value={fecha}
            max={today}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-white/30 [color-scheme:dark]"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={estado === "loading"}
        className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer disabled:opacity-60 ${
          esIngreso ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {estado === "loading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : estado === "done" ? (
          <><Check className="size-4" /> Guardado</>
        ) : (
          <>Guardar {esIngreso ? "ingreso" : "gasto"}{amountCents > 0 && ` · ${formatCOP(amountCents)}`}</>
        )}
      </button>
    </form>
  )
}
