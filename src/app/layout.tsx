import type { Metadata, Viewport } from 'next'
import { Geist, Bebas_Neue } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })

export const metadata: Metadata = {
  title: "NENE'S GYM",
  description: 'Sistema de gestión para NENE\'S GYM',
  applicationName: "NENE'S GYM",
  // El link <link rel="manifest"> lo inyecta automáticamente app/manifest.ts (/manifest.webmanifest).
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-512.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "NENE'S GYM",
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${bebas.variable} h-full dark`}>
      <body className="h-full bg-background text-foreground antialiased overflow-x-clip">
        {children}
        {/*
          Limpieza de Service Workers viejos (quedaron instalados en teléfonos
          reales durante las pruebas del modo offline, que se revirtió).

          La versión anterior de este script provocaba BUCLES DE RECARGA: no
          esperaba a la promesa de unregister() y recargaba a los 150 ms. Pero
          desregistrar un worker que está controlando la página no surte efecto
          hasta que deja de controlarla, así que al recargar seguía apareciendo
          en getRegistrations() → volvía a recargar → y así indefinidamente. Es
          el "se queda cargando y toca cerrar y volver a abrir".

          Ahora: se espera a los unregister, se borran también las cachés que el
          worker dejó (sobreviven al desregistro), y la recarga ocurre COMO
          MUCHO UNA VEZ por pestaña gracias al centinela en sessionStorage —
          que es lo que hace imposible el bucle aunque algo falle.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
                var FLAG = 'sw-cleanup-done';
                if (sessionStorage.getItem(FLAG)) return;

                navigator.serviceWorker.getRegistrations().then(function (regs) {
                  if (!regs.length) { sessionStorage.setItem(FLAG, '1'); return; }
                  return Promise.all(regs.map(function (r) { return r.unregister(); }))
                    .then(function () {
                      return window.caches ? caches.keys().then(function (keys) {
                        return Promise.all(keys.map(function (k) { return caches.delete(k); }));
                      }) : null;
                    })
                    .then(function () {
                      sessionStorage.setItem(FLAG, '1');
                      window.location.reload();
                    });
                }).catch(function () { sessionStorage.setItem(FLAG, '1'); });
              })();
            `,
          }}
        />
      </body>
    </html>
  )
}
