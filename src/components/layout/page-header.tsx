import Link from "next/link"
import { ChevronLeft, LogOut } from "lucide-react"
import { logoutAction } from "@/actions/auth.actions"

interface PageHeaderProps {
  title: string
  backHref?: string
  showLogout?: boolean
}

export function PageHeader({ title, backHref, showLogout }: PageHeaderProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b border-white/8 px-4">
      {backHref && (
        <Link href={backHref} className="text-zinc-400 hover:text-zinc-100">
          <ChevronLeft className="size-5" />
        </Link>
      )}
      <h1 className="flex-1 text-base font-semibold">{title}</h1>
      {showLogout && (
        <form action={logoutAction}>
          <button type="submit" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-red-400 transition-colors">
            <LogOut className="size-4" />
            <span>Salir</span>
          </button>
        </form>
      )}
    </header>
  )
}
