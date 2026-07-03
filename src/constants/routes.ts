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

  // Admin — Clases
  ADMIN_CLASES: '/admin/clases',
  ADMIN_CLASES_EJERCICIOS: '/admin/clases/ejercicios',
  ADMIN_CLASES_PLANTILLAS: '/admin/clases/plantillas',
  ADMIN_CLASES_NUEVA: '/admin/clases/nueva',
} as const

export function adminClienteDetalle(id: string) {
  return `/admin/clientes/${id}` as const
}

export function adminClaseDetalle(id: string) {
  return `/admin/clases/${id}` as const
}

export function adminPlantillaDetalle(id: string) {
  return `/admin/clases/plantillas/${id}` as const
}

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
