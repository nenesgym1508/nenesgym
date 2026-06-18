"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CreditCard, QrCode, TrendingUp, Users, ClipboardList, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"

const clienteItems = [
  { href: ROUTES.CLIENTE_DASHBOARD, label: "Inicio", icon: Home },
  { href: ROUTES.CLIENTE_PAGOS, label: "Pagos", icon: CreditCard },
  { href: ROUTES.CLIENTE_ASISTENCIA, label: "Ingreso", icon: QrCode },
  { href: ROUTES.CLIENTE_PROGRESO, label: "Progreso", icon: TrendingUp },
]

const adminItems = [
  { href: ROUTES.ADMIN_DASHBOARD, label: "Inicio", icon: Home },
  { href: ROUTES.ADMIN_CLIENTES, label: "Clientes", icon: Users },
  { href: ROUTES.ADMIN_PAGOS, label: "Pagos", icon: CreditCard },
  { href: ROUTES.ADMIN_ASISTENCIAS, label: "Asistencias", icon: ClipboardList },
  { href: ROUTES.ADMIN_PERFIL, label: "Perfil", icon: Settings },
]

interface BottomNavProps {
  role: "client" | "admin"
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const items = role === "admin" ? adminItems : clienteItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-zinc-900/95 backdrop-blur-md">
      <div className="flex h-16">
        {items.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/")
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
                isActive ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
