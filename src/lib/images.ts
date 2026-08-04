// Variantes pre-generadas de las imágenes de ejercicio.
//
// Al subir una imagen se guardan en R2 tres archivos en vez de uno: el original
// y dos versiones ya recortadas al tamaño en que se muestran. La lista de
// ejercicios pide directamente la miniatura de ~4 KB en vez de un original de
// ~37 KB que alguien tenga que encoger al vuelo.
//
// Por qué así y no redimensionando bajo demanda:
//   - El optimizador de Vercel cobra por transformación única y tiene cupo; es
//     lo que agotó TodoAquiApp y le devolvía 402.
//   - Cloudflare Image Resizing haría el mismo trabajo en el borde, pero es de
//     pago y exige un dominio propio conectado al bucket.
//   - Pre-generar no cuesta nada: el trabajo se hace una vez al subir, y las
//     variantes son archivos estáticos que cualquier CDN sirve. 116 imágenes ×
//     3 variantes ≈ 10 MB, sobre 10 GB gratuitos en R2.
//
// El precio a pagar: las variantes hay que borrarlas junto al original (lo hace
// deleteR2ImageIfUnused), y añadir un preset nuevo obliga a regenerar el
// histórico con scripts/generate-image-variants.mjs.
//
// La tabla de presets por uso está tomada del `resizingOptionsFor()` de
// TodoAquiApp: `cover` recorta al encuadre exacto, `scaleDown` nunca agranda ni
// recorta, solo limita el lado mayor.

export interface VariantSpec {
  /** Sufijo que se inserta antes de la extensión: foto.webp -> foto-thumb.webp */
  suffix: string
  width: number
  height?: number
  fit: "cover" | "scaleDown"
}

export const IMAGE_VARIANTS = {
  /** Miniatura de lista. Se muestra a ~40 px; 96 cubre pantallas retina. */
  thumbnail: { suffix: "-thumb", width: 96, height: 96, fit: "cover" },
  /** Cabecera del modal de detalle. */
  detail: { suffix: "-detail", width: 1024, fit: "scaleDown" },
} as const satisfies Record<string, VariantSpec>

export type ImagePreset = keyof typeof IMAGE_VARIANTS

/** `full` no es una variante: es el archivo original, sin sufijo. */
export type ImageSize = ImagePreset | "full"

const R2_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "")

/** Añade el sufijo de variante a una key o URL que termina en extensión. */
export function withVariantSuffix(pathOrUrl: string, suffix: string): string {
  return pathOrUrl.replace(/(\.[^./]+)$/, `${suffix}$1`)
}

/** Todas las keys derivadas de una original, para borrarlas juntas. */
export function variantKeysFor(key: string): string[] {
  return Object.values(IMAGE_VARIANTS).map((v) => withVariantSuffix(key, v.suffix))
}

/**
 * URL a pintar para una `media_url` de ejercicio.
 *
 * Devuelve la original tal cual si se pide `full`, si la imagen no vive en
 * nuestro bucket, o si no hay bucket configurado — en esos casos no hay
 * variantes que pedir. Quien la pinte debe caer de vuelta a la original si la
 * variante no existiera (imágenes subidas antes de este cambio).
 */
export function exerciseImageUrl(
  mediaUrl: string | null | undefined,
  size: ImageSize = "thumbnail"
): string | null {
  if (!mediaUrl) return null
  if (size === "full") return mediaUrl
  if (!R2_BASE || !mediaUrl.startsWith(`${R2_BASE}/`)) return mediaUrl
  return withVariantSuffix(mediaUrl, IMAGE_VARIANTS[size].suffix)
}
