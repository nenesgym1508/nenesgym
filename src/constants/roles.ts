import type { UserRole } from '@/types/auth'

export const ROLES = {
  ADMIN: 'admin' as UserRole,
  CLIENT: 'client' as UserRole,
} as const

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  client: 'Cliente',
}
