import { createClient } from "@/lib/supabase/server"
import type { PaymentMethod } from "@/types/payment"

export type FinanceKind = "income" | "expense"

export interface FinanceEntry {
  id: string
  kind: FinanceKind
  concept: string
  amount_cents: number
  occurred_on: string
}

export interface FinanceMonth {
  /** 'yyyy-MM' */
  month: string
  /** Cobros de planes aprobados en el mes (tabla `payments`). */
  planIncomeCents: number
  planPaymentsCount: number
  /** Lo mismo, partido por medio de pago, para cuadrar caja contra Nequi/banco. */
  byMethod: { method: PaymentMethod; cents: number }[]
  /** Anotados a mano en Finanzas. */
  otherIncomeCents: number
  expenseCents: number
  /** Todo lo que entró menos todo lo que salió. */
  balanceCents: number
  entries: FinanceEntry[]
  /** True si la tabla de la migración 044 aún no existe. */
  missingMigration: boolean
}

/** Valida 'yyyy-MM'; si no lo es, devuelve el mes actual en Bogotá. */
export function normalizeMonth(raw: string | undefined, todayYmd: string): string {
  return raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) ? raw : todayYmd.slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

/**
 * Resumen financiero de un mes del gimnasio.
 *
 * ⚠️ Los cobros de planes se LEEN de `payments`, no se copian a
 * `finance_entries`. Una sola fuente por cada peso: si se duplicaran, cualquier
 * corrección en Pagos (un rechazo, un saldo pendiente que se salda) dejaría
 * Finanzas descuadrado sin que nadie lo note.
 *
 * El mes se corta en hora de Colombia (UTC−5, sin horario de verano): un pago
 * de las 9 p. m. del 31 pertenece a ese mes, aunque en UTC ya sea el día 1.
 */
export async function getFinanceMonth(month: string): Promise<FinanceMonth> {
  const supabase = await createClient()
  const next = shiftMonth(month, 1)
  const desde = `${month}-01T00:00:00-05:00`
  const hasta = `${next}-01T00:00:00-05:00`

  const [pagos, movimientos] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents, method")
      .eq("status", "approved")
      .gte("occurred_at", desde)
      .lt("occurred_at", hasta)
      // Un gimnasio de barrio cobra decenas de planes al mes, no miles; el tope
      // explícito evita el corte silencioso de PostgREST en 1000 filas.
      .limit(5000),
    supabase
      .from("finance_entries")
      .select("id, kind, concept, amount_cents, occurred_on")
      .gte("occurred_on", `${month}-01`)
      .lt("occurred_on", `${next}-01`)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ])

  const filasPagos = pagos.data ?? []
  const porMetodo = new Map<PaymentMethod, number>()
  let planIncomeCents = 0
  for (const p of filasPagos) {
    planIncomeCents += p.amount_cents
    const metodo = p.method as PaymentMethod
    porMetodo.set(metodo, (porMetodo.get(metodo) ?? 0) + p.amount_cents)
  }

  // Sin la migración 044 la pestaña sigue mostrando lo cobrado por planes y
  // avisa en vez de romperse.
  const missingMigration = !!movimientos.error && /does not exist|could not find|schema cache/i.test(movimientos.error.message)
  const entries = (movimientos.data ?? []) as FinanceEntry[]

  let otherIncomeCents = 0
  let expenseCents = 0
  for (const e of entries) {
    if (e.kind === "income") otherIncomeCents += Number(e.amount_cents)
    else expenseCents += Number(e.amount_cents)
  }

  return {
    month,
    planIncomeCents,
    planPaymentsCount: filasPagos.length,
    byMethod: [...porMetodo.entries()]
      .map(([method, cents]) => ({ method, cents }))
      .sort((a, b) => b.cents - a.cents),
    otherIncomeCents,
    expenseCents,
    balanceCents: planIncomeCents + otherIncomeCents - expenseCents,
    entries,
    missingMigration,
  }
}
