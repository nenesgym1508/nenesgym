import type { PaymentMethod } from '@/types/payment'

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia bancaria',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  other: 'Otro',
}

export const PAYMENT_STATUS_LABELS = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
} as const

export const MEMBERSHIP_STATUS_LABELS = {
  active: 'Activa',
  grace: 'Periodo extra',
  exhausted: 'Sin días',
  expired: 'Vencida',
  cancelled: 'Cancelada',
} as const

export const BMI_CATEGORIES = {
  underweight: { label: 'Bajo peso', range: '< 18.5', color: 'text-blue-400' },
  normal: { label: 'Normal', range: '18.5 - 24.9', color: 'text-green-400' },
  overweight: { label: 'Sobrepeso', range: '25 - 29.9', color: 'text-yellow-400' },
  obese: { label: 'Obesidad', range: '≥ 30', color: 'text-red-400' },
} as const

export const GRACE_DAYS_DEFAULT = 5
export const GYM_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
