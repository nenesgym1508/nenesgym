"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

// Última red de seguridad: errores de React que tumban toda la página (fuera del
// alcance de cualquier error.tsx local). Reporta a Sentry y muestra una pantalla
// mínima para no dejar al usuario con una pantalla en blanco.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ background: "#09090b", color: "#e4e4e7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 700 }}>Algo salió mal</p>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", maxWidth: "24rem" }}>
            Ocurrió un error inesperado. Ya quedó registrado — intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ borderRadius: "0.75rem", background: "#dc2626", color: "#fff", padding: "0.625rem 1.5rem", fontSize: "0.875rem", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Recargar
          </button>
        </div>
      </body>
    </html>
  )
}
