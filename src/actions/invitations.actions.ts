"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdmin } from "@/lib/auth/require-admin"
import { traducirErrorAuth } from "@/lib/auth/auth-errors"
import { isPlaceholderEmail } from "@/lib/placeholder-email"
import { adminClienteDetalle, ROUTES } from "@/constants/routes"
import {
  generateInvitationToken,
  hashInvitationToken,
  buildInvitationUrl,
  buildWhatsappUrl,
  INVITATION_COOKIE,
  INVITATION_COOKIE_MAX_AGE,
  INVITATION_TTL_HOURS,
  invitationBaseUrlProblem,
} from "@/lib/invitations"

export type InvitationLink = {
  url: string
  /** null si el socio no tiene un teléfono usable: la UI solo ofrece copiar. */
  waUrl: string | null
  expiresAt: string
}

/**
 * Emite (o regenera) la invitación de un socio y devuelve el enlace.
 *
 * ⚠️ El token en claro solo existe aquí y en lo que se devuelve: en la base solo
 * queda su sha256. Por eso "reutilizar" una invitación viva no es posible — no
 * se puede reconstruir la URL. Regenerar revoca la anterior en la misma
 * transacción (ver create_client_invitation), así que nunca hay dos vivas.
 */
export async function createInvitationAction(
  clientId: string
): Promise<{ error: string } | InvitationLink> {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  // Antes de nada: que la dirección con la que se va a construir el enlace sirva
  // de verdad fuera del gimnasio. Generar un token para un enlace que el socio
  // no puede abrir solo consigue quemarlo y que nadie se entere hasta la queja.
  const problema = invitationBaseUrlProblem()
  if (problema) return { error: problema }

  const token = generateInvitationToken()

  const { data, error } = await ctx.supabase.rpc("create_client_invitation", {
    p_client_id: clientId,
    p_token_hash: hashInvitationToken(token),
    p_ttl_hours: INVITATION_TTL_HOURS,
  })

  if (error) {
    if (/does not exist/i.test(error.message)) {
      return { error: "El módulo de invitaciones aún no está instalado en la base de datos." }
    }
    return { error: error.message }
  }

  const result = data as { ok: boolean; message?: string; expires_at?: string }
  if (!result?.ok) return { error: result?.message ?? "No se pudo generar la invitación" }

  // El teléfono y el nombre salen de la BASE, nunca del navegador.
  const admin = createAdminClient()
  const { data: client } = await admin
    .from("clients")
    .select("profile:profiles(full_name, phone)")
    .eq("id", clientId)
    .maybeSingle()

  const profile = client?.profile as { full_name?: string | null; phone?: string | null } | null
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] ?? "hola"
  const url = buildInvitationUrl(token)

  revalidatePath(adminClienteDetalle(clientId))

  return {
    url,
    waUrl: buildWhatsappUrl(profile?.phone, url, firstName),
    expiresAt: result.expires_at ?? "",
  }
}

export async function revokeInvitationAction(invitationId: string, clientId: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  // UPDATE directo bajo la policy admin de la tabla — no hace falta RPC.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (ctx.supabase as any)
    .from("client_invitations")
    .update({ revoked_at: new Date().toISOString(), revoked_by: ctx.user.id })
    .eq("id", invitationId)
    .is("accepted_at", null)
  if (error) return { error: error.message }

  revalidatePath(adminClienteDetalle(clientId))
  return { success: true }
}

/**
 * Guarda el token en una cookie antes de saltar a Google.
 *
 * Es la CAPA 2 del contexto OAuth, no la principal: cuando el socio abre el
 * enlace desde el WebView de WhatsApp y Google salta al navegador del sistema,
 * esta cookie no existe allí. La capa que sí sobrevive es el `?inv=` del
 * redirectTo; esta cubre el caso contrario (que Supabase recorte el query).
 */
export async function stashInvitationTokenAction(token: string) {
  const store = await cookies()
  store.set(INVITATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: INVITATION_COOKIE_MAX_AGE,
  })
  return { success: true }
}

export type AcceptResult =
  | { ok: true; code: string; clientId: string }
  | { ok: false; code: string; message: string }

