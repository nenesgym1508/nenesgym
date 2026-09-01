import { createClient } from "@/lib/supabase/server"

// ⚠️ TODA consulta sin `.limit()` la corta PostgREST en 1000 filas, y lo hace en
// SILENCIO: no hay error, solo faltan datos. Comprobado pidiendo 100.000
// asistencias — devolvió exactamente 1000 y ningún aviso.
//
// Por eso aquí todas llevan tope explícito: más vale un número que se pueda
// razonar que un corte invisible que aparecería el día que el gimnasio crezca.

/** Nadie entra más de dos veces al día; 1000 cubre casi tres años de un socio. */
const MAX_ASISTENCIAS_SOCIO = 1000
/** Aforo diario. Un gimnasio de barrio no pasa de unos cientos. */
const MAX_ASISTENCIAS_DIA = 500

export async function getClientAttendance(clientId: string, limit = 30) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("client_id", clientId)
    .order("check_in_date", { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getTodayAttendance(gymId: string) {
  const supabase = await createClient()
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  const { data } = await supabase
    .from("attendance")
    .select(
      `
      *,
      client:clients(
        id,
        profile:profiles(full_name)
      )
    `
    )
    .eq("gym_id", gymId)
    .eq("check_in_date", today)
    .order("checked_in_at", { ascending: false })
    .limit(MAX_ASISTENCIAS_DIA)
  return data ?? []
}

export async function getMonthlyAttendance(clientId: string, year: number, month: number) {
  const supabase = await createClient()
  const startDate = new Date(year, month - 1, 1).toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  const endDate = new Date(year, month, 0).toLocaleDateString("sv-SE", { timeZone: "America/Bogota" })
  
  const { data } = await supabase
    .from("attendance")
    .select("check_in_date")
    .eq("client_id", clientId)
    .gte("check_in_date", startDate)
    .lte("check_in_date", endDate)
    .order("check_in_date", { ascending: false })
    .limit(MAX_ASISTENCIAS_SOCIO)
  
  return data ?? []
}
