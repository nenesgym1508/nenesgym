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
