import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  // Protección contra "version skew": que a un usuario le queden mezclados
  // archivos de un despliegue viejo con respuestas del nuevo.
  //
  // Con esto Next cuelga el id del despliegue de cada asset (?dpl=...) y lo
  // manda en las cabeceras de navegación. Si el cliente detecta que su id no
  // coincide con el del servidor, hace una recarga completa en vez de una
  // navegación de cliente — o sea, el usuario pasa a la versión nueva solo,
  // sin tener que pulsar Ctrl+Shift+R.
  //
  // Sin esto, una pestaña abierta durante un deploy sigue ejecutando el
  // JavaScript viejo contra el servidor nuevo hasta que alguien recargue a
  // mano. Es lo que provocó el error de hidratación de esta sesión.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA,
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
    //
    // En desarrollo se desactiva (0): con el caché activo, editar un componente
    // y volver a la pantalla te servía la versión anterior desde el caché del
    // router, dando la impresión de que el cambio "no se aplicó".
    // (`static` no admite 0: Next exige un mínimo de 30.)
    staleTimes: isDev
      ? { dynamic: 0, static: 30 }
      : { dynamic: 60, static: 300 },
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
