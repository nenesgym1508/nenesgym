import * as Sentry from "@sentry/nextjs"

// Captura de errores del servidor (Server Components, Route Handlers, Server Actions).
// Sin dsn configurado, Sentry.init no envía nada — así que en local/desarrollo sin la
// variable de entorno esto queda en silencio y no falla.
export function register() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0,
  })
}

export const onRequestError = Sentry.captureRequestError
