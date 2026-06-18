import { Loader2, Inbox, AlertTriangle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Loader2 className="size-7 animate-spin text-red-500" />
      <p className="text-sm text-zinc-500">{label}</p>
    </div>
  )
}

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-white/5">
        <Icon className="size-6 text-zinc-500" />
      </div>
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {description && <p className="max-w-xs text-xs text-zinc-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = "Algo salió mal",
  description = "No pudimos cargar esta sección. Intenta de nuevo.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <div className="mb-1 flex size-12 items-center justify-center rounded-2xl bg-red-500/10">
        <AlertTriangle className="size-6 text-red-400" />
      </div>
      <p className="text-sm font-semibold text-zinc-100">{title}</p>
      <p className="max-w-xs text-xs text-zinc-500">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}
