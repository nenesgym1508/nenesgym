import * as Sentry from "@sentry/nextjs"

// Captura de errores del navegador (componentes cliente, errores no atrapados).
// Sin dsn configurado, Sentry.init no envía nada.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0,
})
