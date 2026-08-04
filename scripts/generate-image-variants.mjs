/**
 * Genera en R2 las variantes que faltan de las imágenes de ejercicio ya subidas.
 *
 * Desde que existen las variantes (ver src/lib/images.ts), `uploadExerciseImageAction`
 * las crea sola en cada subida nueva. Este script es para el histórico: las
 * imágenes que ya estaban en el bucket antes, y para regenerar todo si algún día
 * se cambia un preset o se añade uno nuevo.
 *
 * Es idempotente: salta las variantes que ya existen (HEAD previo), salvo que se
 * pase --force. No toca la base de datos — `media_url` sigue apuntando al
 * original y el sufijo de variante se calcula al pintar.
 *
 * Uso:
 *   node scripts/generate-image-variants.mjs            (simulacro)
 *   node scripts/generate-image-variants.mjs --apply
 *   node scripts/generate-image-variants.mjs --apply --force
 */
import sharp from 'sharp'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const envText = await readFile(join(ROOT, '.env.local'), 'utf8')
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
}

const BUCKET = process.env.R2_BUCKET_NAME
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

// Debe coincidir con IMAGE_VARIANTS en src/lib/images.ts. Se duplica a
// propósito: este script es .mjs suelto y no puede importar el TS del proyecto.
// Si se cambia allí, cambiar aquí y relanzar con --force.
const VARIANTS = [
  { suffix: '-thumb', width: 96, height: 96, fit: 'cover' },
  { suffix: '-detail', width: 1024, height: null, fit: 'scaleDown' },
]

const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const apply = process.argv.includes('--apply')
const force = process.argv.includes('--force')

const withSuffix = (key, suffix) => key.replace(/(\.[^./]+)$/, `${suffix}$1`)
const isVariant = (key) => VARIANTS.some((v) => key.includes(`${v.suffix}.`))

async function exists(key) {
  try {
    await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    return true
  } catch {
    return false
  }
}

async function getBuffer(key) {
  const res = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  return Buffer.from(await res.Body.transformToByteArray())
}

// ── Inventario ───────────────────────────────────────────────────────────────
let token
const all = []
do {
  const r = await r2.send(new ListObjectsV2Command({ Bucket: BUCKET, ContinuationToken: token }))
  ;(r.Contents || []).forEach((o) => all.push(o.Key))
  token = r.NextContinuationToken
} while (token)

const originals = all.filter((k) => !isVariant(k))

console.log(`Objetos en el bucket: ${all.length}`)
console.log(`Originales: ${originals.length} | variantes ya existentes: ${all.length - originals.length}`)
console.log(`Presets: ${VARIANTS.map((v) => v.suffix).join(', ')}\n`)

const work = []
for (const key of originals) {
  for (const v of VARIANTS) {
    const target = withSuffix(key, v.suffix)
    if (!force && (await exists(target))) continue
    work.push({ key, target, spec: v })
  }
}

console.log(`Variantes a generar: ${work.length}`)
if (!work.length) {
  console.log('Nada que hacer.')
  process.exit(0)
}
if (!apply) {
  console.log('\nSimulacro: no se ha subido nada. Relanza con --apply.')
  process.exit(0)
}

let ok = 0
let bytes = 0
const failed = []
const cache = new Map()

for (const [i, job] of work.entries()) {
  try {
    if (!cache.has(job.key)) cache.set(job.key, await getBuffer(job.key))
    const original = cache.get(job.key)

    const buffer = await sharp(original)
      .resize(job.spec.width, job.spec.height ?? undefined, {
        fit: job.spec.fit === 'cover' ? 'cover' : 'inside',
        withoutEnlargement: job.spec.fit !== 'cover',
      })
      .webp({ quality: 82 })
      .toBuffer()

    await r2.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: job.target,
      Body: buffer,
      ContentType: 'image/webp',
      CacheControl: CACHE_CONTROL,
    }))

    bytes += buffer.length
    ok++
    if ((i + 1) % 25 === 0 || i === work.length - 1) {
      console.log(`  ${i + 1}/${work.length}...`)
    }
  } catch (e) {
    failed.push({ key: job.target, error: e.message })
  }
}

console.log(`\nGeneradas ${ok}/${work.length} variantes (${(bytes / 1024 / 1024).toFixed(1)} MB añadidos).`)
if (failed.length) {
  console.log(`\nFallaron ${failed.length}:`)
  failed.forEach((f) => console.log(`  - ${f.key}: ${f.error}`))
}

process.exit(failed.length ? 1 : 0)
