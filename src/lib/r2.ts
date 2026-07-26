import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

// Cliente para Cloudflare R2 (storage de imágenes/videos de ejercicios), compatible
// con la API de S3. Solo uso server-side — las credenciales nunca deben llegar al cliente.

function requiredEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Falta la variable de entorno ${name} (configuración de Cloudflare R2)`)
  return val
}

let client: S3Client | null = null

function getR2Client(): S3Client {
  if (client) return client
  client = new S3Client({
    region: "auto",
    endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  })
  return client
}

/** Sube un archivo a R2 y devuelve su URL pública (bajo NEXT_PUBLIC_R2_PUBLIC_URL). */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const bucket = requiredEnv("R2_BUCKET_NAME")
  await getR2Client().send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  )
  const publicUrl = requiredEnv("NEXT_PUBLIC_R2_PUBLIC_URL").replace(/\/$/, "")
  return `${publicUrl}/${key}`
}

/** Borra un archivo de R2 a partir de su key (ruta dentro del bucket). */
export async function deleteFromR2(key: string): Promise<void> {
  const bucket = requiredEnv("R2_BUCKET_NAME")
  await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

/** Extrae la key (ruta dentro del bucket) a partir de una URL pública de R2. */
export function r2KeyFromPublicUrl(url: string): string | null {
  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, "")
  if (!publicUrl || !url.startsWith(`${publicUrl}/`)) return null
  return url.slice(publicUrl.length + 1)
}
