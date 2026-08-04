// Resolución de URLs de imagen del catálogo.
//
// Hay dos formas de servir una imagen de R2, y cuál se usa depende de una sola
// variable de entorno:
//
//   NEXT_PUBLIC_R2_IMAGE_RESIZING = "false"  (hoy)
//     Se devuelve la URL cruda y el optimizador de Next/Vercel se encarga del
//     redimensionado. Funciona sobre cualquier host, incluida la URL de
//     desarrollo pub-*.r2.dev.
//
//   NEXT_PUBLIC_R2_IMAGE_RESIZING = "true"   (tras conectar el dominio propio)
//     Se construye una URL de Cloudflare Image Resizing y el redimensionado lo
//     hace Cloudflare en el borde. Requiere DOS cosas, las dos obligatorias:
//       1. Que NEXT_PUBLIC_R2_PUBLIC_URL sea un dominio propio conectado al
//          bucket. La ruta /cdn-cgi/image/ NO existe en pub-*.r2.dev.
//       2. Que el plan de Cloudflare incluya Image Resizing (es de pago).
//     Al activarlo hay que poner además `unoptimized: true` en next.config.ts,
//     si no se pagan las dos transformaciones.
//
// El patrón (interruptor por env var, con el proveedor viejo como red de
// seguridad) está copiado de TodoAquiApp, que ya hizo este mismo camino.

const R2_BASE = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "")

export const IMAGE_RESIZING_ENABLED = process.env.NEXT_PUBLIC_R2_IMAGE_RESIZING === "true"

/**
 * Presets por uso. `cover` recorta al encuadre exacto; `scale-down` nunca
 * agranda ni recorta, solo limita el lado mayor.
 */
const PRESETS = {
  /** Miniatura de lista (~40 px en pantalla, x2 para retina). */
  thumbnail: "width=96,height=96,fit=cover",
  /** Imagen de cabecera del modal de detalle. */
  detail: "width=1024,fit=scale-down",
  /** Original acotado, para el recorte. */
  full: "width=1600,fit=scale-down",
} as const

export type ImagePreset = keyof typeof PRESETS

/**
 * Devuelve la URL a pintar para una `media_url` de ejercicio.
 *
 * Si el redimensionado en el borde está apagado, o la imagen no vive en nuestro
 * bucket, devuelve la URL tal cual: quien optimice será Next.
 */
export function exerciseImageUrl(
  mediaUrl: string | null | undefined,
  preset: ImagePreset = "thumbnail"
): string | null {
  if (!mediaUrl) return null
  if (!IMAGE_RESIZING_ENABLED) return mediaUrl
  if (!R2_BASE || !mediaUrl.startsWith(`${R2_BASE}/`)) return mediaUrl

  const key = mediaUrl.slice(R2_BASE.length + 1)
  return `${R2_BASE}/cdn-cgi/image/${PRESETS[preset]},format=auto,quality=auto/${key}`
}
