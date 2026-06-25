"use client"

import { useEffect, useId, useRef, useState } from "react"
import { QrCode, XCircle, AlertCircle, Camera, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Card } from "@/components/ui/card"
import { SuccessToast } from "@/components/ui/success-toast"

type ScanStatus = "idle" | "scanning" | "loading" | "success" | "error" | "already" | "no_days"

interface SuccessInfo {
  subtitle: string
  message: string
}

const STATUS_CONFIG = {
  idle: { color: "", message: "" },
  scanning: { color: "text-zinc-400", message: "Apunta la cámara al QR del gimnasio" },
  loading: { color: "text-zinc-400", message: "Registrando ingreso..." },
  success: { color: "text-green-400", message: "¡Ingreso registrado!" },
  error: { color: "text-red-400", message: "" },
  already: { color: "text-yellow-400", message: "Ya registraste tu ingreso hoy" },
  no_days: { color: "text-orange-400", message: "No tienes días disponibles" },
}

export default function QrScanner() {
  const scannerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<InstanceType<typeof import("html5-qrcode")["Html5Qrcode"]> | null>(null)
  const readerId = "qr-reader-" + useId().replace(/:/g, "")
  const [status, setStatus] = useState<ScanStatus>("idle")
  const [message, setMessage] = useState("")
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [success, setSuccess] = useState<SuccessInfo | null>(null)

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      if (!scannerRef.current) return

      scannerRef.current.id = readerId

      const qr = new Html5Qrcode(readerId)
      qrRef.current = qr

      setStatus("scanning")
      setCameraError(null)

      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await qr.stop().catch(() => {})
          await processCheckIn(decodedText)
        },
        () => {}
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCameraError("No se pudo acceder a la cámara. " + msg)
      setStatus("idle")
    }
  }

  const stopScanner = async () => {
    if (qrRef.current) {
      await qrRef.current.stop().catch(() => {})
      qrRef.current = null
    }
    setStatus("idle")
  }

  const processCheckIn = async (token: string) => {
    setStatus("loading")
    try {
      const res = await fetch("/api/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()

      if (data.ok) {
        const now = new Date()
        const fecha = format(now, "d MMM yyyy", { locale: es })
        const hora = format(now, "h:mm a", { locale: es })
        const dias =
          data.remaining_days != null ? ` · Te quedan ${data.remaining_days} días` : ""
        setSuccess({
          subtitle: `${fecha} · ${hora}`,
          message: `Buen entrenamiento 💪${dias}`,
        })
        setStatus("idle")
        setMessage("")
      } else {
        if (data.code === "ALREADY_TODAY") {
          setStatus("already")
          setMessage(data.message)
        } else if (data.code === "NO_DAYS" || data.code === "EXHAUSTED") {
          setStatus("no_days")
          setMessage(data.message)
        } else {
          setStatus("error")
          setMessage(data.message ?? "Error al registrar ingreso")
        }
      }
    } catch {
      setStatus("error")
      setMessage("Error de red. Intenta de nuevo.")
    }
  }

  const reset = () => {
    setStatus("idle")
    setMessage("")
  }

  useEffect(() => {
    return () => {
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {})
      }
    }
  }, [])

  if (status === "already" || status === "no_days" || status === "error") {
    const cfg = STATUS_CONFIG[status]
    return (
      <Card className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="size-16 rounded-full bg-white/5 flex items-center justify-center">
          {status === "already" ? (
            <AlertCircle className="size-8 text-yellow-400" />
          ) : (
            <XCircle className="size-8 text-red-400" />
          )}
        </div>
        <div>
          <p className={`text-sm font-semibold ${cfg.color}`}>
            {cfg.message || message}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{message}</p>
        </div>
        <button
          onClick={reset}
          className="text-sm text-red-500 hover:text-red-400 mt-2"
        >
          Intentar de nuevo
        </button>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <SuccessToast
        open={success !== null}
        title="Entrada registrada"
        subtitle={success?.subtitle}
        message={success?.message}
        onClose={() => setSuccess(null)}
      />

      {/* Visor de cámara */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 aspect-square max-w-sm mx-auto">
        <div ref={scannerRef} className="w-full h-full" />

        {status === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
            <div className="size-20 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center">
              <QrCode className="size-10 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500 text-center px-8">
              Presiona el botón para activar la cámara y escanear el QR
            </p>
          </div>
        )}

        {status === "scanning" && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Marco del escáner */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-56 relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-red-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-red-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-red-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-red-500 rounded-br-lg" />
              </div>
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="size-8 text-red-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Error de cámara */}
      {cameraError && (
        <p className="text-xs text-red-400 text-center">{cameraError}</p>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        {status === "idle" ? (
          <button
            onClick={startScanner}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
          >
            <Camera className="size-5" />
            Activar cámara
          </button>
        ) : status === "scanning" ? (
          <button
            onClick={stopScanner}
            className="flex-1 h-12 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      {/* Ingreso manual */}
      {status === "idle" && (
        <ManualCheckin onToken={processCheckIn} />
      )}
    </div>
  )
}

function ManualCheckin({ onToken }: { onToken: (token: string) => void }) {
  const [show, setShow] = useState(false)
  const [token, setToken] = useState("")

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="w-full text-xs text-zinc-600 hover:text-zinc-400 py-2 transition-colors"
      >
        ¿No funciona la cámara? Ingresar código manualmente
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Pega aquí el código del gimnasio"
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-red-600"
      />
      <button
        onClick={() => { if (token.trim()) onToken(token.trim()) }}
        disabled={!token.trim()}
        className="w-full h-10 rounded-lg bg-red-600/20 border border-red-600/40 text-red-400 text-sm font-medium disabled:opacity-50 hover:bg-red-600/30 transition-colors"
      >
        Registrar ingreso
      </button>
    </div>
  )
}
