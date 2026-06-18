import { z } from 'zod'

export const progressRecordSchema = z.object({
  weight_kg: z
    .number({ message: 'Ingresa tu peso' })
    .min(20, 'Peso mínimo 20 kg')
    .max(300, 'Peso máximo 300 kg')
    .optional(),
  height_cm: z
    .number({ message: 'Ingresa tu estatura' })
    .min(50, 'Estatura mínima 50 cm')
    .max(250, 'Estatura máxima 250 cm')
    .optional(),
  note: z.string().max(300).optional().or(z.literal('')),
})

export type ProgressRecordInput = z.infer<typeof progressRecordSchema>
