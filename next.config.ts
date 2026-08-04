import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El optimizador se deja ACTIVO, pero ya no lo usa nada que crezca con el
    // contenido: las imágenes de ejercicio pasan `unoptimized` y piden su
    // variante pre-generada en R2 (ver src/lib/images.ts).
    //
    // Lo que sigue optimizándose son los ~8 assets de /public (logo, hero,
    // banner). El cupo de Vercel se cuenta por imagen origen única, así que un
    // conjunto fijo de 8 genera 8 transformaciones una sola vez y nunca puede
    // agotar nada — a diferencia del catálogo de ejercicios, que sí crece. Y
    // apagarlo también para ellas solo conseguiría servir el hero de 75 KB sin
    // encoger en la portada.
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
