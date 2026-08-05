"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Al volver a la app se revalida la pantalla actual, para no depender de que el
 * usuario recargue a mano cuando algo cambió mientras estaba fuera (ej. el admin
 * aprobó un pago con la app en segundo plano).
 *
 * Se dispara solo si estuvo REALMENTE fuera un rato. La versión anterior medía
 * el tiempo desde el último refresco, no desde que se fue: cambiar de app un
 * segundo y volver ya bastaba para lanzar un `router.refresh()`, que con
 * páginas `force-dynamic` es un render completo del servidor más sus consultas.
 * En un móvil, alternando entre WhatsApp y la app, eso era un goteo constante
 * de recargas que hacía que volver se sintiera lento.
 */

/** Ausencia mínima para que valga la pena revalidar. */
const MIN_HIDDEN_MS = 30_000
/** Suelo entre revalidaciones, pase lo que pase. */
const MIN_INTERVAL_MS = 60_000

export function FocusRefresh() {
  const router = useRouter()
  const lastRefresh = useRef(0)
  const hiddenSince = useRef<number | null>(null)

  useEffect(() => {
    lastRefresh.current = Date.now()

    const onHidden = () => {
      hiddenSince.current = Date.now()
    }

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return

      const now = Date.now()
      const awayFor = hiddenSince.current ? now - hiddenSince.current : 0
      hiddenSince.current = null

      if (awayFor < MIN_HIDDEN_MS) return
      if (now - lastRefresh.current < MIN_INTERVAL_MS) return

      lastRefresh.current = now
      router.refresh()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") onHidden()
      else maybeRefresh()
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("blur", onHidden)
    window.addEventListener("focus", maybeRefresh)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onHidden)
      window.removeEventListener("focus", maybeRefresh)
    }
  }, [router])

  return null
}
