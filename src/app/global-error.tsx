"use client"

// Última red de seguridad: errores de React que tumban toda la página (fuera del
// alcance de cualquier error.tsx local). Muestra una pantalla mínima para que el
// usuario no se quede con la pantalla en blanco y pueda recargar.
//
// Antes reportaba a Sentry, pero el SDK nunca tuvo un DSN configurado —ni en
// local ni en producción— así que no enviaba nada y costaba 466 KB de descarga
// a cada usuario. Se retiró por completo.
export default function GlobalError() {
  return (
    <html lang="es">
      <body style={{ background: "#09090b", color: "#e4e4e7", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "1.125rem", fontWeight: 700 }}>Algo salió mal</p>
          <p style={{ fontSize: "0.875rem", color: "#a1a1aa", maxWidth: "24rem" }}>
            Ocurrió un error inesperado. Intenta recargar la página.
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