/**
 * Acepta la invitación con la sesión actual.
 *
 * ⚠️ Usa el cliente de SESIÓN (createClient), no service-role: la RPC lee
 * auth.uid() para saber quién acepta. Con service-role auth.uid() es NULL y
 * devolvería UNAUTHENTICATED.
 */
export async function acceptWithCurrentSessionAction(token: string): Promise<AcceptResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, code: "UNAUTHENTICATED", message: "Inicia sesión para activar tu acceso." }
  }

  // Red de seguridad: si el trigger de auth.users no llegó a crear el perfil, la
  // RPC devolvería NO_PROFILE. Mismo upsert correctivo que hace createClientAction.
  await ensureProfile(user.id, user.email ?? null, user.user_metadata?.full_name ?? null)

  const { data, error } = await supabase.rpc("accept_client_invitation", { p_token: token })

  if (error) {
    if (/does not exist/i.test(error.message)) {
      return { ok: false, code: "NOT_INSTALLED", message: "El módulo de invitaciones aún no está instalado." }
    }
    return { ok: false, code: "ERROR", message: error.message }
  }

  const result = data as { ok: boolean; code: string; message?: string; client_id?: string }
  if (!result?.ok) {
    return { ok: false, code: result?.code ?? "ERROR", message: result?.message ?? "No se pudo activar tu acceso." }
  }

  revalidatePath(ROUTES.CLIENTE_DASHBOARD)
  return { ok: true, code: result.code, clientId: result.client_id ?? "" }
}

/**
 * Camino manual: correo + contraseña, SIN crear ningún usuario nuevo.
 *
 * En vez de signUp (que además exigiría confirmación por correo, porque el
 * proyecto tiene mailer_autoconfirm=false), se reutiliza la cuenta inerte que ya
 * existe: se le pone el correo y la contraseña que elige el socio. Cero fusión,
 * cero ficha sobrante, nada que borrar.
 */
