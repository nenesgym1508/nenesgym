/**
 * Convierte PNG/JPG a WebP en /public.
 * Los iconos de PWA (icon-*.png) se saltan — el manifest los requiere en PNG.
 * Uso: npm run optimize-images
 */
import sharp from 'sharp'
import { readdir, stat, unlink } from 'fs/promises'
import { join, extname, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = join(__dirname, '..', 'public')

// Archivos que deben quedarse en PNG (PWA manifest los exige)
const SKIP = new Set(['icon-192.png', 'icon-512.png'])

async function processDir(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      await processDir(fullPath)
      continue
    }
    const ext = extname(entry.name).toLowerCase()
    if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue
    if (SKIP.has(entry.name)) {
      console.log(`  skip  ${entry.name}  (PWA icon)`)
      continue
    }

    const outName = basename(entry.name, ext) + '.webp'
    const outPath = join(dir, outName)

    const sizeBefore = (await stat(fullPath)).size
    await sharp(fullPath)
      .webp({ quality: 85, effort: 6 })
      .toFile(outPath)
    const sizeAfter = (await stat(outPath)).size
    const saved = ((1 - sizeAfter / sizeBefore) * 100).toFixed(1)

    console.log(
      `  ✓  ${entry.name.padEnd(24)} →  ${outName.padEnd(24)}` +
      `  ${(sizeBefore / 1024).toFixed(0)}KB → ${(sizeAfter / 1024).toFixed(0)}KB  (-${saved}%)`
    )

    await unlink(fullPath)
  }
}

console.log('Optimizando imágenes en /public...\n')
await processDir(PUBLIC_DIR)
console.log('\nListo.')
