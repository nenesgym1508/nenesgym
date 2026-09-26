import { formatDistanceToNow, format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toZonedTime } from 'date-fns-tz'

export const GYM_TIMEZONE = 'America/Bogota'

export function nowInBogota(): Date {
  return toZonedTime(new Date(), GYM_TIMEZONE)
}

export function todayInBogota(): string {
  return format(nowInBogota(), 'yyyy-MM-dd')
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'd MMM yyyy', { locale: es })
}

export function formatDatetime(dateStr: string): string {
  return format(parseISO(dateStr), "d MMM yyyy 'a las' h:mm a", { locale: es })
}

export function timeAgo(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: es })
}

export function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), nowInBogota())
}

export function daysUntilExpiry(endDate: string, graceDays = 5): number {
  return differenceInDays(parseISO(endDate), nowInBogota()) + graceDays
}

/**
 * Días de entrenamiento por semana que cubre un plan.
 *
 * Solo se usa ya para ROTULAR el plan en la interfaz ("3 días/semana"), no
 * para descontar días: eso ahora depende de las asistencias reales. Se deduce
 * de los días del plan sobre una vigencia mensual (~4,3 semanas).
 */
export function daysPerWeekForPlan(totalDays: number): number {
  if (totalDays <= 4) return totalDays
  return Math.max(1, Math.min(7, Math.round(totalDays / 4.3)))
}

/**
 * Días que le quedan a una membresía = los que compró menos los que ya usó.
 *
 * ⚠️ CUENTA ASISTENCIAS, NO DÍAS DE CALENDARIO. El modelo anterior restaba
 * "días hábiles transcurridos": cada día que pasaba descontaba uno, hubiera
 * venido el cliente o no. Se rompía de dos maneras a la vez:
 *
 *   1. `daysPerWeekForPlan` solo sabía devolver 5 o 6, así que un plan de
 *      3 o 4 días/semana descontaba 6 días por semana. Los 16 días de un
 *      mensual se agotaban en 19 días corridos en vez de durar los 30 de
 *      vigencia, y la tarjeta enseñaba "0 entrenamientos restantes" con el
 *      plan todavía vigente. Le pasaba a 65 de 72 clientes activos.
 *   2. Aunque el número de días/semana fuera correcto, cobrar las faltas
 *      contradice lo que el cliente compra: "16 días" son 16 entradas.
 *
 * `used_days` lo mantiene `increment_used_days` en cada check-in, y el admin
 * puede corregirlo marcando o desmarcando días pasados (ver
 * `setAttendanceForDateAction`) cuando alguien olvidó registrar su entrada.
 *
 * La VIGENCIA sigue mandando: `end_date` corta la membresía aunque sobren
 * días. Eso lo decide `computeEffectiveStatus`, no esta función.
 */
export function membershipRemainingDays(totalDays: number, usedDays: number): number {
  return Math.max(0, totalDays - Math.max(0, usedDays))
}

/**
 * Hora de corte entre la franja de la mañana y la de la tarde/noche.
 * Las 14:00 caen dentro del bloque cerrado del gym (10am-5pm), así que es
 * un corte robusto. IMPORTANTE: debe coincidir con el umbral del RPC
 * `process_check_in` en Supabase.
 */
/**
 * Suma (o resta, con días negativos) días a una fecha `YYYY-MM-DD` y devuelve
 * otra fecha `YYYY-MM-DD`. Se ancla al mediodía a propósito: parsear una fecha
 * pelada la interpretaría como UTC-00:00 y en Bogotá (UTC-5) caería en el día
 * anterior al volver a formatearla.
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

export const GYM_SESSION_CUTOFF_HOUR = 14

/**
 * Franja del día (am/pm) según la hora del gym. Permite 2 ingresos por día:
 * uno por franja.
 */
export function gymSession(date: Date = nowInBogota()): "am" | "pm" {
  return date.getHours() < GYM_SESSION_CUTOFF_HOUR ? "am" : "pm"
}

/**
 * Saludo según la hora del día (zona del gym).
 */
export function getGreeting(date: Date = nowInBogota()): string {
  const hour = date.getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Racha actual: días entrenables consecutivos asistidos, contando hacia atrás
 * desde hoy. Los días libres (domingo, y sábado en planes de 5 días/semana)
 * NO rompen la racha. Que hoy aún no se haya entrenado tampoco la rompe.
 *
 * @param attendanceDates fechas asistidas (Date a medianoche local)
 * @param daysPerWeek     5 o 6
 * @param today           hoy en zona del gym
 */
export function computeStreak(
  attendanceDates: Date[],
  daysPerWeek: number,
  today: Date
): number {
  const toKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  const attended = new Set(attendanceDates.map(toKey))

  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startTime = cursor.getTime()
  let streak = 0

  // Límite de seguridad: como máximo ~1 año hacia atrás.
  for (let i = 0; i < 400; i++) {
    const dow = cursor.getDay() // 0=domingo ... 6=sábado
    const isFree = dow === 0 || (daysPerWeek === 5 && dow === 6)
    const isCurrentDay = cursor.getTime() === startTime

    if (attended.has(toKey(cursor))) {
      streak++
    } else if (!isFree && !isCurrentDay) {
      break
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
