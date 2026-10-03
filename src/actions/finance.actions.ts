"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/lib/auth/require-admin"
import { todayInBogota } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

const MSG_SIN_MIGRACION = "Falta aplicar la migración 044 en la base de datos."
const esSinMigracion = (msg: string) => /does not exist|could not find|schema cache/i.test(msg)

/**
 * Anota un ingreso o un egreso que NO es cobro de plan (los cobros de planes
 * ya los suma Finanzas desde `payments`).
 *
 * El monto llega en CENTAVOS, como en el resto del proyecto.
 */
export async function createFinanceEntryAction(input: {
  kind: "income" | "expense"
  concept: string
  amountCents: number
  occurredOn: string
}) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  const concept = input.concept.trim().replace(/\s+/g, " ")
  if (input.kind !== "income" && input.kind !== "expense") return { error: "Tipo de movimiento inválido" }
  if (concept.length < 1) return { error: "Escribe un concepto" }
  if (concept.length > 120) return { error: "El concepto es muy largo (máximo 120 caracteres)" }
  if (!Number.isSafeInteger(input.amountCents) || input.amountCents <= 0) return { error: "El monto debe ser mayor que cero" }
  if (input.amountCents > 100_000_000_000) return { error: "El monto es demasiado alto. Revisa los ceros." }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredOn)) return { error: "Fecha inválida" }
  if (input.occurredOn > todayInBogota()) return { error: "La fecha no puede ser futura" }

  const { error } = await ctx.supabase.from("finance_entries").insert({
    gym_id: ctx.gymId,
    kind: input.kind,
    concept,
    amount_cents: input.amountCents,
    occurred_on: input.occurredOn,
    created_by: ctx.user.id,
  })
  if (error) return { error: esSinMigracion(error.message) ? MSG_SIN_MIGRACION : "No se pudo guardar. Intenta de nuevo." }

  revalidatePath(ROUTES.ADMIN_PAGOS)
  return { success: true }
}

export async function deleteFinanceEntryAction(id: string) {
  const ctx = await requireAdmin()
  if ("error" in ctx) return { error: ctx.error ?? "Sin permisos" }

  // `.select()` para saber si de verdad borró algo: con RLS, un id ajeno o
  // inexistente no da error, simplemente borra cero filas.
  const { data, error } = await ctx.supabase.from("finance_entries").delete().eq("id", id).select("id")
  if (error) return { error: esSinMigracion(error.message) ? MSG_SIN_MIGRACION : "No se pudo borrar. Intenta de nuevo." }
  if (!data || data.length === 0) return { error: "Ese movimiento ya no existe." }

  revalidatePath(ROUTES.ADMIN_PAGOS)
  return { success: true }
}
