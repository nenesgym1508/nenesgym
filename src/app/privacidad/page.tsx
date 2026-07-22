import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck, ChevronLeft, Lock, FileText, Mail, Phone, MapPin, Globe } from "lucide-react"

export const metadata: Metadata = {
  title: "Política de Privacidad | Nene's Gym",
  description: "Política de privacidad y protección de datos personales de Nene's Gym en Amalfi, Antioquia. Conoce cómo tratamos y protegemos tu información.",
  alternates: {
    canonical: "https://nenesgym.com/privacidad",
  },
  openGraph: {
    title: "Política de Privacidad | Nene's Gym",
    description: "Política de privacidad y protección de datos personales de Nene's Gym en Amalfi, Antioquia.",
    url: "https://nenesgym.com/privacidad",
    siteName: "Nene's Gym",
    locale: "es_CO",
    type: "website",
  },
}

export default function PrivacidadPage() {
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
        "@id": "https://nenesgym.com/privacidad/#breadcrumb",
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
            "name": "Política de Privacidad",
            "item": "https://nenesgym.com/privacidad"
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
            <ShieldCheck className="size-4" />
            Protección de Datos Personales
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Política de Privacidad
          </h1>
          <p className="text-sm text-zinc-400">
            Última actualización: 22 de julio de 2026. Conforme a la Ley 1581 de 2012 y normativas de protección de datos.
          </p>
        </div>

        {/* Content Sections */}
        <div className="mt-8 space-y-8 text-sm leading-relaxed text-zinc-300">
          
          <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <Lock className="size-5 text-red-500" />
              1. Identificación del Responsable del Tratamiento
            </h2>
            <p>
              <strong>Nene's Gym</strong>, con domicilio en el municipio de <strong>Amalfi, Antioquia, Colombia</strong>, en calidad de responsable del tratamiento de datos personales, informa a sus usuarios, clientes y visitantes sobre su política de privacidad y manejo de información recabada a través de nuestro sitio web oficial <strong className="text-red-400">nenesgym.com</strong> y nuestras aplicaciones vinculadas.
            </p>
            <ul className="space-y-2 pt-2 text-zinc-400">
              <li className="flex items-center gap-2">
                <MapPin className="size-4 text-red-500 shrink-0" />
                <span><strong>Ubicación:</strong> Amalfi, Antioquia, Colombia</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-4 text-red-500 shrink-0" />
                <span><strong>Teléfono / WhatsApp de atención:</strong> +57 323 482 6146</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-red-500 shrink-0" />
                <span><strong>Dominio web oficial:</strong> https://nenesgym.com</span>
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">2. Información que Recopilamos</h2>
            <p>
              Recopilamos la información estrictamente necesaria para brindarte un servicio óptimo en nuestras instalaciones y plataforma digital:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
              <li><strong>Datos de Identificación:</strong> Nombre completo, correo electrónico, número de teléfono o celular y fotografía de perfil.</li>
              <li><strong>Datos de Autenticación OAuth 2.0:</strong> Cuando inicias sesión mediante proveedores de terceros (como Google u otros servicios de OAuth 2.0), recibimos tu nombre, dirección de correo electrónico validada y tu foto de perfil pública para autenticar tu cuenta de forma segura.</li>
              <li><strong>Datos de Membresía y Asistencia:</strong> Registro de pagos de suscripción, fechas de vencimiento de planes y registro de ingreso/asistencia física al gimnasio.</li>
              <li><strong>Datos de Progreso Físico:</strong> Opcionalmente, registros de peso corporal, medidas y avance en rutinas de entrenamiento cargadas por ti o por los entrenadores autorizados.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">3. Finalidad del Tratamiento de Datos</h2>
            <p>
              Tus datos personales son tratados con las siguientes finalidades explícitas e inherentes a nuestro servicio de acondicionamiento físico:
            </p>
            <ol className="list-decimal list-inside space-y-1.5 pl-2 text-zinc-400">
              <li>Gestionar tu cuenta de usuario, membresía activa y acceso a las instalaciones de Nene's Gym.</li>
              <li>Permitir el inicio de sesión único y seguro mediante inicio de sesión con Google u OAuth 2.0.</li>
              <li>Enviar notificaciones y recordatorios sobre el estado de tu suscripción, horarios de atención y rutinas personalizadas.</li>
              <li>Mantener el registro de asistencia diaria y estadísticas de entrenamiento del cliente.</li>
              <li>Cumplir con las obligaciones legales y contables aplicables en la República de Colombia.</li>
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">4. Uso de Credenciales OAuth 2.0 y Servicios de Terceros</h2>
            <p>
              Nene's Gym integra servicios de autenticación mediante estándares de industria como <strong>OAuth 2.0 (Google Sign-In / Supabase Auth)</strong>:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
              <li><strong>Uso exclusivo:</strong> Únicamente solicitamos los permisos básicos (`email`, `profile`, `openid`). No accedemos a tus contactos, correos privados, archivos ni almacenamiento en la nube de Google.</li>
              <li><strong>No venta de datos:</strong> No vendemos, alquilamos ni comercializamos tu información personal con anunciantes o terceros para fines publicitarios.</li>
              <li><strong>Almacenamiento Seguro:</strong> Tus credenciales se procesan utilizando protocolos cifrados HTTPS/TLS y almacenamiento seguro con políticas de control de acceso estricto (Row Level Security).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">5. Derechos de los Titulares (Habeas Data)</h2>
            <p>
              De conformidad con la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia, como titular de los datos tienes derecho a:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-400">
              <li>Conocer, actualizar y rectificar tus datos personales en cualquier momento.</li>
              <li>Solicitar la supresión de tus datos de nuestras bases de datos cuando consideres que no se están tratando conforme a la ley.</li>
              <li>Revocar la autorización otorgada para el tratamiento de tus datos personales o desconectar el inicio de sesión OAuth desde la configuración de tu cuenta de Google.</li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a las leyes de protección de datos.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-100">6. Seguridad de la Información</h2>
            <p>
              Implementamos medidas administrativas, técnicas y físicas avanzadas para proteger tus datos contra acceso no autorizado, alteración, divulgación o destrucción. La transferencia de información en <strong>nenesgym.com</strong> se realiza mediante conexiones SSL/TLS cifradas de extremo a extremo.
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-white/5 bg-zinc-900/50 p-5 sm:p-6 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              <FileText className="size-5 text-red-500" />
              7. Contacto para Ejercicio de Derechos ARCO
            </h2>
            <p>
              Si deseas ejercer tus derechos de actualización, rectificación o eliminación de datos personales, o si tienes dudas sobre nuestra política de privacidad, puedes contactarnos directamente:
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
            <Link href="/terminos" className="hover:text-zinc-300 underline underline-offset-4">Términos de Servicio</Link>
            <Link href="/login" className="hover:text-zinc-300 underline underline-offset-4">Iniciar Sesión</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
