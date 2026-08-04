import { format } from "date-fns"
import { es } from "date-fns/locale"
import { toZonedTime } from "date-fns-tz"
import { gymSession, GYM_TIMEZONE } from "@/lib/dates"

// Reglas de turno para el ingreso del cliente. El gimnasio permite hasta 2
// ingresos por día: uno en el turno de la mañana (antes de las 14:00) y otro
// en el de la tarde.
//
// Vivía duplicada en today-status-card.tsx y client-checkin-button.tsx, y las
// dos copias habían divergido: la del botón de la pantalla de Entrada no
// aplicaba el tope de 2 ingresos, así que las dos pantallas que gobiernan el
// mismo flujo daban respuestas distintas. Fuente única a partir de aquí.

/** Debe coincidir con el tope que aplica `process_check_in` en Supabase. */
export const MAX_SESSIONS_PER_DAY = 2

export interface CheckInShiftValidation {
  canCheckIn: boolean
  message: string | null
  buttonText: string
  /** Si la UI debe mostrar el contador "turno 1 de 2". */
  showDoubleCounter: boolean
}

export function getCheckInShiftValidation(
  lastCheckInAt?: string | null,
  sessionsToday: number = 0,
  trainedToday: boolean = false
): CheckInShiftValidation {
  const currentShift = gymSession()

  if (sessionsToday >= MAX_SESSIONS_PER_DAY) {
    return {
      canCheckIn: false,
      message: "Ya completaste tus 2 ingresos permitidos por día (Turno Mañana y Turno Tarde).",
      buttonText: "Ingresos de hoy completados",
      showDoubleCounter: true,
    }
  }

  if (!trainedToday || !lastCheckInAt) {
    return {
      canCheckIn: true,
      message: null,
      buttonText: "Sí, ingresar",
      showDoubleCounter: false,
    }
  }

  const lastCheckInDate = toZonedTime(new Date(lastCheckInAt), GYM_TIMEZONE)
  const lastShift = gymSession(lastCheckInDate)
  const formattedLastTime = format(lastCheckInDate, "h:mm a", { locale: es })

  if (lastShift === "am") {
    if (currentShift === "am") {
      return {
        canCheckIn: false,
        message: `Ya registraste tu ingreso del turno de la mañana (a las ${formattedLastTime}). Podrás registrar tu segundo ingreso en el turno de la tarde.`,
        buttonText: "Turno mañana registrado",
        showDoubleCounter: true,
      }
    }
    return {
      canCheckIn: true,
      message: null,
      buttonText: "Sí, ingresar",
      showDoubleCounter: true,
    }
  }

  // Su registro de hoy fue en el turno PM (y no asistió en la mañana): ya no
  // le quedan turnos hoy.
  return {
    canCheckIn: false,
    message: `Ya registraste tu ingreso del día de hoy (a las ${formattedLastTime}).`,
    buttonText: "Ingreso de hoy registrado",
    showDoubleCounter: false,
  }
}
