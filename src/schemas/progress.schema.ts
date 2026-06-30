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
  waist_cm: z
    .number({ message: 'Ingresa tu cintura' })
    .min(30, 'Valor mínimo 30 cm')
    .max(200, 'Valor máximo 200 cm')
    .optional(),
  chest_cm: z
    .number({ message: 'Ingresa tu pecho' })
    .min(30, 'Valor mínimo 30 cm')
    .max(200, 'Valor máximo 200 cm')
    .optional(),
  arm_cm: z
    .number({ message: 'Ingresa tu brazo' })
    .min(10, 'Valor mínimo 10 cm')
    .max(100, 'Valor máximo 100 cm')
    .optional(),
  leg_cm: z
    .number({ message: 'Ingresa tu pierna' })
    .min(20, 'Valor mínimo 20 cm')
    .max(150, 'Valor máximo 150 cm')
    .optional(),
  note: z.string().max(300).optional().or(z.literal('')),
})

export type ProgressRecordInput = z.infer<typeof progressRecordSchema>
