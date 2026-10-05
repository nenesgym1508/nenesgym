"use client"

import { useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"

/**
 * Aviso de que algo NO se guardó, en los editores de rutinas y clases.
 *
 * Antes, si guardar fallaba (conexión floja en el gimnasio, sesión vencida), el
 * editor no decía nada: el ejercicio no aparecía, o el número volvía al anterior,
 * y la única salida que se le ocurría a quien lo usaba era recargar la página.
 *
 * Se va solo a los 8 segundos; lleva X para cerrarlo antes.
 */
export function AvisoDeGuardado({ mensaje, onCerrar }: { mensaje: string | null; onCerrar: () => void }) {
  useEffect(() => {
    if (!mensaje) return
    const t = setTimeout(onCerrar, 8000)
    return () => clearTimeout(t)
  }, [mensaje, onCerrar])

  if (!mensaje) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-3 bottom-36 z-[60] mx-auto flex max-w-md items-start gap-2 rounded-xl border border-red-500/40 bg-zinc-900/95 px-3 py-2.5 text-sm text-red-100 shadow-lg backdrop-blur"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
      <p className="flex-1 leading-snug">{mensaje}</p>
      <button onClick={onCerrar} aria-label="Cerrar aviso" className="shrink-0 text-zinc-400 hover:text-zinc-200">
        <X className="size-4" />
      </button>
    </div>
  )
}

/** El texto de siempre: no culpa a la persona y dice qué hacer. */
export const NO_SE_GUARDO = "No se pudo guardar el cambio. Revisa tu conexión e intenta otra vez."
