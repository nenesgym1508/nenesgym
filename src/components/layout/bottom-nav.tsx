"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CreditCard, QrCode, TrendingUp, User, Users, Dumbbell, ClipboardList, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"

export type NavItem = { href: string; label: string; icon: typeof Home; matchPrefixes?: string[] }

// Cliente: la acción central (Entrada) se renderiza elevada como FAB.
const clienteLeft: NavItem[] = [
  { href: ROUTES.CLIENTE_DASHBOARD, label: "Inicio", icon: Home },
  { href: ROUTES.CLIENTE_PAGOS, label: "Pagos", icon: CreditCard },
]
const clienteCenter: NavItem = { href: ROUTES.CLIENTE_ASISTENCIA, label: "Entrada", icon: QrCode }
const clienteRight: NavItem[] = [
  { href: ROUTES.CLIENTE_RUTINAS, label: "Rutinas", icon: ClipboardList },
  { href: ROUTES.CLIENTE_PROGRESO, label: "Progreso", icon: TrendingUp },
]

// Lista plana (para el sidebar de escritorio, sin FAB elevado)
export const clienteItems: NavItem[] = [clienteLeft[0]!, clienteLeft[1]!, clienteCenter, clienteRight[0]!, clienteRight[1]!]

export const adminItems: NavItem[] = [
  { href: ROUTES.ADMIN_DASHBOARD, label: "Panel", icon: Home },
  { href: ROUTES.ADMIN_CLIENTES, label: "Clientes", icon: Users },
  { href: ROUTES.ADMIN_PAGOS, label: "Pagos", icon: CreditCard },
  {
    href: ROUTES.ADMIN_ENTRENAMIENTO,
    label: "Entrenamiento",
    icon: Dumbbell,
    matchPrefixes: [ROUTES.ADMIN_CLASES, ROUTES.ADMIN_RUTINAS],
  },
  { href: ROUTES.ADMIN_MAS, label: "Más", icon: MoreHorizontal },
]

interface BottomNavProps {
  role: "client" | "admin"
}

export function useIsActive() {
  const pathname = usePathname()
  const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`)
  return (item: NavItem) => matches(item.href) || (item.matchPrefixes?.some(matches) ?? false)
}

function FlatTab({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, icon: Icon } = item
  const isPanel = label === "Panel"

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer",
        active ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {isPanel ? (
        <div
          className={cn(
            "size-6 rounded-full bg-zinc-950 flex items-center justify-center border transition-all overflow-hidden p-0.5 shadow-md",
            active 
              ? "border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.55)]" 
              : "border-white/10"
          )}
        >
          <img src="/logo-v3.webp" alt="Nenes Gym" className="size-full object-contain" />
        </div>
      ) : (
        <Icon className="size-5" strokeWidth={active ? 2.5 : 1.5} />
      )}
      <span className={cn("text-[10px] font-medium mt-0.5", active && "font-semibold")}>{label}</span>
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
            <FlatTab key={item.href} item={item} active={isActive(item)} />
          ))}
        </div>
      </nav>
    )
  }

  const centerActive = isActive(clienteCenter)
  const CenterIcon = clienteCenter.icon

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-zinc-950 shadow-[0_-1px_0_rgba(255,255,255,0.08)]">
      <div className="relative flex h-16 w-full items-center justify-between">
        {/* Lado izquierdo */}
        <div className="flex flex-1 justify-around items-center h-full">
          {clienteLeft.map((item) => (
            <FlatTab key={item.href} item={item} active={isActive(item)} />
          ))}
        </div>

        {/* Hueco para el FAB central */}
        <div className="flex flex-col items-center justify-end pb-1.5 h-full w-[72px] shrink-0">
          <span
            className={cn(
              "text-[10px] font-medium",
              centerActive ? "font-semibold text-red-500" : "text-zinc-500"
            )}
          >
            {clienteCenter.label}
          </span>
        </div>

        {/* Lado derecho */}
        <div className="flex flex-1 justify-around items-center h-full">
          {clienteRight.map((item) => (
            <FlatTab key={item.href} item={item} active={isActive(item)} />
          ))}
        </div>

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
