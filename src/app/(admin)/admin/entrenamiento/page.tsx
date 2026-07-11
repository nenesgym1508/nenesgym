import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, ClipboardList, Dumbbell, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/layout/page-header"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

const items = [
  {
    href: ROUTES.ADMIN_CLASES,
    icon: CalendarDays,
    title: "Clases",
    description: "Prepara la clase de hoy o mañana.",
  },
  {
    href: ROUTES.ADMIN_RUTINAS,
    icon: ClipboardList,
    title: "Rutinas",
    description: "Asigna rutinas a clientes.",
  },
  {
    href: ROUTES.ADMIN_CLASES_EJERCICIOS,
    icon: Dumbbell,
    title: "Ejercicios",
    description: "Gestiona la biblioteca de ejercicios.",
  },
] as const

export default async function AdminEntrenamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  return (
    <div className="pb-24">
      <PageHeader title="Entrenamiento" showLogout />
      <div className="p-4 space-y-3">
        {items.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 hover:bg-zinc-800/60 transition-colors"
          >
            <Icon className="size-5 text-zinc-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">{title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
            </div>
            <ChevronRight className="size-4 text-zinc-600 shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
