"use client"

import { useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { SelectField } from "@/components/ui/select-field"
import { createMuscleGroupAction } from "@/actions/muscle-groups.actions"
import { agregarAlCatalogo, useGruposMusculares } from "@/lib/grupos-musculares"
import { etiquetaDeGrupo } from "@/types/exercise"

const NUEVO = "__nuevo__"

/**
 * «Músculo principal» con los grupos del gimnasio y, para el admin, «+ Agregar
 * otro grupo…» al final de la lista.
 *
 * Antes la lista era fija (los 11 de siempre) y para tener «Antebrazo» o
 * «Cuádriceps» había que pedírselo a quien programa. Ahora el admin lo escribe ahí
 * mismo, queda elegido en el ejercicio y sale en la lista para los siguientes.
 */
export function SelectorGrupoMuscular({
  label,
  value,
  onChange,
  permitirAgregar = false,
}: {
  label: string
  value: string
  onChange: (clave: string) => void
  /** Solo el admin: agregar escribe en el catálogo de todo el gimnasio. */
  permitirAgregar?: boolean
}) {
  const grupos = useGruposMusculares()
  const [agregando, setAgregando] = useState(false)
  const [nombre, setNombre] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState("")

  const opciones = [
    { value: "", label: "Sin especificar" },
    ...grupos.map((g) => ({ value: g.key, label: g.label })),
    // Un ejercicio con un grupo que ya no está en la lista (oculto) lo sigue
    // mostrando: sin esto el select decía «Sin especificar» y, al tocarlo, se perdía.
    ...(value && !grupos.some((g) => g.key === value) ? [{ value, label: etiquetaDeGrupo(value) }] : []),
    ...(permitirAgregar ? [{ value: NUEVO, label: "+ Agregar otro grupo…" }] : []),
  ]

  const agregar = async () => {
    if (!nombre.trim()) {
      setError("Escribe el nombre del grupo, por ejemplo «Antebrazo».")
      return
    }
    setGuardando(true)
    setError("")
    const res = await createMuscleGroupAction(nombre).catch(() => ({ error: "No se pudo agregar el grupo. Revisa tu conexión e intenta otra vez." }))
    setGuardando(false)
    if ("error" in res) {
      setError(res.error)
      return
    }
    agregarAlCatalogo(res.grupo)
    onChange(res.grupo.key)
    setAgregando(false)
    setNombre("")
  }

  return (
    <div className="space-y-2">
      <SelectField
        label={label}
        value={agregando ? NUEVO : value}
        onChange={(v) => {
          if (v === NUEVO) {
            setAgregando(true)
            setError("")
            return
          }
          setAgregando(false)
          onChange(v)
        }}
        options={opciones}
      />
      {agregando && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-zinc-800/60 p-3">
          <label htmlFor="nuevo-grupo" className="text-xs font-medium text-zinc-400">
            Nombre del grupo nuevo
          </label>
          <input
            id="nuevo-grupo"
            autoFocus
            maxLength={40}
            value={nombre}
            placeholder="Ej: Antebrazo"
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void agregar()
              }
            }}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50 placeholder-zinc-600"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-[11px] text-zinc-500">Queda en la lista para todos los ejercicios del gimnasio.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setAgregando(false)
                setNombre("")
                setError("")
              }}
              className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void agregar()}
              disabled={guardando}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
            >
              {guardando ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
