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
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        // Assets de Next.js — inmutables (el hash cambia con cada build)
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        // Íconos y manifest — cache 1 día
        source: "/(icons|favicon)(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=3600" },
        ],
      },
    ]
    // Nota: se eliminó el header `no-store` global de páginas HTML. Desactivaba el prefetch y el
    // Router Cache de Next (cada navegación era un ida-y-vuelta completo → sensación de lentitud
    // y "doble clic"). El caché del cliente se controla ahora con experimental.staleTimes.
  },
}

export default nextConfig;
