import { randomBytes, createHash } from "crypto"
import { env } from "@/lib/env"

// Invitaciones de acceso: el puente entre "cliente del gimnasio" y "cuenta de la app".
//
// ⚠️ Módulo SERVER-ONLY (importa node:crypto). A diferencia de placeholder-email.ts
// —que usa el `crypto` global y por eso sí puede importarse desde el buscador de
// clientes— este archivo no puede tocarlo ningún componente cliente.

/** 7 días, el valor pedido en el encargo. Cambiarlo aquí lo cambia en todo el flujo. */
export const INVITATION_TTL_DAYS = 7
export const INVITATION_TTL_HOURS = INVITATION_TTL_DAYS * 24

/** Cookie de respaldo para conservar el token durante el salto a Google. */
export const INVITATION_COOKIE = "nng_inv"
export const INVITATION_COOKIE_MAX_AGE = 600 // 10 minutos

/** Query param que lleva el token en el redirectTo del OAuth (capa principal). */
export const INVITATION_QUERY_PARAM = "inv"

/** 32 bytes = 256 bits de entropía. Inviable de adivinar; no hace falta rate limiting. */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url")
}

/**
 * ⚠️ Debe coincidir BYTE A BYTE con el hash que calcula Postgres en
 * accept_client_invitation: `encode(sha256(convert_to(p_token,'UTF8')),'hex')`.
 * Si divergen, ninguna invitación se podrá aceptar y el fallo será mudo.
 */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export function buildInvitationUrl(token: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/invitacion/${token}`
}

/**
 * ¿La URL base sirve para un enlace que va a salir del gimnasio?
 *
 * Devuelve el motivo si NO sirve, o null si está bien.
 *
 * ⚠️ Esto existe por un fallo real: `NEXT_PUBLIC_APP_URL` apuntaba en producción
 * a la URL `*.vercel.app` del proyecto, y esas URLs están detrás de la
 * protección de despliegue de Vercel — redirigen a `vercel.com/login`. El cliente
 * recibía el enlace por WhatsApp y aterrizaba en una pantalla de login de
 * Vercel, sin poder activar nada.
 *
 * Lo peor era que fallaba **en silencio**: el admin veía el enlace generado
 * correctamente y lo enviaba tan tranquilo. El problema solo aparecía del lado
 * del cliente. Por eso se comprueba antes de emitir: más vale que el admin vea un
 * error inmediato a que se entere por una queja tres días después.
 *
 * En desarrollo se permite cualquier cosa (localhost incluido).
 */
export function invitationBaseUrlProblem(): string | null {
  if (process.env.NODE_ENV !== "production") return null

  let host: string
  try {
    host = new URL(env.NEXT_PUBLIC_APP_URL).hostname.toLowerCase()
  } catch {
    return "La dirección de la app (NEXT_PUBLIC_APP_URL) no es una URL válida."
  }

  if (host === "localhost" || host === "127.0.0.1") {
    return "La app está configurada con una dirección local, así que el enlace no funcionaría fuera de este equipo."
  }

  if (host.endsWith(".vercel.app")) {
    return (
      "La app está configurada con una dirección de Vercel (.vercel.app). " +
      "Esas direcciones piden iniciar sesión en Vercel, así que el cliente no podría abrir el enlace. " +
      "Cámbiala a https://nenesgym.com en Vercel → Settings → Environment Variables → NEXT_PUBLIC_APP_URL."
    )
  }

  return null
}

/**
 * Número listo para wa.me. El teléfono se guarda canonizado (10 dígitos, sin el
 * indicativo 57), así que hay que devolvérselo; un número de otra longitud ya
 * trae el suyo y se deja tal cual. Devuelve null si no hay nada usable.
 *
 * ⚠️ Se llama SIEMPRE con el teléfono leído de la base, nunca con uno que venga
 * del navegador.
 */
export function toWhatsappNumber(phone?: string | null): string | null {
  const digits = (phone ?? "").replace(/\D/g, "")
  if (digits.length === 10) return `57${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

export function buildWhatsappUrl(phone: string | null | undefined, invitationUrl: string, firstName: string): string | null {
  const number = toWhatsappNumber(phone)
  if (!number) return null
  const message =
    `Hola, ${firstName}.\n\n` +
    `NENE'S GYM creó tu perfil y activó tu membresía.\n\n` +
    `Activa tu acceso a la app para consultar tu plan, rutinas, pagos, asistencias y progreso:\n\n` +
    invitationUrl
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
