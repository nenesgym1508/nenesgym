// Correo marcador para clientes dados de alta por el admin que no tienen correo
// propio (típicamente porque tampoco tienen celular y no pueden registrarse solos).
//
// Por qué existe: la cadena auth.users → profiles → clients es NOT NULL en todo
// el camino (clients.profile_id), y admin_search_clients hace JOIN con profiles.
// Un cliente sin usuario de auth no aparecería en ninguna lista del admin. Así que
// todo cliente necesita cuenta, aunque nunca vaya a iniciar sesión.
//
// El dominio es un subdominio del dominio propio del gym, que NO tiene registros
// MX: ese buzón no existe ni existirá, nadie puede reclamar la cuenta. Se prefiere
// a un .local/.invalid porque algunos validadores rechazan TLDs no resolubles.
export const PLACEHOLDER_EMAIL_DOMAIN = "socios.nenesgym.com"

/** true si el correo es un marcador generado por el admin (cuenta sin acceso). */
export function isPlaceholderEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
}

/** Correo del cliente si es real; null si es un marcador (para no pintarlo nunca en la UI). */
export function buildPlaceholderEmail(fullName: string, seed?: string): string {
  const slug =
    fullName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // quita tildes
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      // ⚠️ "socio" y el dominio de abajo NO se renombran a "cliente", aunque en
      // toda la interfaz ya se diga cliente. Forman parte de correos que YA
      // existen en producción, y `isPlaceholderEmail()` compara contra ese
      // dominio: cambiarlo dejaría de reconocer las cuentas creadas hasta hoy y
      // rompería el flujo de invitaciones para ellas.
      .slice(0, 32) || "socio"
  const source = seed?.trim() || crypto.randomUUID()
  const rand = source.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 6).padEnd(6, "0")
  return `${slug}.${rand}@${PLACEHOLDER_EMAIL_DOMAIN}`
}
