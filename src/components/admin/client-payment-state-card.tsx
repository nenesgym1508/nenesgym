"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle, Banknote } from "lucide-react"
import {
  getClientDebtsAction,
  settleClientDebtAction,
  markClientUnpaidAction,
} from "@/actions/admin.actions"
import { formatCOP } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { PaymentMethod } from "@/types/payment"
import { LoadingButton } from "@/components/ui/loading-button"

const METODOS: PaymentMethod[] = ["cash", "transfer", "nequi", "daviplata", "other"]

interface ClientPaymentStateCardProps {
  clientId: string
  clientName: string
  /** Precio de su membresía vigente: sirve de valor por defecto al marcar deuda. */
  membershipPriceCents?: number | null
}

/**
 * Estado de pago del cliente en su ficha, con las dos correcciones posibles:
 * registrar el pago de un saldo, o marcar como no pagado a alguien que figura
 * como pagado.
 *
 * Lo segundo existe porque la deuda solo podía nacer al VENDER. Los clientes
 * dados de alta antes del cobro a crédito, o marcados "Pagado" por error, no
 * tenían forma de corregirse.
 *
 * ⚠️ Marcar como no pagado NO toca la membresía: el cliente conserva sus días.
 * Solo se anota que el dinero no entró (ver `add_client_debt`, migración 039).
 */
export function ClientPaymentStateCard({
  clientId,
  clientName,
  membershipPriceCents,
}: ClientPaymentStateCardProps) {
  const router = useRouter()
  const [deudas, setDeudas] = useState<{ id: string; amount_cents: number }[] | null>(null)
  const [error, setError] = useState("")
  const [ocupado, setOcupado] = useState(false)
  const [metodo, setMetodo] = useState<PaymentMethod>("cash")
  const [marcando, setMarcando] = useState(false)
  const [monto, setMonto] = useState("")
  const [recarga, setRecarga] = useState(0)

  // Una sola función decide qué hacer con la respuesta; la usan tanto la carga
  // inicial como las recargas tras cobrar o marcar.
  const aplicar = useCallback((r: Awaited<ReturnType<typeof getClientDebtsAction>>) => {
    if (!r.debts) {
      setError(r.error || "No se pudo consultar el saldo")
      return
    }
    setError("")
    setDeudas(r.debts)
  }, [])

  const cargar = useCallback(
    () =>
      getClientDebtsAction([clientId])
        .then(aplicar)
        .catch(() => setError("No se pudo conectar para consultar el saldo.")),
    [clientId, aplicar]
  )

  // ⚠️ Se escribe como cadena de promesas y NO como `void cargar()`: la regla
  // react-hooks/set-state-in-effect ve a `cargar` como "setState síncrono en
  // el efecto" aunque el setState vaya tras un await. Con los setState dentro
  // de .then/.catch la regla no salta, y el guard `vivo` evita pintar una
  // respuesta que llega cuando el componente ya se desmontó.
  useEffect(() => {
    let vivo = true
    getClientDebtsAction([clientId])
      .then((r) => { if (vivo) aplicar(r) })
      .catch(() => { if (vivo) setError("No se pudo conectar para consultar el saldo.") })
    return () => { vivo = false }
  }, [clientId, recarga, aplicar])

  const total = deudas?.reduce((s, d) => s + d.amount_cents, 0) ?? 0
  const debe = (deudas?.length ?? 0) > 0

  const registrarPago = async () => {
    if (!deudas?.length || ocupado) return
    setOcupado(true)
    setError("")
    try {
      for (const d of deudas) {
        const r = await settleClientDebtAction(d.id, metodo)
        if (r.error) throw new Error(r.error)
      }
      await cargar()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar el pago.")
    } finally {
      setOcupado(false)
    }
  }

  const marcarNoPagado = async () => {
    const cents = Math.round((Number.parseFloat(monto) || 0) * 100)
    if (cents <= 0) { setError("Escribe cuánto debe"); return }
    setOcupado(true)
    setError("")
    try {
      const r = await markClientUnpaidAction(clientId, cents)
      if (r.error) throw new Error(r.error)
      setMarcando(false)
      setMonto("")
      await cargar()
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo marcar el saldo.")
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div
      className={`rounded-2xl border p-4 ${
        debe
          ? "border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-zinc-950"
          : "border-white/10 bg-black/25"
      }`}
    >
      {deudas === null ? (
        <p className="text-xs text-zinc-400">
          {error ? "Saldo no disponible" : "Consultando estado de pago…"}
        </p>
      ) : debe ? (
        <>
          <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="size-4" /> Pago pendiente
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-white">{formatCOP(total)}</p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-400">
            {clientName} debe este saldo. Sus días siguen intactos: registrar el pago solo salda
            la cuenta.
          </p>

          <label className="mt-4 block text-xs text-zinc-400">
            Método del pago recibido
            <select
              disabled={ocupado}
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as PaymentMethod)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-100"
            >
              {METODOS.map((m) => (
                <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
              ))}
            </select>
          </label>

          <LoadingButton
            onClick={registrarPago}
            pending={ocupado}
            pendingText="Registrando pago…"
            className="btn-glossy-red mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white cursor-pointer"
          >
            <Banknote className="size-4" /> Registrar pago · {formatCOP(total)}
          </LoadingButton>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <CheckCircle className="size-4" /> Pagado · Sin saldo pendiente
          </p>

          {!marcando ? (
            <button
              type="button"
              onClick={() => {
                setMarcando(true)
                // Por defecto, lo que costó su plan: es lo que deberá el 99% de
                // las veces, y así el dueño solo confirma en vez de teclear.
                setMonto(membershipPriceCents ? String(membershipPriceCents / 100) : "")
              }}
              className="mt-3 text-[11px] font-medium text-zinc-500 hover:text-amber-300 cursor-pointer"
            >
              ¿No pagó? Marcar saldo pendiente
            </button>
          ) : (
            <div className="mt-3 space-y-2 border-t border-white/8 pt-3">
              <label htmlFor="monto_deuda" className="block text-[11px] text-zinc-400">
                ¿Cuánto debe {clientName.trim().split(/\s+/)[0]}?
              </label>
              <input
                id="monto_deuda"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={monto}
                placeholder="70000"
                onChange={(e) => { setMonto(e.target.value.replace(/\D/g, "").slice(0, 8)); setError("") }}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm tabular-nums text-zinc-100 outline-none focus:border-amber-500 placeholder:text-zinc-600"
              />
              <p className="text-[10px] leading-normal text-zinc-500">
                No se le quitan días ni se toca su plan. Solo queda anotado que el dinero no
                entró.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMarcando(false); setMonto(""); setError("") }}
                  disabled={ocupado}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] py-2 text-xs font-medium text-zinc-300 hover:border-white/25 disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <LoadingButton
                  onClick={marcarNoPagado}
                  pending={ocupado}
                  pendingText="Marcando…"
                  disabled={!monto}
                  className="flex-1 rounded-xl bg-amber-600 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-40 cursor-pointer"
                >
                  Marcar como no pagado
                </LoadingButton>
              </div>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {error}{" "}
          {deudas === null && (
            <button onClick={() => setRecarga((n) => n + 1)} className="underline cursor-pointer">
              Reintentar
            </button>
          )}
        </p>
      )}
    </div>
  )
}
