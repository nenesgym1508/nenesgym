"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Play, Check, AlertTriangle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SuccessToast } from "@/components/ui/success-toast"
import { clientCheckInAction } from "@/actions/client.actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface ClientCheckInButtonProps {
  alreadyToday: boolean
  lastCheckedInAt?: string | null
}

export function ClientCheckInButton({
  alreadyToday,
  lastCheckedInAt,
}: ClientCheckInButtonProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ title: string; subtitle: string; message: string } | null>(null)

  async function handleCheckIn() {
    setLoading(true)
    setErrorMsg(null)
    setConfirmOpen(false)

    const result = await clientCheckInAction()
    setLoading(false)

    if (result.error) {
      setErrorMsg(result.error)
    } else if (result.success) {
      const now = new Date()
      const timeStr = format(now, "h:mm a", { locale: es })
      const dateStr = format(now, "d MMM yyyy", { locale: es })
      const remainingDays = result.remainingDays
      const daysText = remainingDays !== undefined ? ` · Te quedan ${remainingDays} días` : ""

      setSuccessData({
        title: "¡Entrada registrada!",
        subtitle: `${dateStr} · ${timeStr}`,
        message: `Buen entrenamiento 💪${daysText}`,
      })
      router.refresh()
    }
  }

  // Formatear hora de ingreso anterior
  const formattedLastTime = lastCheckedInAt
    ? format(new Date(lastCheckedInAt), "h:mm a", { locale: es })
    : null

  return (
    <div className="space-y-4">
      {successData && (
        <SuccessToast
          open={!!successData}
          title={successData.title}
          subtitle={successData.subtitle}
          message={successData.message}
          onClose={() => setSuccessData(null)}
        />
      )}

      {/* Botón Principal */}
      {alreadyToday ? (
        <div className="space-y-3">
          <Button
            disabled
            className="w-full h-14 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-semibold cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Check className="size-5" />
            Ingreso completado hoy
          </Button>
          {formattedLastTime && (
            <p className="text-center text-xs text-zinc-500">
              Registrado a las {formattedLastTime}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setConfirmOpen(true)}
          disabled={loading}
          className="w-full text-left block -mt-[7%] -mb-[8%] animate-btn-heartbeat cursor-pointer outline-none focus:outline-none border-none bg-transparent p-0 disabled:opacity-50"
        >
          <Image
            src="/btn-registrar.webp"
            alt="Registrar entrada"
            width={2172}
            height={724}
            className="w-full h-auto"
            priority
          />
        </button>
      )}

      {/* Mensaje de error amigable */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 flex items-start gap-2.5">
          <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-red-400">No se pudo registrar la entrada</p>
            <p className="text-xs text-zinc-400">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Modal de Confirmación */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/80 p-0 sm:items-center sm:p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-t-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-zinc-100 uppercase font-bebas tracking-wide">Confirmar ingreso</h3>
              <p className="text-sm text-zinc-400">
                ¿Confirmas que estás ingresando al gimnasio en este momento?
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-11 rounded-lg border border-white/10 bg-transparent text-zinc-400 hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCheckIn}
                className="flex-1 h-11 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold"
              >
                Sí, ingresar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
