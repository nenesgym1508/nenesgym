import { todayInBogota } from "@/lib/dates"
import type { MembershipStatus } from "@/types/membership"

// Función pura, sin dependencias de servidor (nada de next/headers): puede
// importarse tanto desde código de servidor como desde componentes cliente.
// No mover código server-only aquí — ver Lección "límite servidor/cliente"
// (Sesión 8, Parte D) en PILARES_DEL_CONOCIMIENTO/LECCIONES_APRENDIDAS.md.
export function computeEffectiveStatus(
  usedDays: number,
  totalDays: number,
  endDate: string,
  graceDays: number,
  status: MembershipStatus
): MembershipStatus {
  if (status === "cancelled") return "cancelled"
  if (usedDays >= totalDays) return "exhausted"
  const today = todayInBogota()
  if (today <= endDate) return "active"
  const graceEnd = new Date(endDate)
  graceEnd.setDate(graceEnd.getDate() + graceDays)
  const graceEndStr = graceEnd.toISOString().split("T")[0]
  if (today <= graceEndStr) return "grace"
  return "expired"
}
