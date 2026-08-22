// Traducción de los errores de Supabase Auth al español.
//
// Vivía dentro de auth.actions.ts, pero ese archivo es "use server": todo lo que
// exporta tiene que ser una server action async, así que no se podía compartir
// desde ahí. Ahora lo usan auth.actions.ts (login/registro) y admin.actions.ts
// (alta manual de clientes), sin duplicar la tabla de mensajes.
export function traducirErrorAuth(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes("invalid login credentials") || m.includes("invalid email or password"))
    return "Correo o contraseña incorrectos"
  if (m.includes("email not confirmed"))
    return "Debes confirmar tu correo antes de ingresar"
  if (m.includes("user already registered") || m.includes("already registered"))
    return "Este correo ya está registrado"
  if (m.includes("password should be at least"))
    return "La contraseña debe tener al menos 6 caracteres"
  if (m.includes("rate limit") || m.includes("too many requests"))
    return "Demasiados intentos. Espera unos minutos e intenta de nuevo"
  if (m.includes("60 seconds") || m.includes("once every"))
    return "Por seguridad, espera 60 segundos antes de intentar de nuevo"
  if (m.includes("signup is disabled"))
    return "El registro está deshabilitado"
  if (m.includes("invalid format") || m.includes("unable to validate email"))
    return "Formato de correo inválido"
  if (m.includes("user not found"))
    return "Usuario no encontrado"
  if (m.includes("refresh token") || m.includes("session"))
    return "Sesión expirada. Inicia sesión de nuevo"
  if (m.includes("new password should be different"))
    return "La nueva contraseña debe ser diferente a la actual"
  if (m.includes("weak password"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres con letras y números"
  return `Ocurrió un error inesperado (${msg}). Intenta de nuevo`
}
