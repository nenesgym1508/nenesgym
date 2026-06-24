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
 * Días hábiles (no libres) por plan. Domingo siempre es libre; el sábado
 * también lo es en planes de 5 días/semana.
 */
export function daysPerWeekForPlan(totalDays: number): 5 | 6 {
  return totalDays <= 20 ? 5 : 6
}

/**
 * Cuenta los días hábiles transcurridos desde la activación hasta AYER
 * (los días que ya pasaron). Cada día hábil cuenta, haya asistido o no
 * el cliente — por eso las faltas descuentan de la membresía.
 *
 * @param startDate  fecha de activación 'yyyy-MM-dd'
 * @param today      hoy en zona del gym 'yyyy-MM-dd'
 * @param daysPerWeek 5 (lun-vie) o 6 (lun-sáb)
 */
export function eligibleDaysElapsed(
  startDate: string,
  today: string,
  daysPerWeek: number
): number {
  const start = new Date(`${startDate.split("T")[0]}T00:00:00`)
  const end = new Date(`${today.split("T")[0]}T00:00:00`) // exclusivo: solo días pasados
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0
  let count = 0
  const d = new Date(start)
  while (d < end) {
    const dow = d.getDay() // 0=domingo ... 6=sábado
    const isFree = dow === 0 || (daysPerWeek === 5 && dow === 6)
    if (!isFree) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

/**
 * Días de membresía restantes contando las faltas. Modelo base calendario:
 * remaining = total_days − días hábiles ya transcurridos.
 */
export function membershipRemainingDays(
  startDate: string,
  totalDays: number,
  today: string,
  daysPerWeek = daysPerWeekForPlan(totalDays)
): number {
  return Math.max(0, totalDays - eligibleDaysElapsed(startDate, today, daysPerWeek))
}
