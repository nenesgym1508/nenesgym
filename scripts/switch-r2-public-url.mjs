/**
 * Cambia el host público de las imágenes de ejercicios en la base de datos.
 *
 * Pensado para el paso de la URL de desarrollo de R2 (`pub-*.r2.dev`, con
 * rate-limit y sin caché de borde) a un dominio propio conectado al bucket
 * (p. ej. https://img.nenesgym.com). Reescribe el host de `exercises.media_url`
 * dejando la key intacta.
 *
 * Antes de tocar la base comprueba que el host nuevo sirve de verdad una de las
 * imágenes. Si no responde 200, aborta sin cambiar nada — así no se puede dejar
 * el catálogo apuntando a un dominio que todavía no funciona.
 *
 * Uso:
 *   node scripts/switch-r2-public-url.mjs https://img.nenesgym.com            (simulacro)
 *   node scripts/switch-r2-public-url.mjs https://img.nenesgym.com --apply
 *   node scripts/switch-r2-public-url.mjs --rollback
 *
 * Después de --apply hay que actualizar a mano, porque no vive en la base:
 *   1. NEXT_PUBLIC_R2_PUBLIC_URL en .env.local y en Vercel (Production).
 *   2. images.remotePatterns en next.config.ts (añadir el host nuevo).
 * El script lo recuerda al terminar.
 */
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BACKUP_FILE = join(__dirname, '.backup-r2-host-switch.json')

const envText = await readFile(join(ROOT, '.env.local'), 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CURRENT_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '').replace(/\/$/, '')

if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Faltan credenciales de Supabase en .env.local')

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function patch(id, media_url) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({ media_url }),
  })
  if (!res.ok) throw new Error(`PATCH ${id} -> ${res.status}: ${await res.text()}`)
}

// ── Rollback ─────────────────────────────────────────────────────────────────
if (process.argv.includes('--rollback')) {
  if (!existsSync(BACKUP_FILE)) throw new Error('No hay backup que restaurar.')
  const backup = JSON.parse(await readFile(BACKUP_FILE, 'utf8'))
  for (const { id, media_url } of backup) await patch(id, media_url)
  console.log(`Restauradas ${backup.length} media_url a su host anterior.`)
  console.log('Acuérdate de revertir también NEXT_PUBLIC_R2_PUBLIC_URL y next.config.ts.')
  process.exit(0)
}

const newBase = (process.argv[2] || '').replace(/\/$/, '')
const apply = process.argv.includes('--apply')

if (!/^https:\/\/[^/]+$/.test(newBase)) {
  console.error('Pasa el host nuevo como primer argumento. Ej: https://img.nenesgym.com')
  process.exit(1)
}
if (newBase === CURRENT_BASE) {
  console.error(`El host nuevo es el mismo que NEXT_PUBLIC_R2_PUBLIC_URL (${CURRENT_BASE}). Nada que hacer.`)
  process.exit(1)
}

const res = await fetch(
  `${SUPABASE_URL}/rest/v1/exercises?select=id,name,media_url&media_url=not.is.null`,
  { headers }
)
const rows = await res.json()
const pending = rows.filter((r) => r.media_url.startsWith(`${CURRENT_BASE}/`))

console.log(`Host actual : ${CURRENT_BASE}`)
console.log(`Host nuevo  : ${newBase}`)
console.log(`Ejercicios con imagen: ${rows.length} | a reescribir: ${pending.length}\n`)

if (!pending.length) {
  console.log('No hay nada que reescribir.')
  process.exit(0)
}

// Comprobación previa: el host nuevo debe servir ya una imagen real.
const sampleKey = pending[0].media_url.slice(CURRENT_BASE.length + 1)
const probeUrl = `${newBase}/${sampleKey}`
process.stdout.write(`Comprobando ${probeUrl}\n  -> `)
try {
  const probe = await fetch(probeUrl, { signal: AbortSignal.timeout(20_000) })
  console.log(`${probe.status} ${probe.headers.get('content-type') || ''}`)
  if (!probe.ok) {
    console.error('\nEl host nuevo no sirve la imagen todavía. No se toca la base.')
    console.error('Revisa que el dominio personalizado esté conectado al bucket en R2.')
    process.exit(1)
  }
} catch (e) {
  console.error(`fallo: ${e.message}`)
  console.error('\nEl host nuevo no responde. No se toca la base.')
  process.exit(1)
}

if (!apply) {
  console.log('\nSimulacro: no se ha modificado nada. Relanza con --apply para ejecutar.')
  process.exit(0)
}

await writeFile(
  BACKUP_FILE,
  JSON.stringify(pending.map(({ id, media_url }) => ({ id, media_url })), null, 2),
  'utf8'
)
console.log(`\nBackup de ${pending.length} URLs -> ${BACKUP_FILE}`)

let ok = 0
for (const ex of pending) {
  await patch(ex.id, newBase + ex.media_url.slice(CURRENT_BASE.length))
  ok++
}

console.log(`\nReescritas ${ok}/${pending.length} media_url.`)
console.log('\nFalta actualizar a mano (no vive en la base):')
console.log(`  1. NEXT_PUBLIC_R2_PUBLIC_URL=${newBase}  en .env.local y en Vercel (Production)`)
console.log(`  2. images.remotePatterns en next.config.ts -> hostname del nuevo dominio`)
console.log('  3. Redesplegar')
