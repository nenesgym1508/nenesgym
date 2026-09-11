"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle, Banknote } from "lucide-react"
import { getClientDebtsAction, settleClientDebtAction } from "@/actions/admin.actions"
import { formatCOP } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { PaymentMethod } from "@/types/payment"
import { LoadingButton } from "@/components/ui/loading-button"

export function ClientDebtNotice({ clientId, onReady }: { clientId: string; onReady: (ready: boolean) => void }) {
  const router = useRouter()
  const [debts, setDebts] = useState<{ id: string; amount_cents: number }[] | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>("cash")
  const [retry, setRetry] = useState(0)
  // ⚠️ `onReady(true)` TAMBIÉN en los caminos de error, y no es un descuido.
  //
  // Consultar el saldo es informativo: sirve para avisar al admin. Cobrar es la
  // operación principal del gimnasio. Si un fallo al leer el saldo dejara
  // `balanceReady` en false, el <fieldset> de arriba queda `hidden` y el botón
  // deshabilitado — o sea, **no se le puede cobrar a NADIE** hasta que la
  // consulta vuelva a funcionar.
  //
  // No es hipotético: se comprobó en pantalla con la migración 037 sin aplicar,
  // y las 10 tarjetas mostraban "Saldo no disponible" con el cobro bloqueado.
  // Lo mismo pasaría con un corte de red de un segundo.
  //
  // Si no se puede leer el saldo, se deja cobrar y se avisa. Peor es no poder
  // cobrar.
  useEffect(() => {
    let alive = true
    getClientDebtsAction([clientId]).then(result => {
      if (!alive) return
      if (!result.debts) {
        setError(result.error || "No se pudo consultar el saldo")
        onReady(true)
        return
      }
      setError("")
      setDebts(result.debts)
      onReady(result.debts.length === 0)
    }).catch(() => {
      if (!alive) return
      setError("No se pudo conectar para consultar el saldo.")
      onReady(true)
    })
    return () => { alive = false }
  }, [clientId, onReady, retry])

  const pay = async () => {
    if (!debts || busy) return
    setBusy(true)
    setError("")
    try {
      for (const debt of debts) {
        const result = await settleClientDebtAction(debt.id, method)
        if (result.error) throw new Error(result.error)
        setDebts(current => current?.filter(d => d.id !== debt.id) ?? null)
      }
      onReady(true)
      router.refresh()
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo registrar el pago. Intenta de nuevo.") }
    finally { setBusy(false) }
  }
  const total = debts?.reduce((sum, d) => sum + d.amount_cents, 0) ?? 0
  return <section aria-live="polite" className={"mb-4 rounded-2xl border p-4 " + (debts?.length ? "border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-zinc-950" : "border-white/10 bg-black/25")}>
    {debts === null ? <p className="text-xs text-zinc-400">{error ? "Saldo no disponible" : "Consultando estado de pago…"}</p> : debts.length ? <>
      <p className="flex items-center gap-2 text-xs font-semibold text-amber-300"><AlertTriangle className="size-4" />Pago pendiente</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-white">{formatCOP(total)}</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">El cliente debe este saldo de su plan. Registra el pago recibido antes de ampliar o activar otro plan.</p>
      <label className="mt-4 block text-xs text-zinc-400">Método del pago recibido
        <select disabled={busy} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-zinc-100">
          {(["cash", "transfer", "nequi", "daviplata", "other"] as const).map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
        </select>
      </label>
      <LoadingButton onClick={pay} pending={busy} pendingText="Registrando pago…" className="btn-glossy-red mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-white"><Banknote className="size-4" />Registrar pago · {formatCOP(total)}</LoadingButton>
      <p className="mt-2 text-[10px] text-zinc-500">Este cobro salda la deuda y conserva los días del plan.</p>
    </> : <p className="flex items-center gap-2 text-xs font-semibold text-emerald-400"><CheckCircle className="size-4" />Pagado · Sin saldo pendiente</p>}
    {error && <p role="alert" className="mt-3 text-xs text-red-400">{error} {debts === null && <button onClick={() => setRetry(n => n + 1)} className="underline">Reintentar</button>}</p>}
  </section>
}
