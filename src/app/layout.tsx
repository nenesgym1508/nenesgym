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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${bebas.variable} h-full dark`}>
      <body className="h-full bg-background text-foreground antialiased">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  var removed = false;
                  for (var i = 0; i < registrations.length; i++) {
                    registrations[i].unregister();
                    removed = true;
                  }
                  if (removed) {
                    console.log('Stale Service Worker unregistered.');
                    setTimeout(function() { window.location.reload(); }, 150);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
