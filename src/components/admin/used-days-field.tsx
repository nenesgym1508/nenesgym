"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"
import { formatDate } from "@/lib/dates"

interface PlanShape {
  days: number
  duration_days: number
}

/**
 * Días que el socio ya lleva entrenando sin haber comprado plan.
 *
 * Caso real: el socio lleva semanas viniendo y solo ahora se le formaliza el
 * cobro. El plan que se le vende debe cubrir retroactivamente esos días, no
 * empezar de cero.
 *
 * ⚠️ El descuento se resta a los DOS números del plan, días y ventana de
 * calendario. El plan es "N días dentro de M de calendario": restar solo los
 * días le dejaría el plazo completo para menos días, que es un plan distinto al
 * que compró.
 *
 * ⚠️ NO se consigue retrocediendo `start_date` / `occurred_at`, que es lo
 * primero que parece natural. El consumo se cuenta por días HÁBILES
 * (`eligible_days_elapsed`), así que retroceder 5 días de calendario podría
 * descontar solo 3 si cayó un domingo. Restando a los números, lo que el admin
 * teclea es exactamente lo que se descuenta.
 *
 * Vive en un solo sitio porque lo usan los DOS caminos de venta —el alta de un
 * socio nuevo y la activación sobre uno existente— y ya pasó una vez que un
 * ajuste solo llegó a uno de los dos.
 */
export function useUsedDays(plan: PlanShape | undefined) {
  // Se guarda como TEXTO, no como número, para que el admin pueda borrar el
  // campo y teclear de nuevo. Con un número, el campo nunca puede quedar vacío
  // y editarlo a mano se vuelve una pelea contra el "0".
  const [raw, setRaw] = useState("")

  // Tope: siempre debe quedarle al menos 1 día. Descontar el plan entero sería
  // cobrar por nada, y la membresía nacería vencida.
  const maxUsedDays = plan ? Math.max(0, plan.days - 1) : 0

  const parsed = Number.parseInt(raw || "0", 10)
  const appliedUsed = Math.min(Number.isNaN(parsed) ? 0 : parsed, maxUsedDays)

  const totalDays = plan ? plan.days - appliedUsed : 0
  const durationDays = plan ? Math.max(1, plan.duration_days - appliedUsed) : 0

  /**
   * Recorta lo tecleado al tope del plan actual.
   *
   * Hay que llamarlo al CAMBIAR de plan: si el admin teclea 15 sobre el mensual
   * y luego se pasa a "Día suelto", el tope baja a 0 y el campo se quedaría
   * enseñando un 15 que ya no se aplica — el resumen diría una cosa y el campo
   * otra.
   */
  const clampToPlan = (nextMax: number) => {
    if (appliedUsed > nextMax) setRaw(nextMax === 0 ? "" : String(nextMax))
  }

  return {
    raw,
    setRaw,
    maxUsedDays,
    appliedUsed,
    totalDays,
    durationDays,
    clampToPlan,
    reset: () => setRaw(""),
  }
}

interface UsedDaysFieldProps {
  /** Días del plan según el catálogo, para el texto "de los N del plan". */
  planDays: number
  raw: string
  onRawChange: (value: string) => void
  maxUsedDays: number
  appliedUsed: number
  totalDays: number
  /** Vencimiento ya calculado. Si se pasa, se menciona aquí. */
  endDate?: string | null
}

export function UsedDaysField({
  planDays,
  raw,
  onRawChange,
  maxUsedDays,
  appliedUsed,
  totalDays,
  endDate,
}: UsedDaysFieldProps) {
  // Se recorta al escribir, no al salir del campo: si no, el campo enseñaría 99
  // mientras el resumen de abajo ya dice 19, y aquí se está decidiendo cuántos
  // días recibe alguien que está pagando.
  const handleChange = (value: string) => {
    const soloDigitos = value.replace(/\D/g, "").slice(0, 3)
    if (soloDigitos === "") return onRawChange("")
    onRawChange(String(Math.min(Number.parseInt(soloDigitos, 10), maxUsedDays)))
  }

  const step = (delta: number) => {
    const next = Math.min(Math.max(appliedUsed + delta, 0), maxUsedDays)
    onRawChange(next === 0 ? "" : String(next))
  }

  return (
    <div className="space-y-2 mb-4">
      <label htmlFor="used_days" className="text-xs font-medium text-zinc-400">
        Días que ya lleva viniendo <span className="text-zinc-600">(opcional)</span>
      </label>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={appliedUsed === 0}
          aria-label="Quitar un día"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 disabled:opacity-30 cursor-pointer"
        >
          <Minus className="size-4" />
        </button>

        <div className="min-w-0 flex-1 text-center">
          <input
            id="used_days"
            type="text"
            // `text` + inputMode numeric, no `number`: en móvil el type=number
            // trae flechitas, acepta "e" y "-", y la rueda del ratón cambia el
            // valor sin querer. Aquí solo entran dígitos, filtrados arriba.
            inputMode="numeric"
            autoComplete="off"
            value={raw}
            placeholder="0"
            onChange={(e) => handleChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            className="w-full bg-transparent text-center text-xl font-bold tabular-nums text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            {appliedUsed === 1 ? "día usado" : "días usados"}
            {maxUsedDays > 0 && <span className="text-zinc-600"> · máx. {maxUsedDays}</span>}
          </p>
        </div>

        <button
          type="button"
          onClick={() => step(1)}
          disabled={appliedUsed >= maxUsedDays}
          aria-label="Sumar un día"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:border-white/25 disabled:opacity-30 cursor-pointer"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {appliedUsed > 0 ? (
        <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-[11px] leading-normal text-amber-200">
          <p>
            Se le descuentan <strong className="text-zinc-100">{appliedUsed}</strong>{" "}
            {appliedUsed === 1 ? "día" : "días"} de los{" "}
            <strong className="text-zinc-100">{planDays}</strong> del plan: le quedan{" "}
            <strong className="text-zinc-100">{totalDays}</strong>{" "}
            {totalDays === 1 ? "día" : "días"}
            {endDate && (
              <>
                {" "}y vencerá el <strong className="text-zinc-100">{formatDate(endDate)}</strong>
              </>
            )}
            .
          </p>
          <p className="text-amber-400/70">
            Paga el precio completo del plan. Úsalo para el socio que ya llevaba días
            entrenando sin haberlo comprado.
          </p>
        </div>
      ) : (
        <p className="text-[11px] leading-normal text-zinc-500">
          Si el socio ya llevaba días entrenando sin plan, escríbelos aquí y se descontarán
          del plan que le vendes ahora.
        </p>
      )}
    </div>
  )
}
