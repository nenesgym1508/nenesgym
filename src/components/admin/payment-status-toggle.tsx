"use client"

import { useEffect, useRef } from "react"
import { Check, AlertTriangle } from "lucide-react"
import { formatCOP } from "@/lib/utils"

export type PaymentStatusChoice = "paid" | "pending"

/** Texto que enseña el padre cuando se intenta cobrar sin haber elegido. */
export const PAGO_SIN_ELEGIR = "Antes de continuar, indica si el cliente ya pagó o queda pendiente."

interface PaymentStatusToggleProps {
  /** `null` = todavía no ha elegido. */
  value: PaymentStatusChoice | null
  onChange: (v: PaymentStatusChoice) => void
  /** Precio del plan, para decir cuánto quedará debiendo. */
  priceCents: number
  /** Se pulsó el botón de cobrar sin elegir: se resalta y se desplaza hasta aquí. */
  showError?: boolean
  disabled?: boolean
}

/**
 * ¿Ya pagó o queda debiendo? Compartido por Registrar cliente y Activar plan.
 *
 * No trae valor por defecto a propósito (decisión del dueño): el botón verde
 * queda siempre activo, y si se pulsa sin haber elegido, el padre pone
 * `showError` y este bloque se resalta y se desplaza a la vista. Lo que NO se
 * hace nunca es deshabilitar el botón en silencio — la primera versión lo
 * hacía y el dueño lo reportó como avería ("lo verde tiene dificultad").
 */
export function PaymentStatusToggle({ value, onChange, priceCents, showError, disabled }: PaymentStatusToggleProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showError) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [showError])

  const falta = showError && !value

  return (
    <div
      ref={ref}
      className={`space-y-2 mb-4 rounded-xl transition-colors ${falta ? "ring-1 ring-red-500/60 bg-red-950/20 p-2.5 -mx-2.5" : ""}`}
    >
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

      {falta && (
        <p className="flex items-start gap-1.5 text-[11px] leading-normal text-red-300">
          <AlertTriangle className="size-3.5 shrink-0 mt-px" />
          {PAGO_SIN_ELEGIR}
        </p>
      )}

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
