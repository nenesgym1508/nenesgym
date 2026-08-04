import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Cuando Cloudflare Image Resizing esté activo (ver src/lib/images.ts), la URL
    // que se pinta ya viene recortada al tamaño exacto desde el borde: dejar que
    // el optimizador de Vercel la procese otra vez seria pagar el mismo trabajo
    // dos veces, y es lo que agotó el cupo (error 402) en TodoAquiApp.
    //
    // Encender solo DESPUÉS de tener el dominio propio conectado al bucket: sin él
    // no hay quien redimensione y las miniaturas pasarían de ~1 KB a ~37 KB, con
    // cada visita pegándole directo a R2.
    unoptimized: process.env.NEXT_PUBLIC_R2_IMAGE_RESIZING === 'true',
    formats: ['image/avif', 'image/webp'],
    // Solo los orígenes que servimos de verdad. Antes había además
    // `{hostname: '*'}` para http y https: no llegaba a abrir el optimizador a
    // cualquier host (un `*` suelto solo casa un segmento, verificado con un
    // host externo → 400), pero era config muerta que daba la impresión contraria.
    // Único origen remoto: Cloudflare R2. El catálogo ya no depende de
    // raw.githubusercontent.com (migrado con scripts/migrate-exercise-images-to-r2.mjs).
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev', pathname: '/**' },
    ],
  },
  experimental: {
    // Reactiva el Router Cache del cliente para rutas dinámicas: al volver a una pantalla
    // ya visitada se reusa por 60s (navegación instantánea). Las páginas son force-dynamic
    // (render fresco en navegación real) y las mutaciones usan revalidatePath, así que sigue fresco.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  async headers() {
    return [
      // Nota: no se define Cache-Control para /_next/static. Next ya lo sirve
      // como immutable en producción, y declararlo a mano rompe el comportamiento
      // de desarrollo (avisa por consola en cada arranque).
      {
        // Íconos, manifest e imágenes estáticas — caché largo e inmutable en cliente
        source: "/(icons|favicon.ico|manifest.webmanifest|.*\\.webp|.*\\.png)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default nextConfig;
