/**
 * Sube a Cloudflare R2 las imágenes del catálogo de ejercicios que todavía
 * viven fuera de nuestro storage, y reapunta `exercises.media_url`.
 *
 * Por qué: la migración a R2 (Sesión 16) movió solo las subidas nuevas. El
 * catálogo sembrado seguía apuntando a `raw.githubusercontent.com` (que no es
 * un CDN de imágenes, aplica rate-limit por IP y se cayó durante la propia
 * revisión) y a 13 JPG de ~450 KB dentro de /public.
 *
 * Qué hace con cada ejercicio cuya media_url NO esté ya en R2:
 *   1. La descarga (o la lee de /public si es una ruta relativa).
 *   2. La convierte a WebP, máximo 1600px de lado.
 *   3. La sube a R2 bajo gym/{GYM_ID}/catalog/.
 *   4. Actualiza media_url en la base.
 *
 * Es idempotente: lo ya migrado se salta. Antes de tocar nada escribe
 * scripts/.backup-exercise-media-urls.json con las URLs originales, para poder
 * revertir con --rollback.
 *
 * Uso:
 *   node scripts/migrate-exercise-images-to-r2.mjs --dry-run   (por defecto)
 *   node scripts/migrate-exercise-images-to-r2.mjs --apply
 *   node scripts/migrate-exercise-images-to-r2.mjs --rollback
 */
import sharp from 'sharp'
import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const BACKUP_FILE = join(__dirname, '.backup-exercise-media-urls.json')

// ── Entorno ──────────────────────────────────────────────────────────────────
const envText = await readFile(join(ROOT, '.env.local'), 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const {
  NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  NEXT_PUBLIC_R2_PUBLIC_URL,
} = process.env

for (const [k, v] of Object.entries({
  SUPABASE_URL, SERVICE_KEY, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, NEXT_PUBLIC_R2_PUBLIC_URL,
})) {
  if (!v) throw new Error(`Falta la variable de entorno ${k}`)
}

const R2_PUBLIC = NEXT_PUBLIC_R2_PUBLIC_URL.replace(/\/$/, '')
const GYM_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

const mode = process.argv.includes('--apply')
  ? 'apply'
  : process.argv.includes('--rollback')
    ? 'rollback'
    : 'dry-run'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
})

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

async function fetchExercises() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/exercises?select=id,name,media_url&gym_id=eq.${GYM_ID}`,
    { headers: sbHeaders }
  )
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`)
  return res.json()
}

async function updateMediaUrl(id, url) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/exercises?id=eq.${id}`, {
    method: 'PATCH',
    headers: { ...sbHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ media_url: url }),
  })
  if (!res.ok) throw new Error(`PATCH ${id} -> ${res.status}: ${await res.text()}`)
}

// Reintentos: raw.githubusercontent.com aplica rate-limit y corta conexiones.
async function download(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) {
      if (i === attempts) throw e
      await new Promise((r) => setTimeout(r, 1500 * i))
    }
  }
}

async function readSource(mediaUrl) {
  if (mediaUrl.startsWith('http')) return download(mediaUrl)
  const local = join(ROOT, 'public', mediaUrl.replace(/^\//, ''))
  if (!existsSync(local)) throw new Error(`No existe el archivo local ${local}`)
  return readFile(local)
}

function slugify(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    .slice(0, 60)
}

// ── Rollback ─────────────────────────────────────────────────────────────────
if (mode === 'rollback') {
  if (!existsSync(BACKUP_FILE)) throw new Error('No hay backup que restaurar.')
  const backup = JSON.parse(await readFile(BACKUP_FILE, 'utf8'))
  for (const { id, name, media_url } of backup) {
    await updateMediaUrl(id, media_url)
    console.log(`  restaurado  ${name}`)
  }
  console.log(`\nListo: ${backup.length} media_url restauradas.`)
  console.log('Los archivos subidos a R2 quedan ahí (huérfanos); bórralos a mano si quieres.')
  process.exit(0)
}

// ── Migración ────────────────────────────────────────────────────────────────
const all = await fetchExercises()
const pending = all.filter((e) => e.media_url && !e.media_url.startsWith(R2_PUBLIC))

console.log(`Modo: ${mode}`)
console.log(`Ejercicios: ${all.length} | ya en R2: ${all.length - pending.length} | por migrar: ${pending.length}\n`)

if (mode === 'dry-run') {
  const byHost = {}
  for (const e of pending) {
    const h = e.media_url.startsWith('http') ? new URL(e.media_url).host : '(local /public)'
    byHost[h] = (byHost[h] || 0) + 1
  }
  console.log('Origen de lo pendiente:', byHost)
  console.log('\nNada se ha modificado. Vuelve a lanzarlo con --apply para ejecutar.')
  process.exit(0)
}

await writeFile(
  BACKUP_FILE,
  JSON.stringify(pending.map(({ id, name, media_url }) => ({ id, name, media_url })), null, 2),
  'utf8'
)
console.log(`Backup de ${pending.length} URLs -> ${BACKUP_FILE}\n`)

let ok = 0
let bytesBefore = 0
let bytesAfter = 0
const failed = []

for (const [i, ex] of pending.entries()) {
  const tag = `[${i + 1}/${pending.length}] ${ex.name}`
  try {
    const original = await readSource(ex.media_url)
    const webp = await sharp(original)
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()

    const key = `gym/${GYM_ID}/catalog/${slugify(ex.name)}-${ex.id.slice(0, 8)}.webp`
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: webp,
      ContentType: 'image/webp',
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    await updateMediaUrl(ex.id, `${R2_PUBLIC}/${key}`)

    bytesBefore += original.length
    bytesAfter += webp.length
    ok++
    console.log(`  ok  ${tag}  ${Math.round(original.length / 1024)}KB -> ${Math.round(webp.length / 1024)}KB`)
  } catch (e) {
    failed.push({ name: ex.name, error: e.message })
    console.log(`  ERROR ${tag}: ${e.message}`)
  }
}

console.log(`\nMigrados: ${ok}/${pending.length}`)
if (bytesBefore) {
  console.log(`Peso: ${(bytesBefore / 1024 / 1024).toFixed(1)} MB -> ${(bytesAfter / 1024 / 1024).toFixed(1)} MB`)
}
if (failed.length) {
  console.log(`\nFallaron ${failed.length} (siguen apuntando a su URL original, se pueden reintentar relanzando):`)
  failed.forEach((f) => console.log(`  - ${f.name}: ${f.error}`))
}

// sharp deja handles abiertos que hacen ruido al cerrar en Windows.
process.exit(failed.length ? 1 : 0)
