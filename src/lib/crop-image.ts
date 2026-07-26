export interface CropPixels {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error("No se pudo cargar la imagen para recortarla."))
    img.src = src
  })
}

/**
 * Recorta `imageSrc` según el área en píxeles que devuelve react-easy-crop
 * (`onCropComplete`) y devuelve un File WebP con el resultado.
 */
export async function cropImageToFile(
  imageSrc: string,
  crop: CropPixels,
  fileName = "recorte.webp"
): Promise<File> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("No se pudo procesar el lienzo del recorte.")

  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/webp", 0.92))
  if (!blob) throw new Error("No se pudo generar la imagen recortada.")
  return new File([blob], fileName, { type: "image/webp" })
}
