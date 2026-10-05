"use client"

import { useCallback, useEffect, useState } from "react"

const PREFIJO = "nenes:hechos:"

/**
 * Los ejercicios que el socio ya tachó HOY en una rutina (Sesión 27).
 *
 * Viven en el teléfono (localStorage) y no en la base, a propósito: es una ayuda
 * para no perderse a mitad de la rutina —«¿ya hice las sentadillas?»—, no un
 * registro. Tachar responde al instante y funciona sin señal en el gimnasio. La
 * clave lleva el día de Colombia, así que mañana la rutina amanece sin tachar sola.
 * Lo que sí queda en la base es «Hecho hoy» (MarkDoneTodayBar).
 *
 * Al abrir, borra lo de días anteriores de esa misma rutina, para no ir llenando el
 * almacenamiento del teléfono.
 */
export function useHechosDelDia(rutinaId: string, fecha: string | undefined) {
  const clave = fecha ? `${PREFIJO}${rutinaId}:${fecha}` : null
  const [hechos, setHechos] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!clave) return
    try {
      const guardado = localStorage.getItem(clave)
      // Se lee al montar porque en el servidor no hay localStorage: el primer pintado
      // sale sin tachar y enseguida se marca lo de hoy.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHechos(new Set(guardado ? (JSON.parse(guardado) as string[]) : []))
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith(`${PREFIJO}${rutinaId}:`) && k !== clave) localStorage.removeItem(k)
      }
    } catch {
      // Navegación privada o almacenamiento lleno: se puede tachar igual, solo que no
      // se recuerda al recargar.
    }
  }, [clave, rutinaId])

  const alternar = useCallback(
    (ejercicioId: string) => {
      setHechos((antes) => {
        const nuevo = new Set(antes)
        if (nuevo.has(ejercicioId)) nuevo.delete(ejercicioId)
        else nuevo.add(ejercicioId)
        if (clave) {
          try {
            localStorage.setItem(clave, JSON.stringify([...nuevo]))
          } catch {
            // Ver arriba: sin almacenamiento, el tachado dura lo que dure la pantalla.
          }
        }
        return nuevo
      })
    },
    [clave]
  )

  return { hechos, alternar }
}
