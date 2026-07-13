"use client"

import Link from "next/link"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { logoutAction } from "@/actions/auth.actions"
import { adminItems, useIsActive } from "@/components/layout/bottom-nav"

interface AdminSidebarProps {
  fullName?: string | null
}

export function AdminSidebar({ fullName }: AdminSidebarProps) {
  const isActive = useIsActive()
  const initial = (fullName ?? "A").charAt(0).toUpperCase()

  return (
    <aside className="hidden md:flex md:flex-col fixed left-0 top-0 h-screen w-64 shrink-0 border-r border-white/10 bg-zinc-950 px-4 py-6 z-40">
      <Link href={ROUTES.ADMIN_DASHBOARD} className="flex items-center gap-3 px-2 mb-8">
        <div className="size-9 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          <img src="/logo-v3.webp" alt="Nenes Gym" className="size-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-bebas text-lg leading-none tracking-wide text-white truncate">NENE&apos;S GYM</p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Panel Admin</p>
        </div>
      </Link>

      <nav className="flex-1 flex flex-col gap-1">
        {adminItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-zinc-900 text-red-500 font-semibold border-l-2 border-red-500"
                  : "text-zinc-400 hover:bg-zinc-900/60 hover:text-zinc-200 border-l-2 border-transparent"
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 1.5} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-white/10 pt-4 px-2">
        <div className="size-9 rounded-full border border-white/10 flex items-center justify-center text-sm font-bold bg-zinc-900 shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-200 truncate">{fullName ?? "Admin"}</p>
          <p className="text-[10px] text-zinc-500 truncate">Gym Manager</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            className="text-zinc-400 hover:text-red-500 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-zinc-900"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  )
}