export async function acceptWithPasswordAction(
  token: string,
  email: string,
  password: string
): Promise<AcceptResult> {
  if (password.length < 8) {
    return { ok: false, code: "WEAK_PASSWORD", message: "La contraseña debe tener al menos 8 caracteres" }
  }
  const cleanEmail = email.trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
    return { ok: false, code: "INVALID_EMAIL", message: "Correo inválido" }
  }
  // El dominio marcador no tiene registros MX a propósito: si alguien lo
  // tecleara, su login quedaría en un buzón que no existe y no podría recuperar
  // la contraseña nunca. Además, al iniciar sesión la cuenta dejaría de ser
  // reclamable y el gimnasio ya no podría reenviarle otra invitación.
  if (isPlaceholderEmail(cleanEmail)) {
    return {
      ok: false,
      code: "PLACEHOLDER_EMAIL",
      message: "Ese no es un correo válido para tu cuenta. Usa el tuyo propio.",
    }
  }

  const admin = createAdminClient()
  const tokenHash = hashInvitationToken(token)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inv, error: invError } = await (admin as any)
    .from("client_invitations")
    .select("client_id, expires_at, accepted_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (invError || !inv) return { ok: false, code: "INVALID", message: "Este enlace ya no está disponible." }
  if (inv.accepted_at) return { ok: false, code: "ALREADY_USED", message: "Esta invitación ya fue utilizada." }
  if (inv.revoked_at) return { ok: false, code: "REVOKED", message: "Este enlace ya no está disponible." }
  if (new Date(inv.expires_at).getTime() <= Date.now()) {
    return { ok: false, code: "EXPIRED", message: "Este enlace ha vencido. Solicita al gimnasio una nueva invitación." }
  }

  const { data: client } = await admin
    .from("clients")
    .select("profile_id")
    .eq("id", inv.client_id)
    .maybeSingle()
  if (!client) return { ok: false, code: "CLIENT_GONE", message: "El socio ya no existe." }

  // ⚠️ GUARDA CRÍTICA. Abajo se hace `updateUserById` con el correo y la
  // contraseña que teclea quien abre el enlace. Si la ficha perteneciera a una
  // cuenta que alguien YA usa, eso sería una toma de cuenta completa: el
  // atacante se quedaría con el login del socio, no solo con su ficha.
  //
  // "Reclamable" = la cuenta la creó el gimnasio y nadie ha entrado nunca con
  // ella (last_sign_in_at NULL, sin identidades distintas de 'email').
  // Ver public.client_account_is_claimable, migración 027.
  const { data: claimable, error: claimableError } = await admin.rpc(
    "client_account_is_claimable",
    { p_client_id: inv.client_id }
  )
  if (claimableError || claimable !== true) {
    return {
      ok: false,
      code: "HAS_REAL_ACCOUNT",
      message: "Esta ficha ya pertenece a una cuenta activa. Inicia sesión con ella o comunícate con NENE'S GYM.",
    }
  }

  // ¿Ese correo ya tiene cuenta?
  //
  // ⚠️ Se pregunta a `auth.users`, NO a `profiles`. `profiles.email` no es la
  // fuente de verdad del login y se desincroniza: `updateEmailAction` cambia el
  // correo en Auth y nunca toca `profiles`. Consultar la tabla equivocada daba
  // dos fallos opuestos — dejar pasar un correo ocupado (y reventar después con
  // un error de GoTrue en inglés), o bloquear uno que ya estaba libre.
  const { data: ownerId } = await admin.rpc("auth_email_owner", { p_email: cleanEmail })

  if (ownerId && ownerId !== client.profile_id) {
    // NUNCA se le pide otro correo: ese correo es casi seguro suyo, y darle otro
    // crearía una segunda cuenta para la misma persona — justo lo que este
    // sistema existe para evitar. Se le manda a entrar con la que ya tiene y a
    // volver al enlace; la landing detecta la sesión y ofrece vincular.
    return {
      ok: false,
      code: "EMAIL_TAKEN",
      message: "Ese correo ya tiene cuenta en NENE'S GYM. Inicia sesión con ella y vuelve a abrir este enlace para terminar de activar tu acceso.",
    }
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(client.profile_id, {
    email: cleanEmail,
    password,
    email_confirm: true,
  })
  if (updateError) {
    // El texto de GoTrue es "…has already BEEN registered", que traducirErrorAuth
    // no captura (busca "already registered") y acaba mostrando inglés crudo con
    // un consejo falso. Se traduce aquí, donde sí se sabe qué significa.
    if (/already been registered|already registered|email_exists/i.test(updateError.message)) {
      return {
        ok: false,
        code: "EMAIL_TAKEN",
        message: "Ese correo ya tiene cuenta en NENE'S GYM. Inicia sesión con ella y vuelve a abrir este enlace.",
      }
    }
    return { ok: false, code: "AUTH_ERROR", message: traducirErrorAuth(updateError.message) }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("profiles").update({ email: cleanEmail }).eq("id", client.profile_id)

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
  if (signInError) {
    // Llegar aquí significa que las credenciales que acabamos de escribir ya no
    // sirven: alguien más usó el mismo enlace en paralelo y ganó la carrera.
    // Decir "cuenta activada, inicia sesión" sería mentira — no tiene con qué.
    return {
      ok: false,
      code: "RACE_LOST",
      message: "Alguien más acaba de activar esta cuenta. Si no fuiste tú, pídele al gimnasio una invitación nueva.",
    }
  }

  // Ya con sesión, la RPC marca la invitación aceptada. Aquí el cliente ya es
  // suyo (profile_id no cambia), así que devuelve ALREADY_OWNER.
  return acceptWithCurrentSessionAction(token)
}

/** Upsert correctivo del perfil: el trigger de auth.users puede no haber corrido. */
async function ensureProfile(userId: string, email: string | null, fullName: string | null) {
  const admin = createAdminClient()
  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle()
  if (existing) return

  const { data: gym } = await admin.from("gyms").select("id").limit(1).maybeSingle()
  if (!gym) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).from("profiles").upsert(
    { id: userId, gym_id: gym.id, email, full_name: fullName, role: "client" },
    { onConflict: "id" }
  )
}
