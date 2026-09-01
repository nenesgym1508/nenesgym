"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ROUTES } from "@/constants/routes"
import { env } from "@/lib/env"
import { traducirErrorAuth } from "@/lib/auth/auth-errors"

/**
 * Solo se acepta volver a una invitación. Cualquier otro `next` se ignora, así
 * que esto no puede convertirse en un redirect abierto: no hay forma de colar
 * un host externo ni una ruta arbitraria.
 */
function destinoSeguro(next?: string): string | null {
  if (!next) return null
  return /^\/invitacion\/[A-Za-z0-9_-]{20,}$/.test(next) ? next : null
}

export async function loginAction(data: { email: string; password: string; next?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })
  if (error) {
    console.error('[loginAction] Supabase error:', error.message, error.status)
    return { error: traducirErrorAuth(error.message) }
  }

  // Volver al enlace de invitación que el cliente estaba intentando activar. Sin
  // esto, "inicia sesión con tu cuenta" era un consejo sin salida: al entrar
  // aterrizaba en su panel y perdía el enlace.
  const volverA = destinoSeguro(data.next)

  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.email) {
    const isExlusivoAdmin = user.email.toLowerCase() === "nenesgym1508@gmail.com"
    const adminClient = createAdminClient()

    if (isExlusivoAdmin) {
      await adminClient.from("profiles").update({ role: "admin" }).eq("id", user.id)
      await adminClient.from("profiles").update({ role: "client" }).neq("id", user.id).eq("role", "admin")
      redirect(ROUTES.ADMIN_DASHBOARD)
    } else {
      await adminClient.from("profiles").update({ role: "client" }).eq("id", user.id).eq("role", "admin")
      redirect(volverA ?? ROUTES.CLIENTE_DASHBOARD)
    }
  }
  redirect(volverA ?? ROUTES.CLIENTE_DASHBOARD)
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
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password })
  if (signInError) return { error: "Cuenta creada. Iniciá sesión manualmente." }
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
  // El perfil del cliente se edita desde un modal del dashboard; /cliente/perfil
  // no existe como pantalla. Antes solo se revalidaba esa ruta inexistente, así
  // que tras cambiar el teléfono no se refrescaba nada.
  revalidatePath(ROUTES.CLIENTE_DASHBOARD)
  return { success: true }
}

// Las cuentas creadas con Google no tienen contraseña propia. La RPC lee
// `auth.users.encrypted_password` del propio usuario (única fuente de verdad;
// inferirlo por los providers de `identities` no es fiable).
export async function currentUserHasPasswordAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado", hasPassword: false }
  const { data, error } = await supabase.rpc("current_user_has_password")
  if (error) return { error: "No se pudo verificar el estado de la contraseña", hasPassword: false }
  return { hasPassword: data === true }
}

export async function updatePasswordAction(newPassword: string, currentPassword: string) {
  if (newPassword.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }
  if (!currentPassword)
    return { error: "Debes ingresar tu contraseña actual" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }
  if (!user.email) return { error: "El usuario no tiene un correo configurado" }

  // Verificar la contraseña actual haciendo login temporal
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  })
  if (verifyError) {
    return { error: "La contraseña actual es incorrecta" }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: traducirErrorAuth(error.message) }
  revalidatePath(ROUTES.ADMIN_MAS)
  return { success: true }
}

// Alta de contraseña para cuentas que entraron con Google y aún no tienen una.
// No pide contraseña actual porque no existe; la guarda del servidor impide
// usar esta vía cuando la cuenta YA tiene contraseña (ahí se exige la actual).
export async function setPasswordAction(newPassword: string, confirmPassword: string) {
  if (newPassword.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }
  if (newPassword !== confirmPassword)
    return { error: "Las contraseñas no coinciden" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: yaTiene, error: checkError } = await supabase.rpc("current_user_has_password")
  if (checkError) return { error: "No se pudo verificar el estado de la contraseña" }
  if (yaTiene === true)
    return { error: "Tu cuenta ya tiene contraseña. Usa el cambio con contraseña actual." }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error: traducirErrorAuth(error.message) }
  revalidatePath(ROUTES.ADMIN_MAS)
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
