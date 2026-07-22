import type { Metadata } from "next"
import Link from "next/link"
import { FileText, ChevronLeft, Scale, Shield, Phone, MapPin, Globe } from "lucide-react"

export const metadata: Metadata = {
  title: "Términos y Condiciones de Servicio | Nene's Gym",
  description: "Términos de servicio y condiciones de uso del sitio web nenesgym.com y servicios de gimnasio de Nene's Gym en Amalfi, Antioquia.",
  alternates: {
    canonical: "https://nenesgym.com/terminos",
  },
  openGraph: {
    title: "Términos y Condiciones de Servicio | Nene's Gym",
    description: "Términos de servicio y condiciones de uso del gimnasio Nene's Gym en Amalfi, Antioquia.",
    url: "https://nenesgym.com/terminos",
    siteName: "Nene's Gym",
    locale: "es_CO",
    type: "website",
  },
}

export default function TerminosPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://nenesgym.com/#website",
        "url": "https://nenesgym.com",
        "name": "Nene's Gym",
        "description": "Gimnasio y centro de entrenamiento en Amalfi, Antioquia",
        "inLanguage": "es-CO"
      },
      {
        "@type": "Organization",
        "@id": "https://nenesgym.com/#organization",
        "name": "Nene's Gym",
        "url": "https://nenesgym.com",
        "logo": "https://nenesgym.com/logo-v3.webp",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Amalfi",
          "addressRegion": "Antioquia",
          "addressCountry": "CO"
        },
        "telephone": "+573234826146"
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://nenesgym.com/terminos/#breadcrumb",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Inicio",
            "item": "https://nenesgym.com"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Términos y Condiciones",
            "item": "https://nenesgym.com/terminos"
          }
        ]
      }
    ]
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-red-500 selection:text-white pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/login"
            className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <ChevronLeft className="size-4" />
            Volver al Inicio
          </Link>
          <span className="text-xs font-bold tracking-wider text-red-500 uppercase">Nene's Gym Legal</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 pt-8 sm:pt-12">
        {/* Title Badge & Heading */}
        <div className="space-y-3 border-b border-white/10 pb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-semibold text-red-400">
            <Scale className="size-4" />
            Condiciones Legales de Uso
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Términos y Condiciones de Servicio
          </h1>
          <p className="text-sm text-zinc-400">
            Última actualización: 22 de julio de 2026. Aplicable para el sitio web nenesgym.com y servicios presenciales en Amalfi, Antioquia.
          </p>
        </div>

        {/* Content Sections */}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-300">

          <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="size-5 text-red-500" />
              1. Aceptación de los Términos
            </h2>
            <p>
              Al acceder, registrarte o utilizar la plataforma digital <strong>nenesgym.com</strong> o contratar nuestros servicios físicos de entrenamiento en el gimnasio <strong>Nene's Gym</strong> (ubicado en Amalfi, Antioquia), aceptas expresamente regirte por los presentes Términos y Condiciones y nuestra <Link href="/privacidad" className="text-red-400 hover:underline font-semibold">Política de Privacidad</Link>.
            </p>
            <p className="text-xs text-zinc-400 pt-1">
              Si no estás de acuerdo con alguno de estos términos, te solicitamos abstenerte de utilizar nuestros servicios digitales o instalaciones.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">2. Descripción de los Servicios</h2>
            <p>
              Nene's Gym presta servicios de acondicionamiento físico, entrenamiento deportivo, clases grupales y seguimiento de miembros tanto en sus instalaciones físicas en Amalfi, Antioquia, como a través de su plataforma en línea. Los servicios digitales incluyen:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
              <li>Gestión de perfil y membresías activas.</li>
              <li>Acceso y control de asistencias diarias mediante código o registro digital.</li>
              <li>Consulta de rutinas personalizadas creadas por nuestros entrenadores.</li>
              <li>Registro y seguimiento de avances y medidas corporales.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">3. Registro de Cuenta y Autenticación con OAuth 2.0</h2>
            <p>
              Para acceder a las funcionalidades del sistema, el usuario debe crear una cuenta directamente o autenticarse mediante proveedores externos autorizados (como Google u OAuth 2.0):
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
              <li>El usuario se compromete a proporcionar información veraz, actualizada y completa.</li>
              <li>Es responsabilidad exclusiva del usuario mantener la confidencialidad de sus credenciales de acceso.</li>
              <li>Nene's Gym no se hace responsable por el uso no autorizado de cuentas derivado de la negligencia en el cuidado de contraseñas por parte del usuario.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">4. Pagos, Membresías y Cancelaciones</h2>
            <p>
              Los planes y membresías contratados en Nene's Gym están sujetos a las siguientes normas:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
              <li><strong>Vigencia:</strong> Las membresías (mensuales, quincenales, tiquetera de días o personalizadas) son personales e intransferibles.</li>
              <li><strong>Pagos:</strong> Los valores cobrados corresponden a la tarifa acordada al momento de la compra en la sede o plataforma.</li>
              <li><strong>Renovación:</strong> El acceso a los servicios de entrenamiento presencial y digital dependerá de contar con una suscripción activa y al día en pagos.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">5. Uso Aceptable e Instalaciones</h2>
            <p>
              Al hacer uso del sitio web o de las instalaciones del gimnasio en Amalfi, los usuarios se comprometen a mantener una conducta respetuosa con el personal y demás afiliados, a cuidar los equipos de entrenamiento y a acatar el reglamento interno del gimnasio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">6. Propiedad Intelectual</h2>
            <p>
              Todos los contenidos, logos, marcas registradas, diseños de la aplicación, gráficos y código fuente de <strong>nenesgym.com</strong> son propiedad exclusiva de Nene's Gym. Queda estrictamente prohibida su reproducción, distribución o modificación sin autorización previa y por escrito.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">7. Modificaciones a los Términos</h2>
            <p>
              Nene's Gym se reserva el derecho de modificar o actualizar estos Términos y Condiciones en cualquier momento para reflejar cambios legislativos, operativos o de servicio. Publicaremos cualquier versión actualizada en <strong className="text-red-400">nenesgym.com/terminos</strong> indicando la fecha de última revisión.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Shield className="size-5 text-red-500" />
              8. Canales de Atención y Soporte
            </h2>
            <p>
              Para cualquier consulta o reclamación relacionada con nuestros términos de servicio o la plataforma, puedes comunicarte con nosotros:
            </p>
            <div className="pt-2 text-zinc-300 space-y-2">
              <p className="font-semibold text-zinc-100">Nene's Gym Amalfi</p>
              <div className="flex items-center gap-2 text-zinc-400">
                <MapPin className="size-4 text-red-500 shrink-0" />
                <span>Amalfi, Antioquia, Colombia</span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Phone className="size-4 text-red-500 shrink-0" />
                <span>WhatsApp / Celular: <a href="https://wa.me/573234826146" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">323 482 6146</a></span>
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Globe className="size-4 text-red-500 shrink-0" />
                <span>Sitio Web: <Link href="/" className="text-red-400 hover:underline">nenesgym.com</Link></span>
              </div>
            </div>
          </section>

        </div>

        {/* Bottom Navigation */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} Nene's Gym. Todos los derechos reservados. Amalfi, Antioquia.</p>
          <div className="flex gap-4">
            <Link href="/privacidad" className="hover:text-zinc-300 underline underline-offset-4">Política de Privacidad</Link>
            <Link href="/login" className="hover:text-zinc-300 underline underline-offset-4">Iniciar Sesión</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
