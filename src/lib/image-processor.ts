const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]

/**
 * Límite del archivo ORIGINAL. Generoso a propósito: `processExerciseImage` lo
 * reescala a 1200px y lo recomprime antes de enviar nada, así que el tamaño de
 * partida casi da igual. El límite que de verdad manda es el del archivo ya
 * procesado (1 MB), validado en el servidor.
 */
export const MAX_ORIGINAL_SIZE = 30 * 1024 * 1024

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`
}

/**
 * Valida un archivo elegido por el usuario ANTES de abrir el recorte.
 *
 * Devuelve el motivo en lenguaje llano, no un código: el llamador debe pintarlo
 * junto al control de subida. Estaba duplicada en el formulario del admin y en
 * el del cliente, y en los dos el mensaje se pintaba al pie de un modal con
 * scroll — o sea, fuera de pantalla: el archivo se rechazaba y parecía que el
 * botón simplemente no hacía nada.
 */
export function validateImageFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    // Caso habitual: fotos HEIC/HEIF de iPhone. El navegador no sabe dibujarlas
    // en un canvas, así que no hay forma de recortarlas aquí.
    const isHeic = /heic|heif/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
    return {
      ok: false,
      message: isHeic
        ? "Las fotos de iPhone (HEIC) no se pueden procesar en el navegador. Compártela por WhatsApp o expórtala como JPG y vuelve a intentarlo."
        : `Formato no admitido${file.type ? ` (${file.type})` : ""}. Usa JPG, PNG o WebP.`,
    }
  }

  if (file.size > MAX_ORIGINAL_SIZE) {
    return {
      ok: false,
      message: `La foto pesa ${formatSize(file.size)} y el máximo son 30 MB. Elige una más ligera.`,
    }
  }

  return { ok: true }
}

/**
 * Helper para procesar imágenes de ejercicios en el cliente antes de la subida.
 * - Formatos originales permitidos: JPG, PNG, WebP (hasta 10 MB).
 * - Redimensiona proporcionalmente a máximo 1200px en el lado largo.
 * - Convierte a formato WebP (image/webp).
 * - Ajusta progresivamente la calidad para asegurar un peso objetivo entre 100-300 KB y NUNCA superior a 500 KB.
 */
export async function processExerciseImage(file: File): Promise<{ file: File; dataUrl: string }> {
  const MAX_ORIGINAL_SIZE = 10 * 1024 * 1024 // 10 MB
  if (file.size > MAX_ORIGINAL_SIZE) {
    throw new Error("La imagen seleccionada no puede superar los 10 MB.")
  }

  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Formato no permitido. Selecciona una imagen JPG, PNG o WebP.")
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de imagen seleccionada."))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("El archivo seleccionado no es una imagen válida."))
      img.onload = async () => {
        const MAX_DIMENSION = 1200
        let width = img.width
        let height = img.height

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width)
            width = MAX_DIMENSION
          } else {
            width = Math.round((width * MAX_DIMENSION) / height)
            height = MAX_DIMENSION
          }
        }

        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("No se pudo procesar el lienzo de la imagen."))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        let quality = 0.82
        let blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", quality))

        // Reducir calidad iterativamente si excede los 500 KB (512,000 bytes)
        while (blob && blob.size > 500 * 1024 && quality > 0.25) {
          quality -= 0.1
          blob = await new Promise((res) => canvas.toBlob(res, "image/webp", quality))
        }

        if (!blob || blob.size > 500 * 1024) {
          reject(new Error("La imagen procesada supera el límite máximo de 500 KB."))
          return
        }

        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")
        const fileName = `${cleanName || "ejercicio"}.webp`
        const processedFile = new File([blob], fileName, { type: "image/webp" })
        const dataUrl = canvas.toDataURL("image/webp", quality)

        resolve({ file: processedFile, dataUrl })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
