import { createAdminClient } from "@/lib/supabase/admin"
import { hashInvitationToken } from "@/lib/invitations"

// Lecturas de invitaciones para Server Components.
//
// Se usa service-role a propósito en las dos funciones:
//  - getClientAccessState lo llama la ficha del admin, ya protegida por
//    requireAdminSession() en la página.
//  - getInvitationByToken lo llama la landing PÚBLICA /invitacion/[token], que
//    por definición no tiene sesión. El token es la autorización, y la tabla no
//    tiene policy de cliente (ver migración 026), así que no hay otra vía.

export type ClientAccessStatus =
  | "activa"        // el socio ya entra a la app
  | "sin_activar"   // cuenta inerte, sin invitación viva
  | "invitada"      // invitación viva y vigente
  | "vencida"       // hubo invitación pero caducó
  | "no_disponible" // la migración 026 todavía no está aplicada

export type ClientAccessState = {
  status: ClientAccessStatus
  expiresAt: string | null
  invitationId: string | null
  acceptedAt: string | null
  acceptedEmail: string | null
  attempts: number
}

const EMPTY: ClientAccessState = {
  status: "no_disponible",
  expiresAt: null,
  invitationId: null,
  acceptedAt: null,
  acceptedEmail: null,
  attempts: 0,
}

/**
 * Estado de acceso del socio para la ficha del admin.
 *
 * ⚠️ "Activa" NO se decide solo por la invitación aceptada. Un socio que se
 * registró él mismo (por /register o con Google) tiene ficha propia y **ninguna
 * invitación**: si el estado se dedujera solo de esta tabla, saldría como "sin
 * activar" y la tarjeta le ofrecería al admin invitarlo — y ese enlace, en las
 * manos equivocadas, se llevaría su historial y su cuenta.
 *
 * La fuente de verdad es si alguien ha usado ya esa cuenta:
 * `client_account_is_claimable` (migración 027) mira `auth.users.last_sign_in_at`
 * y las identidades. Si NO es reclamable, el acceso está activo, punto.
 */
export async function getClientAccessState(clientId: string): Promise<ClientAccessState> {
  const admin = createAdminClient()

  const { data: claimable, error: claimableError } = await admin.rpc(
    "client_account_is_claimable",
    { p_client_id: clientId }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("client_invitations")
    .select("id, expires_at, accepted_at, accepted_by, revoked_at, attempts")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(5)

  // 42P01 = la tabla no existe todavía (migración sin aplicar). La ficha
  // muestra "no disponible" en vez de reventar.
  if (error) return EMPTY

  // La cuenta ya se usa: acceso activo, sin invitación que ofrecer.
  if (!claimableError && claimable === false) {
    const { data: prof } = await admin
      .from("clients")
      .select("profile:profiles(email)")
      .eq("id", clientId)
      .maybeSingle()
    const aceptada = (data ?? []).find((r: { accepted_at: string | null }) => r.accepted_at)
    return {
      status: "activa",
      expiresAt: null,
      invitationId: aceptada?.id ?? null,
      acceptedAt: aceptada?.accepted_at ?? null,
      acceptedEmail: (prof?.profile as { email?: string | null } | null)?.email ?? null,
      attempts: aceptada?.attempts ?? 0,
    }
  }

  const rows = (data ?? []) as Array<{
    id: string
    expires_at: string
    accepted_at: string | null
    accepted_by: string | null
    revoked_at: string | null
    attempts: number
  }>

  const accepted = rows.find((r) => r.accepted_at)
  if (accepted) {
    let acceptedEmail: string | null = null
    if (accepted.accepted_by) {
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", accepted.accepted_by)
        .maybeSingle()
      acceptedEmail = prof?.email ?? null
    }
    return {
      status: "activa",
      expiresAt: null,
      invitationId: accepted.id,
      acceptedAt: accepted.accepted_at,
      acceptedEmail,
      attempts: accepted.attempts ?? 0,
    }
  }

  const live = rows.find((r) => !r.accepted_at && !r.revoked_at)
  if (live) {
    const vigente = new Date(live.expires_at).getTime() > Date.now()
    return {
      status: vigente ? "invitada" : "vencida",
      expiresAt: live.expires_at,
      invitationId: live.id,
      acceptedAt: null,
      acceptedEmail: null,
      attempts: live.attempts ?? 0,
    }
  }

  return { ...EMPTY, status: "sin_activar" }
}

export type InvitationPublicInfo = {
  code: "OK" | "INVALID" | "EXPIRED" | "REVOKED" | "ACCEPTED"
  firstName: string | null
  planName: string | null
  clientId: string | null
}

/**
 * Datos mínimos para pintar la landing pública. Devuelve SOLO el primer nombre y
 * el nombre del plan — nunca documento, pagos, mediciones ni dirección.
 */
export async function getInvitationByToken(token: string): Promise<InvitationPublicInfo> {
  const empty: InvitationPublicInfo = { code: "INVALID", firstName: null, planName: null, clientId: null }
  if (!token || token.length < 20) return empty

  const admin = createAdminClient()
  const tokenHash = hashInvitationToken(token)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("client_invitations")
    .select("client_id, expires_at, accepted_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle()

  if (error || !data) return empty
  if (data.accepted_at) return { ...empty, code: "ACCEPTED" }
  // Revocada e inexistente comparten mensaje en la UI: no revelar detalles internos.
  if (data.revoked_at) return { ...empty, code: "REVOKED" }
  if (new Date(data.expires_at).getTime() <= Date.now()) return { ...empty, code: "EXPIRED" }

  const { data: client } = await admin
    .from("clients")
    .select("id, profile:profiles(full_name)")
    .eq("id", data.client_id)
    .maybeSingle()

  const fullName = (client?.profile as { full_name?: string | null } | null)?.full_name ?? null
  const firstName = fullName?.trim().split(/\s+/)[0] ?? null

  const { data: membership } = await admin
    .from("memberships")
    .select("plan:plans(name)")
    .eq("client_id", data.client_id)
    .neq("status", "cancelled")
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    code: "OK",
    firstName,
    planName: (membership?.plan as { name?: string | null } | null)?.name ?? null,
    clientId: data.client_id,
  }
}
