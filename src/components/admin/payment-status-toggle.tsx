"use client"

import { Check } from "lucide-react"
import { formatCOP } from "@/lib/utils"

export type PaymentStatusChoice = "paid" | "pending"

interface PaymentStatusToggleProps {
  value: PaymentStatusChoice
  onChange: (v: PaymentStatusChoice) => void
  /** Precio del plan, para decir cuánto quedará debiendo. */
  priceCents: number
  disabled?: boolean
}

/**
 * ¿Ya pagó o queda debiendo? Compartido por Registrar cliente y Activar plan.
 *
 * ⚠️ Viene con "Ya pagó" marcado por defecto, y no es un detalle. La primera
 * versión arrancaba sin nada elegido y el botón verde de cobrar se quedaba
 * gris hasta tocar una opción, sin decir por qué. El dueño lo describió tal
 * cual: "lo verde donde dice registrar cliente y activar plan tiene
 * dificultad". Cobrar al contado es el 99% de los casos; el fiado es la
 * excepción y por eso es lo que hay que elegir a propósito.
 */
export function PaymentStatusToggle({ value, onChange, priceCents, disabled }: PaymentStatusToggleProps) {
  return (
    <div className="space-y-2 mb-4">
      <label className="text-xs font-medium text-zinc-400">¿Ya pagó?</label>

      <div className="grid grid-cols-2 gap-2">
        <Opcion
          activa={value === "paid"}
          onClick={() => onChange("paid")}
          disabled={disabled}
          tono="verde"
          titulo="Ya pagó"
          detalle="Se registra el pago ahora."
        />
        <Opcion
          activa={value === "pending"}
          onClick={() => onChange("pending")}
          disabled={disabled}
          tono="ambar"
          titulo="Pago pendiente"
          detalle="Entrena igual y queda debiendo."
        />
      </div>

      {value === "pending" && (
        <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-2 text-[11px] leading-normal text-amber-200">
          Quedará debiendo <strong className="text-zinc-100">{formatCOP(priceCents)}</strong>. Su plan
          se activa igual; lo verás como <strong className="text-zinc-100">Pago pendiente</strong> en su
          tarjeta hasta que registres el pago.
        </p>
      )}
    </div>
  )
}

function Opcion({
  activa, onClick, disabled, tono, titulo, detalle,
}: {
  activa: boolean
  onClick: () => void
  disabled?: boolean
  tono: "verde" | "ambar"
  titulo: string
  detalle: string
}) {
  const activo =
    tono === "verde"
      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
      : "border-amber-500/50 bg-amber-500/10 text-amber-300"
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={activa}
      className={`rounded-xl border p-2.5 text-left transition-colors cursor-pointer disabled:opacity-50 ${
        activa ? activo : "border-white/10 bg-white/[0.02] text-zinc-300 hover:border-white/25"
      }`}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold">
        {activa && <Check className="size-3 shrink-0" />}
        {titulo}
      </span>
      <span className="mt-0.5 block text-[10px] leading-tight text-zinc-500">{detalle}</span>
    </button>
  )
}
