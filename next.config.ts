import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
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
        hostname: '*.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  experimental: {
    // Reactiva el Router Cache del cliente para rutas dinámicas: al volver a una pantalla
    // ya visitada se reusa por ~30s (navegación instantánea). Las páginas son force-dynamic
    // (render fresco en navegación real) y las mutaciones usan revalidatePath, así que sigue fresco.
    staleTimes: {
      dynamic: 30,
      static: 180,
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
