import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-5e1d912ef2bd446cb76d60013bb0240b.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'nqhkfqoroisszycdxwuy.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
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
      {
        // Assets de Next.js — inmutables
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
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
