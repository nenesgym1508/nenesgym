"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/constants/routes"

interface CheckInResponse {
  ok: boolean
  code?: string
  message?: string
  remaining_days?: number
}

/**
 * Registra la entrada del cliente autenticado directamente (self-check-in).
 * Invoca el RPC `process_client_check_in` que ejecuta todas las validaciones de membresía y días.
 */
export async function clientCheckInAction(): Promise<{ error?: string; success?: boolean; remainingDays?: number }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: "No autenticado. Por favor inicia sesión de nuevo." }
    }

    const { data, error } = await (supabase as any).rpc("process_client_check_in")

    if (error) {
      return { error: error.message || "Error al procesar el ingreso." }
    }

    const response = data as CheckInResponse

    if (!response.ok) {
      return { error: response.message || "Error al registrar el ingreso." }
    }

    revalidatePath(ROUTES.CLIENTE_ASISTENCIA)
    return { success: true, remainingDays: response.remaining_days }
  } catch (err) {
    console.error("Error en clientCheckInAction:", err)
    return { error: "Error del servidor. Intenta de nuevo." }
  }
}
