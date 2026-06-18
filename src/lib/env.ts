import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(), // Opcional en el cliente por seguridad
  NEXT_PUBLIC_APP_URL: z.string().url(),
})

const cleanEnvVar = (val: string | undefined): string | undefined => {
  if (!val) return undefined
  // Eliminar BOM (\ufeff) y espacios en los extremos
  return val.replace(/^\ufeff/g, '').trim()
}

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: cleanEnvVar(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  SUPABASE_SERVICE_ROLE_KEY: cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY),
  NEXT_PUBLIC_APP_URL: cleanEnvVar(process.env.NEXT_PUBLIC_APP_URL),
})
