// Correo marcador para socios dados de alta por el admin que no tienen correo
// propio (típicamente porque tampoco tienen celular y no pueden registrarse solos).
//
// Por qué existe: la cadena auth.users → profiles → clients es NOT NULL en todo
// el camino (clients.profile_id), y admin_search_clients hace JOIN con profiles.
// Un socio sin usuario de auth no aparecería en ninguna lista del admin. Así que
// todo socio necesita cuenta, aunque nunca vaya a iniciar sesión.
//
// El dominio es un subdominio del dominio propio del gym, que NO tiene registros
// MX: ese buzón no existe ni existirá, nadie puede reclamar la cuenta. Se prefiere
// a un .local/.invalid porque algunos validadores rechazan TLDs no resolubles.
export const PLACEHOLDER_EMAIL_DOMAIN = "socios.nenesgym.com"

/** true si el correo es un marcador generado por el admin (cuenta sin acceso). */
export function isPlaceholderEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`)
}

/** Correo del socio si es real; null si es un marcador (para no pintarlo nunca en la UI). */
export function displayEmail(email?: string | null): string | null {
  return isPlaceholderEmail(email) ? null : (email ?? null)
}

/**
 * Correo marcador a partir del nombre: juan-perez.a3f91c@socios.nenesgym.com
 *
 * ⚠️ Con `seed` el resultado es DETERMINISTA, y de eso depende que el alta sea
 * idempotente. Si el admin pulsa "Registrar", la red va lenta y reintenta, un
 * sufijo aleatorio generaría un correo distinto → `createUser` no colisionaría →
 * **dos socios duplicados, cada uno con su membresía cobrada**. El
 * `client_request_id` del pago no lo evita: son dos clientId diferentes.
 *
 * Con el mismo `seed` (el clientRequestId del modal) el reintento produce el
 * mismo correo, `createUser` falla con "already registered" y createClientAction
 * recupera el usuario existente en vez de crear otro socio.
 *
 * No se hashea el seed: ya es un UUID (122 bits de aleatoriedad), así que sus
 * primeros 6 hex sirven igual. Y hashear obligaría a importar node:crypto, que
 * rompería a los componentes cliente que importan `isPlaceholderEmail` de aquí.
 */
export function buildPlaceholderEmail(fullName: string, seed?: string): string {
  const slug =
    fullName
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // quita tildes
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "socio"
  const source = seed?.trim() || crypto.randomUUID()
  const rand = source.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 6).padEnd(6, "0")
  return `${slug}.${rand}@${PLACEHOLDER_EMAIL_DOMAIN}`
}
