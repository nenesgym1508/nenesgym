"use client"

import { useState } from "react"
import { AlertCircle, XCircle, QrCode, KeyRound } from "lucide-react"
import { Card } from "@/components/ui/card"
import { SuccessToast } from "@/components/ui/success-toast"
import { useCheckIn } from "@/components/qr/use-check-in"
import QrScanner from "@/components/qr/qr-scanner"
import { ManualCheckinForm } from "@/components/qr/manual-checkin-form"

type Tab = "qr" | "manual"

export default function EntradaTabs() {
  const [tab, setTab] = useState<Tab>("qr")
  const checkIn = useCheckIn()

  const switchTo = (next: Tab) => {
    checkIn.reset()
    setTab(next)
  }

  return (
    <div className="space-y-4">
      <SuccessToast
        open={checkIn.success !== null}
        title="Entrada registrada"
        subtitle={checkIn.success?.subtitle}
        message={checkIn.success?.message}
        onClose={checkIn.clearSuccess}
      />

      {/* Selector Escanear QR / Código manual */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-zinc-900 p-1">
        <button
          type="button"
          onClick={() => switchTo("qr")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            tab === "qr" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <QrCode className="size-4" />
          Escanear QR
        </button>
        <button
          type="button"
          onClick={() => switchTo("manual")}
          className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
            tab === "manual" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <KeyRound className="size-4" />
          Código manual
        </button>
      </div>

      {/* Resultado bloqueante (ya registrado hoy / sin días / error) */}
      {(checkIn.status === "already" || checkIn.status === "no_days" || checkIn.status === "error") && (
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="size-14 rounded-full bg-white/5 flex items-center justify-center">
            {checkIn.status === "already" ? (
              <AlertCircle className="size-7 text-yellow-400" />
            ) : (
              <XCircle className="size-7 text-red-400" />
            )}
          </div>
          <p className="text-sm font-semibold text-zinc-200 px-4">{checkIn.message}</p>
          <button
            type="button"
            onClick={checkIn.reset}
            className="text-sm text-red-500 hover:text-red-400 cursor-pointer"
          >
            Intentar de nuevo
          </button>
        </Card>
      )}

      {tab === "qr" ? (
        <>
          <p className="text-center text-sm text-zinc-400">
            Escanea el código QR del gimnasio para registrar tu ingreso
          </p>
          <QrScanner checkIn={checkIn} onSwitchToManual={() => switchTo("manual")} />
        </>
      ) : (
        <ManualCheckinForm checkIn={checkIn} />
      )}
    </div>
  )
}
