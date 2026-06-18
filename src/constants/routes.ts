export const ROUTES = {
  // Auth
  LOGIN: '/login',
  REGISTER: '/register',

  // Cliente
  CLIENTE_DASHBOARD: '/cliente/dashboard',
  CLIENTE_PAGOS: '/cliente/pagos',
  CLIENTE_ASISTENCIA: '/cliente/asistencia',
  CLIENTE_PROGRESO: '/cliente/progreso',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_CLIENTES: '/admin/clientes',
  ADMIN_PAGOS: '/admin/pagos',
  ADMIN_ASISTENCIAS: '/admin/asistencias',
  ADMIN_PERFIL: '/admin/perfil',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
