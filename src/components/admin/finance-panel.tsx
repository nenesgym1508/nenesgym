import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { getFinanceMonth, shiftMonth } from "@/services/finance.service"
import { FinanceEntryForm } from "@/components/admin/finance-entry-form"
import { FinanceEntryDelete } from "@/components/admin/finance-entry-delete"
import { formatCOP } from "@/lib/utils"
import { formatDate } from "@/lib/dates"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function nombreMes(month: string) {
  const [y, m] = month.split("-").map(Number)
  return `${MESES[m - 1]} ${y}`
}

const hrefMes = (month: string) => `${ROUTES.ADMIN_PAGOS}?tab=finanzas&mes=${month}`

/**
 * Pestaña Pagos → Finanzas. Panel del mes: cuánto entró, cuánto salió y qué
 * quedó. Pensado para revisarlo desde el celular en 10 segundos.
 */
export async function FinancePanel({ month, today }: { month: string; today: string }) {
  const f = await getFinanceMonth(month)
  const mesActual = today.slice(0, 7)
  const esMesActual = month === mesActual
  const ingresosTotales = f.planIncomeCents + f.otherIncomeCents
  const positivo = f.balanceCents >= 0

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Navegación por mes */}
      <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0f0f11]/80 px-2 py-2">
        <Link
          href={hrefMes(shiftMonth(month, -1))}
          replace
          scroll={false}
          aria-label="Mes anterior"
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <p className="font-bebas text-xl tracking-wide uppercase text-white">{nombreMes(month)}</p>
        {esMesActual ? (
          // No hay meses futuros que mirar: hueco del mismo tamaño para que el
          // título no se descentre.
          <span className="size-9" aria-hidden />
        ) : (
          <Link
            href={hrefMes(shiftMonth(month, 1))}
            replace
            scroll={false}
            aria-label="Mes siguiente"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <ChevronRight className="size-5" />
          </Link>
        )}
      </div>

      {f.missingMigration && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 px-3 py-2.5 text-xs text-amber-200">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          Falta aplicar la migración 044 en la base de datos. Mientras tanto se ve lo cobrado por
          planes, pero no se pueden anotar otros ingresos ni gastos.
        </p>
      )}

      {/* Balance: lo primero que hay que ver */}
      <div className="rounded-2xl border border-white/5 bg-[#0f0f11]/80 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 font-mono">
          {positivo ? "Ganancia del mes" : "Pérdida del mes"}
        </p>
        <p className={`mt-1 font-bebas text-5xl tracking-wide ${positivo ? "text-emerald-400" : "text-red-400"}`}>
          {positivo ? "" : "−"}{formatCOP(Math.abs(f.balanceCents))}
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Entró {formatCOP(ingresosTotales)} · Salió {formatCOP(f.expenseCents)}
        </p>
      </div>

      {/* Desglose */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/5 bg-[#0f0f11]/80 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 font-mono">Planes cobrados</p>
          <p className="mt-1 text-xl font-bold text-zinc-100">{formatCOP(f.planIncomeCents)}</p>
          <p className="text-[11px] text-zinc-500">{f.planPaymentsCount} {f.planPaymentsCount === 1 ? "pago" : "pagos"}</p>
          {f.byMethod.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-white/5 pt-3">
              {f.byMethod.map((m) => (
                <li key={m.method} className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">{PAYMENT_METHOD_LABELS[m.method] ?? m.method}</span>
                  <span className="font-medium text-zinc-300">{formatCOP(m.cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0f0f11]/80 p-4">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 font-mono">
            <ArrowDownLeft className="size-3 text-emerald-400" /> Otros ingresos
          </p>
          <p className="mt-1 text-xl font-bold text-emerald-300">{formatCOP(f.otherIncomeCents)}</p>
          <p className="text-[11px] text-zinc-500">Ventas y extras anotados</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-[#0f0f11]/80 p-4">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 font-mono">
            <ArrowUpRight className="size-3 text-red-400" /> Gastos
          </p>
          <p className="mt-1 text-xl font-bold text-red-300">{formatCOP(f.expenseCents)}</p>
          <p className="text-[11px] text-zinc-500">Arriendo, servicios, pagos…</p>
        </div>
      </div>

      {!f.missingMigration && <FinanceEntryForm today={today} />}

      {/* Movimientos anotados */}
      <div className="rounded-2xl border border-white/5 bg-[#0f0f11]/80">
        <h3 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500 font-mono">
          Anotados en {MESES[Number(month.slice(5)) - 1].toLowerCase()}
        </h3>
        {f.entries.length === 0 ? (
          <p className="px-4 pb-5 pt-2 text-sm text-zinc-500">
            Aún no hay ingresos ni gastos anotados este mes. Los cobros de planes ya se suman solos.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {f.entries.map((e) => {
              const ingreso = e.kind === "income"
              return (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                      ingreso ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {ingreso ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-200">{e.concept}</p>
                    <p className="text-[11px] text-zinc-500">{formatDate(e.occurred_on)}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${ingreso ? "text-emerald-300" : "text-red-300"}`}>
                    {ingreso ? "+" : "−"}{formatCOP(Number(e.amount_cents))}
                  </span>
                  <FinanceEntryDelete id={e.id} concept={e.concept} />
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
