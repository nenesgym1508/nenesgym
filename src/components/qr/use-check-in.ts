"use client"

import { useRef, useState } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export type CheckInStatus = "idle" | "loading" | "already" | "no_days" | "error"

export interface CheckInSuccess {
  subtitle: string
  message: string
}

interface CheckInResponse {
  ok: boolean
  code?: string
  message?: string
  remaining_days?: number
}

// Códigos que, viniendo de un intento manual, se muestran como "código
// incorrecto" en vez del mensaje pensado para el flujo de cámara (QR inválido).
const INVALID_CODE_CODES = new Set(["INVALID_QR", "INVALID_CODE"])

/**
 * Única puerta de entrada al RPC `process_check_in` (vía /api/check-in).
 * La usan tanto el escáner de QR como el formulario de código manual para
 * garantizar exactamente la misma validación de servidor y los mismos mensajes.
 */
export function useCheckIn() {
  const [status, setStatus] = useState<CheckInStatus>("idle")
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState<CheckInSuccess | null>(null)
  const submittingRef = useRef(false)

  const submit = async (rawToken: string, source: "qr" | "manual" = "qr") => {
    if (submittingRef.current) return
    const token = rawToken.trim().replace(/\s+/g, "")
    if (!token) return

    submittingRef.current = true
    setStatus("loading")
    setMessage("")

    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data: CheckInResponse = await res.json()

      if (data.ok) {
        const now = new Date()
        const fecha = format(now, "d MMM yyyy", { locale: es })
        const hora = format(now, "h:mm a", { locale: es })
        const dias = data.remaining_days != null ? ` · Te quedan ${data.remaining_days} días` : ""
        setSuccess({ subtitle: `${fecha} · ${hora}`, message: `Buen entrenamiento 💪${dias}` })
        setStatus("idle")
        setMessage("")
      } else if (data.code === "ALREADY_TODAY") {
        setStatus("already")
        setMessage(data.message ?? "Ya registraste tu ingreso hoy.")
      } else if (data.code === "NO_DAYS" || data.code === "EXHAUSTED") {
        setStatus("no_days")
        setMessage(data.message ?? "No tienes días disponibles.")
      } else if (source === "manual" && data.code && INVALID_CODE_CODES.has(data.code)) {
        setStatus("error")
        setMessage("Código incorrecto.")
      } else {
        setStatus("error")
        setMessage(data.message ?? "Error al registrar el ingreso.")
      }
    } catch {
      setStatus("error")
      setMessage("Error de red. Intenta de nuevo.")
    } finally {
      submittingRef.current = false
    }
  }

  const reset = () => {
    setStatus("idle")
    setMessage("")
  }

  return { status, message, success, submit, reset, clearSuccess: () => setSuccess(null) }
}

export type UseCheckIn = ReturnType<typeof useCheckIn>
