import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthBackground } from "@/components/layout/auth-background"
import { ROUTES } from "@/constants/routes"

export default async function BienvenidaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    redirect(profile?.role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.CLIENTE_DASHBOARD)
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950">
      <AuthBackground />
      {/* Glow de marca detrás del logo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 50% at 50% 26%, rgba(220,38,38,0.28) 0%, rgba(220,38,38,0.06) 38%, transparent 68%)",
        }}
      />

      {/* Hero */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pt-16 text-center">
        <Image
          src="/logo-v3.webp"
          alt="NENE'S GYM"
          width={224}
          height={224}
          priority
          className="h-56 w-56 object-contain drop-shadow-[0_15px_40px_rgba(220,38,38,0.45)] transition-transform duration-700 hover:scale-105"
        />
        <h1
          className="mt-6 text-5xl sm:text-7xl tracking-wider uppercase font-black whitespace-nowrap drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]"
          style={{
            fontFamily: 'var(--font-bebas), Impact, sans-serif',
            background: 'radial-gradient(ellipse at center, #ffffff 30%, #a1a1aa 70%, #52525b 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          NENE&apos;S GYM
        </h1>
      </div>

      {/* Acciones */}
      <div className="relative space-y-3 px-6 pb-10">
        <Link
          href={ROUTES.LOGIN}
          className="flex h-14 items-center justify-center rounded-2xl bg-red-600 text-base font-semibold text-white shadow-lg transition-colors hover:bg-red-700"
        >
          Iniciar sesión
        </Link>
        <Link
          href={ROUTES.REGISTER}
          className="flex h-14 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] text-base font-semibold text-zinc-100 transition-colors hover:border-white/30"
        >
          Crear cuenta
        </Link>
        <Link
          href={ROUTES.LOGIN}
          className="flex h-12 items-center justify-center text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-200"
        >
          Continuar como invitado
        </Link>
        <p className="pt-2 text-center text-xs text-zinc-600">
          Construye fuerza. Construye confianza. Construye tu mejor versión.
        </p>
      </div>
    </main>
  )
}
