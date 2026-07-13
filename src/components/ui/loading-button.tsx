import type { ButtonHTMLAttributes, ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** true mientras la acción está en curso: bloquea el botón y muestra spinner + texto alternativo. */
  pending: boolean
  /** Texto a mostrar mientras `pending` es true (ej. "Guardando...", "Aprobando..."). Si se omite, se mantiene el children pero igual se antepone el spinner. */
  pendingText?: ReactNode
  children: ReactNode
}

/**
 * Botón estándar para acciones asíncronas del proyecto: desactiva el click,
 * muestra spinner + texto de estado, y expone aria-busy/aria-disabled — sin
 * imponer un look propio (recibe `className` igual que un <button> normal,
 * para poder llevar btn-glossy-red u otras clases ya usadas en el proyecto).
 */
export function LoadingButton({
  pending,
  pendingText,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: LoadingButtonProps) {
  return (
    <button
      type={type}
      disabled={pending || disabled}
      aria-busy={pending}
      aria-disabled={pending || disabled}
      className={cn(className, pending && "cursor-not-allowed")}
      {...props}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 shrink-0 animate-spin" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  )
}
