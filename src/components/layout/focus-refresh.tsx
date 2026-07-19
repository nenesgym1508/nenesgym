"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

// Al volver a la pestaña/app se revalida la pantalla actual, para no depender de que
// el usuario recargue a mano cuando algo cambió mientras estaba en otra parte (ej. el
// admin aprobó un pago mientras el cliente tenía la app en segundo plano). Con throttle
// para no disparar en cada alt-tab rápido.
const MIN_INTERVAL_MS = 15_000

export function FocusRefresh() {
  const router = useRouter()
  const lastRefresh = useRef(0)

  useEffect(() => {
    lastRefresh.current = Date.now()

    const maybeRefresh = () => {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastRefresh.current < MIN_INTERVAL_MS) return
      lastRefresh.current = now
      router.refresh()
    }

    document.addEventListener("visibilitychange", maybeRefresh)
    window.addEventListener("focus", maybeRefresh)
    return () => {
      document.removeEventListener("visibilitychange", maybeRefresh)
      window.removeEventListener("focus", maybeRefresh)
    }
  }, [router])

  return null
}
