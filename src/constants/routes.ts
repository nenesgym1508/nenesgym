export const ROUTES = {
  // Auth
  BIENVENIDA: '/bienvenida',
  LOGIN: '/login',
  REGISTER: '/register',
  PRIVACIDAD: '/privacidad',
  TERMINOS: '/terminos',

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
  ADMIN_ENTRENAMIENTO: '/admin/entrenamiento',
  ADMIN_CLASES: '/admin/clases',
  ADMIN_CLASES_EJERCICIOS: '/admin/clases/ejercicios',
  ADMIN_CLASES_NUEVA: '/admin/clases/nueva',

  // Admin — Rutinas (Asignaciones)
  ADMIN_RUTINAS: '/admin/rutinas',
  ADMIN_RUTINAS_NUEVA: '/admin/rutinas/nueva',

  // Admin — Rutinas (Biblioteca)
  ADMIN_RUTINAS_BIBLIOTECA: '/admin/rutinas/biblioteca',
  ADMIN_RUTINAS_BIBLIOTECA_NUEVA: '/admin/rutinas/biblioteca/nueva',

  // Cliente — Rutinas
  CLIENTE_RUTINAS: '/cliente/rutinas',
  CLIENTE_RUTINAS_EJERCICIOS: '/cliente/rutinas/ejercicios',
} as const

export function adminClienteDetalle(id: string) {
  return `/admin/clientes/${id}` as const
}

export function adminClienteRutinasDetalle(id: string) {
  return `/admin/clientes/${id}/rutinas` as const
}

export function adminClaseDetalle(id: string) {
  return `/admin/clases/${id}` as const
}

export function adminRutinaDetalle(id: string) {
  return `/admin/rutinas/${id}` as const
}

export function adminRutinaBibliotecaDetalle(id: string) {
  return `/admin/rutinas/biblioteca/${id}` as const
}

export function clienteRutinaDetalle(id: string) {
  return `/cliente/rutinas/${id}` as const
}

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

