import { z } from 'zod'

export const uploadPaymentSchema = z.object({
  plan_id: z.string().uuid().optional().or(z.literal('')),
  amount_cents: z.number().int().min(0, 'El monto no puede ser negativo'),
  method: z.enum(['cash', 'transfer', 'nequi', 'daviplata', 'other']),
  note: z.string().max(300).optional().or(z.literal('')),
})

export const manualPaymentSchema = z.object({
  client_id: z.string().uuid('Cliente requerido'),
  plan_id: z.string().uuid().optional().or(z.literal('')),
  amount_cents: z.number().int().min(0),
  method: z.enum(['cash', 'transfer', 'nequi', 'daviplata', 'other']),
  total_days: z.number().int().min(1).optional(),
  duration_days: z.number().int().min(1).optional(),
  note: z.string().max(300).optional().or(z.literal('')),
})

export const rejectPaymentSchema = z.object({
  note: z.string().min(1, 'Explica el motivo del rechazo').max(300),
})

export type UploadPaymentInput = z.infer<typeof uploadPaymentSchema>
export type ManualPaymentInput = z.infer<typeof manualPaymentSchema>
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>
