"use client"

import Link from "next/link"
import { useLinkStatus } from "next/link"
import { usePathname } from "next/navigation"
import { Home, CreditCard, LogIn, TrendingUp, Users, Dumbbell, ClipboardList, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"

export type NavItem = { href: string; label: string; icon: typeof Home; matchPrefixes?: string[] }

// Cliente: la acción central (Entrada) se renderiza elevada como FAB.
const clienteLeft: NavItem[] = [
  { href: ROUTES.CLIENTE_DASHBOARD, label: "Inicio", icon: Home },
  { href: ROUTES.CLIENTE_PAGOS, label: "Pagos", icon: CreditCard },
]
const clienteCenter: NavItem = { href: ROUTES.CLIENTE_ASISTENCIA, label: "Entrada", icon: LogIn }
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
  const { href } = item

  return (
    <Link href={href} className="flex flex-1 flex-col items-center justify-center gap-0.5 cursor-pointer">
      <FlatTabContent item={item} active={active} />
    </Link>
  )
}

// Hijo del <Link> para poder leer el estado pending de la navegación (useLinkStatus).
// Muestra el color activo al instante del toque aunque los datos aún estén cargando.
function FlatTabContent({ item, active }: { item: NavItem; active: boolean }) {
  const { label, icon: Icon } = item
  const isPanel = label === "Panel"
  const { pending } = useLinkStatus()
  const highlight = active || pending

  return (
    <span
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 transition-colors",
        highlight ? "text-red-500" : "text-zinc-500 hover:text-zinc-300",
        pending && !active && "animate-pulse"
      )}
    >
      {isPanel ? (
        <div
          className={cn(
            "size-6 rounded-full bg-zinc-950 flex items-center justify-center border transition-all overflow-hidden p-0.5 shadow-md",
            highlight
              ? "border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.55)]"
              : "border-white/10"
          )}
        >
          <img src="/logo-v3.webp" alt="Nenes Gym" className="size-full object-contain" />
        </div>
      ) : (
        <Icon className="size-5" strokeWidth={highlight ? 2.5 : 1.5} />
      )}
      <span className={cn("text-[10px] font-medium mt-0.5", highlight && "font-semibold")}>{label}</span>
    </span>
  )
}

// Link de sidebar (cliente y admin) con feedback pending inmediato al tocar.
export function SidebarNavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link href={item.href} className="block">
      <SidebarNavLinkContent item={item} active={active} />
    </Link>
  )
}

function SidebarNavLinkContent({ item, active }: { item: NavItem; active: boolean }) {
  const { icon: Icon, label } = item
  const { pending } = useLinkStatus()
  const highlight = active || pending

  return (
    <span
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
        highlight
          ? "bg-zinc-900 text-red-500 font-semibold border-l-2 border-red-500"
          : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border-l-2 border-transparent",
        pending && !active && "animate-pulse"
      )}
    >
      <Icon className="size-5" strokeWidth={highlight ? 2.5 : 1.5} />
      {label}
    </span>
  )
}

function CenterFab({ active, Icon }: { active: boolean; Icon: typeof Home }) {
  const { pending } = useLinkStatus()
  return (
    <span
      className={cn(
        "flex size-14 items-center justify-center rounded-full border-4 border-zinc-900 bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700",
        (active || pending) && "ring-2 ring-red-400/60",
        pending && !active && "animate-pulse"
      )}
      style={{ boxShadow: "0 6px 20px var(--primary-glow)" }}
    >
      <Icon className="size-6" strokeWidth={2.25} />
    </span>
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
          <CenterFab active={centerActive} Icon={CenterIcon} />
        </Link>
      </div>
    </nav>
  )
}
