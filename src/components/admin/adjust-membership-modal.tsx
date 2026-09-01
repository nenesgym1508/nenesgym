"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings2, X, Minus, Plus, Ban, AlertTriangle } from "lucide-react"
import { adjustMembershipAction, cancelMembershipAction } from "@/actions/admin.actions"
import { LoadingButton } from "@/components/ui/loading-button"
import { MembershipBadge } from "@/components/ui/badge"
import { formatDate } from "@/lib/dates"
import { eligibleDaysElapsed, daysPerWeekForPlan, todayInBogota } from "@/lib/dates"
import { computeEffectiveStatus } from "@/lib/membership-status"
import type { MembershipStatus } from "@/types/membership"

interface AdjustMembershipModalProps {
  clientId: string
  clientName: string
  membershipId: string
  startDate: string
  totalDays: number
  endDate: string
  graceDays: number
  status: MembershipStatus
}

export function AdjustMembershipModal({
  clientId,
  clientName,
  membershipId,
  startDate,
  totalDays,
  endDate,
  graceDays,
  status,
}: AdjustMembershipModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(totalDays)
  const [vence, setVence] = useState(endDate)
  const [saveState, setSaveState] = useState<"idle" | "loading" | "error">("idle")
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "loading" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const reset = () => {
    setDays(totalDays)
    setVence(endDate)
    setSaveState("idle")
    setCancelState("idle")
    setErrorMsg("")
  }

  const close = () => {
    setOpen(false)
    setTimeout(reset, 200)
  }

  // Vista previa en vivo: mismas fórmulas que usa el resto de la app para
  // "días restantes" y el estado (activa/gracia/vencida/sin días).
  const today = todayInBogota()
  const elapsed = eligibleDaysElapsed(startDate, today, daysPerWeekForPlan(days))
  const remaining = Math.max(0, days - elapsed)
  const previewStatus = computeEffectiveStatus(elapsed, days, vence, graceDays, status === "cancelled" ? "active" : status)

  const dirty = days !== totalDays || vence !== endDate
  const valid = days > 0 && /^\d{4}-\d{2}-\d{2}$/.test(vence)

  const handleSave = async () => {
    if (!valid || !dirty) return
    setSaveState("loading")
    setErrorMsg("")
    const result = await adjustMembershipAction({
      membershipId,
      clientId,
      totalDays: days,
      endDate: vence,
    })
    if (result.error) {
      setErrorMsg(result.error)
      setSaveState("error")
    } else {
      router.refresh()
      close()
    }
  }

  const handleCancel = async () => {
    setCancelState("loading")
    setErrorMsg("")
    const result = await cancelMembershipAction(membershipId, clientId)
    if (result.error) {
      setErrorMsg(result.error)
      setCancelState("error")
    } else {
      router.refresh()
      close()
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
      >
        <Settings2 className="size-3.5" />
        Ajustar plan
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={close}
        >
          <div
            // max-h + scroll: sin esto, en una pantalla baja el modal se corta
            // por abajo y el botón de guardar queda inalcanzable. Le pasó al de
            // activar plan cuando el catálogo creció a 8 planes.
            className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-zinc-900 border border-white/10 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={close} className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300">
              <X className="size-5" />
            </button>

            <div className="mb-4">
              <h3 className="text-base font-bold text-zinc-100">Ajustar membresía</h3>
              <p className="text-xs text-zinc-500">{clientName}</p>
            </div>

            {cancelState !== "idle" ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-red-700/40 bg-red-950/20 p-3.5 flex gap-2.5">
                  <AlertTriangle className="size-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    ¿Seguro que quieres cancelar esta membresía? El cliente perderá el acceso de inmediato.
                    Queda en el historial como cancelada, no se borra.
                  </p>
                </div>
                {errorMsg && (
                  <p className="text-xs text-red-400">{errorMsg}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setCancelState("idle")}
                    disabled={cancelState === "loading"}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm text-zinc-300 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Volver
                  </button>
                  <LoadingButton
                    onClick={handleCancel}
                    pending={cancelState === "loading"}
                    pendingText="Cancelando..."
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Ban className="size-4" />
                    Sí, cancelar
                  </LoadingButton>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {/* Días totales */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Días totales</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDays((d) => Math.max(1, d - 1))}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors"
                        aria-label="Restar un día"
                      >
                        <Minus className="size-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={days}
                        onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-zinc-100 outline-none focus:border-red-600/50"
                      />
                      <button
                        onClick={() => setDays((d) => d + 1)}
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 transition-colors"
                        aria-label="Sumar un día"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Vencimiento */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">Fecha de vencimiento</label>
                    <input
                      type="date"
                      value={vence}
                      onChange={(e) => setVence(e.target.value)}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-600/50"
                    />
                  </div>

                  {/* Vista previa */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-zinc-100">{remaining} <span className="text-xs font-medium text-zinc-500">días restantes</span></p>
                      <p className="text-[11px] text-zinc-500">Vence: {formatDate(vence)}</p>
                    </div>
                    <MembershipBadge status={previewStatus} />
                  </div>

                  {saveState === "error" && (
                    <p className="text-xs text-red-400">{errorMsg}</p>
                  )}

                  <LoadingButton
                    onClick={handleSave}
                    pending={saveState === "loading"}
                    pendingText="Guardando..."
                    disabled={!valid || !dirty}
                    className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-red py-2.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    Guardar cambios
                  </LoadingButton>
                </div>

                <button
                  onClick={() => setCancelState("confirm")}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 text-xs font-medium text-red-500/80 hover:text-red-400 transition-colors"
                >
                  <Ban className="size-3.5" />
                  Cancelar esta membresía
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
