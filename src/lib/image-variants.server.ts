// Solo servidor: importa sharp, que es binario nativo y no puede ir al cliente.
// El sufijo .server.ts lo deja explícito (no hay paquete `server-only` en este
// proyecto). Los consumidores son server actions y scripts.
import sharp from "sharp"
import { IMAGE_VARIANTS, withVariantSuffix, type VariantSpec } from "@/lib/images"
import { uploadToR2 } from "@/lib/r2"

/**
 * Genera y sube a R2 las variantes de una imagen ya subida.
 *
 * Se llama DESPUÉS de subir el original, con su misma key. Si una variante
 * falla no se aborta la subida: la imagen principal ya está guardada y quien la
 * pinte cae de vuelta al original. Se devuelven los fallos por si el llamador
 * quiere registrarlos.
 */
export async function generateAndUploadVariants(
  originalKey: string,
  original: Buffer
): Promise<{ uploaded: string[]; failed: { key: string; error: string }[] }> {
  const uploaded: string[] = []
  const failed: { key: string; error: string }[] = []

  for (const spec of Object.values(IMAGE_VARIANTS) as VariantSpec[]) {
    const key = withVariantSuffix(originalKey, spec.suffix)
    try {
      const buffer = await resizeToVariant(original, spec)
      await uploadToR2(key, buffer, "image/webp")
      uploaded.push(key)
    } catch (e) {
      failed.push({ key, error: e instanceof Error ? e.message : "error desconocido" })
    }
  }

  return { uploaded, failed }
}

export function resizeToVariant(original: Buffer, spec: VariantSpec): Promise<Buffer> {
  return sharp(original)
    .resize(spec.width, spec.height, {
      // `cover` recorta al encuadre exacto; `scaleDown` (inside + sin agrandar)
      // solo limita el lado mayor, nunca recorta ni estira.
      fit: spec.fit === "cover" ? "cover" : "inside",
      withoutEnlargement: spec.fit !== "cover",
    })
    .webp({ quality: 82 })
    .toBuffer()
}
