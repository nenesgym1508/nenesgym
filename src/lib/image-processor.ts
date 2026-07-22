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
