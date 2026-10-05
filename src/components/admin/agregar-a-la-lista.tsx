"use client"

import { useState } from "react"
import { ListPlus, Loader2, X } from "lucide-react"

export interface DatosDeLaLista {
  nombre: string
  descripcion: string | null
  sets: number | null
  reps: number | null
  duration_seconds: number | null
}

/**
 * «Añadir a la lista»: anotar un ejercicio rápido en la rutina con solo el nombre y,
 * si se quiere, series, reps, tiempo y una descripción. Sin foto, sin grupo, sin
 * equipo.
 *
 * Es la otra mitad del botón que antes era solo «Añadir ejercicio»: ese sigue para
 * elegir de la biblioteca o crear uno completo; este es para lo que no vale la pena
 * crear desde cero (pedido del dueño, Sesión 27).
 */
export function AgregarALaLista({
  onAgregar,
  onClose,
}: {
  /** Devuelve un error para mostrar, o null si quedó añadido. */
  onAgregar: (datos: DatosDeLaLista) => Promise<string | null>
  onClose: () => void
}) {
  const [nombre, setNombre] = useState("")
  const [sets, setSets] = useState("")
  const [reps, setReps] = useState("")
  const [minutos, setMinutos] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const numero = (texto: string) => (texto === "" ? null : parseInt(texto, 10))
  const soloDigitos = (texto: string) => texto.replace(/\D/g, "").slice(0, 4)

  const agregar = async () => {
    if (!nombre.trim()) {
      setError("Escribe el nombre del ejercicio.")
      return
    }
    setGuardando(true)
    setError("")
    const fallo = await onAgregar({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      sets: numero(sets),
      reps: numero(reps),
      duration_seconds: minutos === "" ? null : parseInt(minutos, 10) * 60,
    })
    setGuardando(false)
    if (fallo) setError(fallo)
  }

  const casilla =
    "w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-center text-sm text-zinc-200 outline-none focus:border-red-600/50"

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:rounded-2xl sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-zinc-100">
            <ListPlus className="size-5 text-red-500" /> Añadir a la lista
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <p className="mb-4 text-xs text-zinc-500">
          Un ejercicio rápido para esta rutina, sin foto. No se guarda en tu biblioteca de ejercicios.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="lista-nombre" className="text-xs font-medium text-zinc-400">
              Nombre *
            </label>
            <input
              id="lista-nombre"
              autoFocus
              maxLength={80}
              value={nombre}
              placeholder="Ej: Saltar lazo"
              onChange={(e) => {
                setNombre(e.target.value)
                setError("")
              }}
              className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder-zinc-600 focus:border-red-600/50"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "lista-series", label: "Series", valor: sets, poner: setSets },
              { id: "lista-reps", label: "Reps", valor: reps, poner: setReps },
              { id: "lista-tiempo", label: "Tiempo (min)", valor: minutos, poner: setMinutos },
            ].map((c) => (
              <div key={c.id} className="space-y-1">
                <label htmlFor={c.id} className="text-[11px] font-medium text-zinc-500">
                  {c.label}
                </label>
                <input
                  id={c.id}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Opcional"
                  value={c.valor}
                  onChange={(e) => c.poner(soloDigitos(e.target.value))}
                  className={`${casilla} placeholder-zinc-600 placeholder:text-xs`}
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="lista-descripcion" className="text-xs font-medium text-zinc-400">
              Descripción <span className="text-zinc-600">(opcional)</span>
            </label>
            <textarea
              id="lista-descripcion"
              rows={2}
              maxLength={500}
              value={descripcion}
              placeholder="Ej: A ritmo suave, sin parar"
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full resize-none rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none placeholder-zinc-600 focus:border-red-600/50"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="button"
            onClick={() => void agregar()}
            disabled={guardando}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {guardando ? <Loader2 className="size-4 animate-spin" /> : <ListPlus className="size-4" />}
            Añadir a la rutina
          </button>
        </div>
      </div>
    </div>
  )
}
