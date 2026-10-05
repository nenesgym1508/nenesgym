"use client"

import { useEffect, useSyncExternalStore } from "react"
import { getMuscleGroupsAction } from "@/actions/muscle-groups.actions"
import { GRUPOS_MUSCULARES_DE_SIEMPRE, type GrupoMuscular } from "@/types/exercise"

/**
 * El catálogo de grupos musculares en el navegador, compartido por todos los
 * componentes que lo usan (formularios, filtros, filas de rutina).
 *
 * Se pide UNA vez por visita, no por componente: una rutina tiene decenas de filas
 * y cada una muestra la etiqueta de su grupo. Mientras llega se usan los 11 de
 * siempre, que es exactamente lo que había antes, así que nada parpadea.
 */
let catalogo: GrupoMuscular[] = GRUPOS_MUSCULARES_DE_SIEMPRE
let pedido: Promise<void> | null = null
const avisar = new Set<() => void>()

function suscribir(cb: () => void) {
  avisar.add(cb)
  return () => avisar.delete(cb)
}

function cargar() {
  pedido ??= getMuscleGroupsAction()
    .then((lista) => {
      catalogo = lista
      avisar.forEach((cb) => cb())
    })
    .catch(() => {
      // Sin red: quedan los de siempre, y la próxima pantalla lo vuelve a intentar.
      pedido = null
    })
}

/** Suma un grupo recién creado sin volver a pedir el catálogo. */
export function agregarAlCatalogo(grupo: GrupoMuscular) {
  if (catalogo.some((g) => g.key === grupo.key)) return
  catalogo = [...catalogo, grupo]
  avisar.forEach((cb) => cb())
}

export function useGruposMusculares(): GrupoMuscular[] {
  useEffect(cargar, [])
  return useSyncExternalStore(
    suscribir,
    () => catalogo,
    () => GRUPOS_MUSCULARES_DE_SIEMPRE
  )
}
