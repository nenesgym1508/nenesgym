export const ROUTES = {
  // Auth
  BIENVENIDA: '/bienvenida',
  LOGIN: '/login',
  REGISTER: '/register',

  // Cliente
  CLIENTE_DASHBOARD: '/cliente/dashboard',
  CLIENTE_PAGOS: '/cliente/pagos',
  CLIENTE_ASISTENCIA: '/cliente/asistencia',
  CLIENTE_PROGRESO: '/cliente/progreso',
  CLIENTE_PERFIL: '/cliente/perfil',

  // Admin
  ADMIN_DASHBOARD: '/admin/dashboard',
  ADMIN_CLIENTES: '/admin/clientes',
  ADMIN_PAGOS: '/admin/pagos',
  ADMIN_ASISTENCIAS: '/admin/asistencias',
  ADMIN_PERFIL: '/admin/perfil',
  ADMIN_MAS: '/admin/mas',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
