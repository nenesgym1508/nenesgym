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

// Alta manual de un cliente por parte del admin (el que no trae el celular encima
// y no puede registrarse solo). El correo es opcional — si falta se genera uno
// marcador, ver src/lib/placeholder-email.ts.
//
// El celular SÍ es obligatorio: es el identificador del cliente, la única defensa
// contra registrarlo dos veces, y el canal por el que se le mandará el enlace
// para vincular su correo. Se guarda solo en dígitos (sin +, espacios ni guiones)
// para que el mismo número escrito de dos formas no sean dos clientes distintos.
export const adminCreateClientSchema = z.object({
  full_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  phone: z
    .string()
    // Solo dígitos, y sin el indicativo de Colombia: "+57 300 123 4567",
    // "573001234567" y "3001234567" son el MISMO número. Si se guardaran tal cual,
    // serían tres clientes distintos y la detección de duplicados no vería nada.
    .transform((v) => {
      const digits = v.replace(/\D/g, '')
      return digits.length === 12 && digits.startsWith('57') ? digits.slice(2) : digits
    })
    .refine((v) => v.length >= 10, 'El WhatsApp debe tener al menos 10 dígitos')
    .refine((v) => v.length <= 15, 'El WhatsApp no puede tener más de 15 dígitos'),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type AdminCreateClientInput = z.infer<typeof adminCreateClientSchema>
