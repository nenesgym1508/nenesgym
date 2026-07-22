"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import Link from "next/link"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { Search, Users, Calendar, Banknote, ChevronRight, ChevronLeft } from "lucide-react"
import dynamicImport from "next/dynamic"
const ActivatePlanModal = dynamicImport(() => import("@/components/admin/activate-plan-modal").then(m => m.ActivatePlanModal))
import { Card } from "@/components/ui/card"
import { LoadingButton } from "@/components/ui/loading-button"
import { formatDate } from "@/lib/dates"
import { adminClienteDetalle } from "@/constants/routes"
import type { MembershipStatus } from "@/types/membership"

interface Plan {
  id: string
  name: string
  days: number
  duration_days: number
  price_cents: number
}

type ClientRow = {
  id: string
  auto_aprobacion: boolean
  comprobante_bloqueado?: boolean
  profile: { full_name?: string | null; email?: string | null } | null
  effectiveStatus: MembershipStatus | null
  remainingDays: number
  planName: string | null
  startDate: string | null
  endDate: string | null
}

type StatusFilter = "todos" | "activos" | "sin_membresia"

interface ClientsListProps {
  clients: ClientRow[]
  plans: Plan[]
  total: number
  page: number
  pageSize: number
  search: string
  status: StatusFilter
}

const TABS: { key: StatusFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "activos", label: "Activos" },
  { key: "sin_membresia", label: "Sin membresía" },
]

