"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CreditCard, QrCode, TrendingUp, User, Users, Dumbbell, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"

type NavItem = { href: string; label: string; icon: typeof Home }

// Cliente: la acción central (Entrada) se renderiza elevada como FAB.
const clienteLeft: NavItem[] = [
  { href: ROUTES.CLIENTE_DASHBOARD, label: "Inicio", icon: Home },
  { href: ROUTES.CLIENTE_PAGOS, label: "Pagos", icon: CreditCard },
]
const clienteCenter: NavItem = { href: ROUTES.CLIENTE_ASISTENCIA, label: "Entrada", icon: QrCode }
const clienteRight: NavItem[] = [
  { href: ROUTES.CLIENTE_PROGRESO, label: "Progreso", icon: TrendingUp },
  { href: ROUTES.CLIENTE_PERFIL, label: "Perfil", icon: User },
]

const adminItems: NavItem[] = [
  { href: ROUTES.ADMIN_DASHBOARD, label: "Panel", icon: Home },
  { href: ROUTES.ADMIN_CLIENTES, label: "Clientes", icon: Users },
  { href: ROUTES.ADMIN_PAGOS, label: "Pagos", icon: CreditCard },
  { href: ROUTES.ADMIN_CLASES, label: "Clases", icon: Dumbbell },
  { href: ROUTES.ADMIN_MAS, label: "Más", icon: MoreHorizontal },
]

interface BottomNavProps {
  role: "client" | "admin"
}

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(href + "/")
}

function FlatTab({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon } = item
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.5 : 1.5} />
      <span className={cn("text-[10px] font-medium", active && "font-semibold")}>{label}</span>
    </Link>
  )
}

export function BottomNav({ role }: BottomNavProps) {
  const isActive = useIsActive()

  if (role === "admin") {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-zinc-950 shadow-[0_-1px_0_rgba(255,255,255,0.08)]">
        <div className="flex h-16">
          {adminItems.map((item) => (
            <FlatTab key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>
    )
  }

  const centerActive = isActive(clienteCenter.href)
  const CenterIcon = clienteCenter.icon

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-zinc-950 shadow-[0_-1px_0_rgba(255,255,255,0.08)]">
      <div className="relative flex h-16">
        {clienteLeft.map((item) => (
          <FlatTab key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {/* Hueco para el FAB central */}
        <div className="flex flex-1 flex-col items-center justify-end pb-1.5">
          <span
            className={cn(
              "text-[10px] font-medium",
              centerActive ? "font-semibold text-red-500" : "text-zinc-500"
            )}
          >
            {clienteCenter.label}
          </span>
        </div>

        {clienteRight.map((item) => (
          <FlatTab key={item.href} item={item} active={isActive(item.href)} />
        ))}

        {/* FAB Entrada — acción central y más repetida */}
        <Link
          href={clienteCenter.href}
          aria-label={clienteCenter.label}
          className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2"
        >
          <span
            className={cn(
              "flex size-14 items-center justify-center rounded-full border-4 border-zinc-900 bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700",
              centerActive && "ring-2 ring-red-400/60"
            )}
            style={{ boxShadow: "0 6px 20px var(--primary-glow)" }}
          >
            <CenterIcon className="size-6" strokeWidth={2.25} />
          </span>
        </Link>
      </div>
    </nav>
  )
}
