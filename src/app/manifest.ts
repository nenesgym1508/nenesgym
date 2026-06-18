import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NENE'S GYM",
    short_name: "NenesGym",
    description: "Sistema de gestión para NENE'S GYM",
    start_url: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#dc2626",
    orientation: "portrait",
    categories: ["fitness", "health"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [],
  }
}