export function ClientsList({ clients, plans, total, page, pageSize, search, status }: ClientsListProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(search)
  const [registeringId, setRegisteringId] = useState<string | null>(null)

  // Actualiza los query params (búsqueda desde Postgres se resuelve en el servidor).
  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [k, v] of Object.entries(next)) {
        if (v === null || v === "") params.delete(k)
        else params.set(k, v)
      }
      const qs = params.toString()
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
      })
    },
    [router, pathname, searchParams]
  )

  // Debounce del buscador: navega (servidor) 350ms después de la última tecla; resetea a página 1.
  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => updateParams({ q: searchInput || null, page: null }), 350)
    return () => clearTimeout(t)
  }, [searchInput, search, updateParams])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const singleDayPlan = plans.find(
    (p) => p.days === 1 || p.name.toLowerCase().includes("suelto") || p.name.toLowerCase().includes("dia")
  )

  const handleRegisterSingleDay = async (clientId: string, clientName: string) => {
    if (!singleDayPlan) return
    const priceFormatted = (singleDayPlan.price_cents / 100).toLocaleString("es-CO")
    if (!confirm(`¿Confirmas registrar pago de 1 día suelto en efectivo ($${priceFormatted}) para ${clientName}?`)) {
      return
    }

    setRegisteringId(clientId)
    const { createManualPaymentAction } = await import("@/actions/admin.actions")
    const result = await createManualPaymentAction({
      clientId,
      planId: singleDayPlan.id,
      amountCents: singleDayPlan.price_cents,
      method: "cash",
      totalDays: singleDayPlan.days,
      durationDays: singleDayPlan.duration_days,
    })
    setRegisteringId(null)

    if (result.error) {
      alert(`Error al registrar pago: ${result.error}`)
    } else {
      router.refresh()
    }
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-6">
      {/* Buscador de clientes */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Buscar cliente por nombre o email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full bg-[#0a0a0a] border border-[#222] rounded-full py-3.5 pl-12 pr-4 text-sm focus:outline-none focus:border-red-600/50 text-white placeholder-zinc-500 transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0a0a0a] border border-[#222] rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => updateParams({ status: t.key === "todos" ? null : t.key, page: null })}
            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer text-center ${
              status === t.key
                ? "text-red-500 border-b-2 border-red-500 bg-zinc-900/60"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Listado de clientes */}
      {clients.length === 0 ? (
        <Card className="text-center py-12 bg-[#0a0a0a] border border-[#222]">
          <Users className="size-8 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">
            {search ? "No se encontraron clientes para esta búsqueda." : "No hay clientes en esta sección."}
          </p>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 transition-opacity ${isPending ? "opacity-60" : ""}`}>
          {clients.map((c) => {
            const clientName = c.profile?.full_name ?? "Cliente"
            const initials = clientName
              .split(" ")
              .map((n) => n.charAt(0))
              .slice(0, 2)
              .join("")
              .toUpperCase()
            const isActive = c.effectiveStatus === "active" || c.effectiveStatus === "grace"

            return (
              <div
                key={c.id}
                className="h-full flex flex-col bg-gradient-to-b from-zinc-700/40 via-zinc-900/50 to-zinc-950/90 border border-zinc-700 rounded-3xl p-5 shadow-[0_4px_25px_rgba(0,0,0,0.65)] space-y-3.5"
              >
                {/* Cabecera del Card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm font-semibold bg-zinc-950 text-white transition-all ${
                      isActive
                        ? "border-green-500/40 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
                        : "border-red-500/40 shadow-[0_0_10px_rgba(220,38,38,0.15)]"
                    }`}>
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-bebas font-bold text-xl tracking-wide uppercase text-white">
                        {clientName}
                      </h4>
                      {isActive ? (
                        <span className="text-[10px] text-green-500 bg-green-500/10 border border-green-500/20 rounded-md px-2.5 py-0.5 mt-1 inline-block font-semibold">
                          Activa
                        </span>
                      ) : (
                        <span className="text-[10px] text-red-500 bg-red-500/10 border border-red-500/20 rounded-md px-2.5 py-0.5 mt-1 inline-block font-semibold">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={adminClienteDetalle(c.id)}
                    className="btn-glossy-red text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    Ver
                    <ChevronRight className="size-3.5" />
                  </Link>
                </div>

                {/* Separador */}
                <div className="border-t border-white/5"></div>

                {/* Fila Central del Card */}
                <div className="space-y-3">
                  {isActive && c.planName && (
                    <h5 className="font-semibold text-sm text-zinc-100 leading-tight">
                      {c.planName}
                    </h5>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                      <div className="w-11 h-11 rounded-xl border border-white/5 bg-zinc-950 flex items-center justify-center shrink-0">
                        <Calendar className="size-5 text-red-500" />
                      </div>
                      {isActive ? (
                        <div className="min-w-0 text-xs text-zinc-400 space-y-0.5">
                          <p className="truncate">
                            <span className="text-zinc-500 font-medium">Inicio:</span> {c.startDate ? formatDate(c.startDate) : "—"}
                          </p>
                          <p className="truncate">
                            <span className="text-zinc-500 font-medium">Vence:</span> {c.endDate ? formatDate(c.endDate) : "Sin vencimiento"}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h5 className="font-semibold text-sm text-white leading-snug">Sin plan activo</h5>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            Puede contratar un plan para acceder.
                          </p>
                        </div>
                      )}
                    </div>

                    {isActive && (
                      <div className="flex flex-col items-center justify-center w-14 h-14 rounded-full border border-white/10 text-white bg-black/60 shrink-0 ml-3 shadow-md">
                        <span className="text-xl font-bold font-sans leading-none mt-0.5 flex items-center gap-1 justify-center pl-1">
                          {c.remainingDays}
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 inline-block" />
                        </span>
                        <span className="text-[7px] leading-tight text-center font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                          días
                        </span>
                        <span className="text-[6px] leading-tight text-center font-semibold text-zinc-500 uppercase tracking-wider">
                          restantes
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-white/5"></div>

                {/* Fila de Botones Inferior */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <ActivatePlanModal
                    clientId={c.id}
                    clientName={clientName}
                    plans={plans}
                    triggerVariant="card"
                    isActive={isActive}
                    currentEndDate={c.endDate ?? undefined}
                  />
                  {singleDayPlan && (
                    <LoadingButton
                      onClick={() => handleRegisterSingleDay(c.id, clientName)}
                      pending={registeringId === c.id}
                      pendingText="Registrando..."
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 hover:bg-zinc-900 transition-colors px-3 py-3 text-xs text-zinc-300 hover:text-white cursor-pointer disabled:opacity-50 text-left"
                    >
                      <Banknote className="size-4 text-zinc-400 shrink-0" />
                      <div className="leading-tight">
                        <p className="font-semibold text-[10px]">Pago 1 día</p>
                        <p className="text-[9px] text-zinc-500">(efectivo)</p>
                      </div>
                    </LoadingButton>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Paginación */}
      {total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-500">
            {from}–{to} de {total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateParams({ page: String(page - 1) })}
              disabled={page <= 1 || isPending}
              aria-label="Página anterior"
              className="flex items-center justify-center size-9 rounded-lg border border-[#222] bg-[#0a0a0a] text-zinc-300 hover:text-white hover:border-red-600/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs text-zinc-400 tabular-nums">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => updateParams({ page: String(page + 1) })}
              disabled={page >= totalPages || isPending}
              aria-label="Página siguiente"
              className="flex items-center justify-center size-9 rounded-lg border border-[#222] bg-[#0a0a0a] text-zinc-300 hover:text-white hover:border-red-600/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
