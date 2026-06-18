import { z } from 'zod'

export const registerSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Correo inválido'),
  phone: z.string().min(7, 'Teléfono inválido').max(15).optional().or(z.literal('')),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})

export const loginSchema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(80),
  phone: z.string().min(7).max(15).optional().or(z.literal('')),
  document_id: z.string().max(20).optional().or(z.literal('')),
  birthdate: z.string().optional().or(z.literal('')),
  emergency_contact: z.string().max(100).optional().or(z.literal('')),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
