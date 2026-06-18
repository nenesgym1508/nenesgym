"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ROUTES } from "@/constants/routes"
import { env } from "@/lib/env"

function traducirErrorAuth(msg: string): string {
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

export async function loginAction(data: { email: string; password: string }) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })
  if (error) {
    console.error('[loginAction] Supabase error:', error.message, error.status)
    return { error: traducirErrorAuth(error.message) }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profile?.role === "admin") redirect(ROUTES.ADMIN_DASHBOARD)
  }
  redirect(ROUTES.CLIENTE_DASHBOARD)
}

export async function registerAction(data: {
  full_name: string
  email: string
  phone?: string
  password: string
}) {
  const admin = createAdminClient()
  const { error } = await admin.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      full_name: data.full_name,
      phone: data.phone || null,
    },
  })
  if (error) return { error: traducirErrorAuth(error.message) }

  const supabase = await createClient()
  await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
  redirect(ROUTES.CLIENTE_DASHBOARD)
}

export async function updateProfileNameAction(fullName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
  if (error) return { error: "Error al actualizar el nombre" }
  revalidatePath(ROUTES.ADMIN_MAS)
  revalidatePath(ROUTES.ADMIN_DASHBOARD)
  revalidatePath(ROUTES.CLIENTE_PERFIL)
  revalidatePath(ROUTES.CLIENTE_DASHBOARD)
  return { success: true }
}

export async function updateProfilePhoneAction(phone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }
  const { error } = await supabase
    .from("profiles")
    .update({ phone: phone || null })
    .eq("id", user.id)
  if (error) return { error: "Error al actualizar el teléfono" }
  revalidatePath(ROUTES.CLIENTE_PERFIL)
  return { success: true }
}

export async function updatePasswordAction(newPassword: string) {
  if (newPassword.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: traducirErrorAuth(error.message) }
  return { success: true }
}

export async function updateEmailAction(newEmail: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) return { error: traducirErrorAuth(error.message) }
  return { success: true }
}

export async function resetPasswordAction(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })
  if (error) return { error: traducirErrorAuth(error.message) }
  return { success: true }
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(ROUTES.LOGIN)
}
