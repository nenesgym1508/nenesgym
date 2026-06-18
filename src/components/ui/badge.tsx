import { cn } from "@/lib/utils"
import type { MembershipStatus } from "@/types/membership"
import type { PaymentStatus } from "@/types/payment"

const membershipColors: Record<MembershipStatus, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  grace: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  exhausted: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
}

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  approved: "bg-green-500/15 text-green-400 border-green-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
}

const membershipLabels: Record<MembershipStatus, string> = {
  active: "Activa",
  grace: "Periodo extra",
  exhausted: "Sin días",
  expired: "Vencida",
  cancelled: "Cancelada",
}

const paymentLabels: Record<PaymentStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode
}

export function Badge({ className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function MembershipBadge({ status }: { status: MembershipStatus }) {
  return (
    <Badge className={membershipColors[status]}>{membershipLabels[status]}</Badge>
  )
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge className={paymentColors[status]}>{paymentLabels[status]}</Badge>
  )
}
