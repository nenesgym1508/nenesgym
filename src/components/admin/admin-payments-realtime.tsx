"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { GYM_ID } from "@/constants/plans"

// Mientras el admin está en la pantalla de pagos, escucha en vivo cualquier pago nuevo o
// cambio de estado del gimnasio (ej. un cliente sube un comprobante o pide verificación de
// efectivo). Así el admin no depende de refrescar a mano para verlo aparecer.
const MIN_INTERVAL_MS = 3_000

export function AdminPaymentsRealtime() {
  const router = useRouter()
  const lastRefresh = useRef(0)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`admin-payments-${GYM_ID}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments", filter: `gym_id=eq.${GYM_ID}` },
        () => {
          const now = Date.now()
          if (now - lastRefresh.current < MIN_INTERVAL_MS) return
          lastRefresh.current = now
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
