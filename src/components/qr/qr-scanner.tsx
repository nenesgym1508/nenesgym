"use client"

import { useEffect, useId, useRef, useState } from "react"
import { QrCode, Camera, Loader2, KeyRound } from "lucide-react"
import type { UseCheckIn } from "@/components/qr/use-check-in"

type CamStatus = "idle" | "scanning"

interface QrScannerProps {
  checkIn: UseCheckIn
  onSwitchToManual: () => void
}

export default function QrScanner({ checkIn, onSwitchToManual }: QrScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const qrRef = useRef<InstanceType<typeof import("html5-qrcode")["Html5Qrcode"]> | null>(null)
  const readerId = "qr-reader-" + useId().replace(/:/g, "")
  const [camStatus, setCamStatus] = useState<CamStatus>("idle")
  const [cameraError, setCameraError] = useState<{ message: string; permissionDenied: boolean } | null>(null)

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      if (!scannerRef.current) return

      // Si ya existe una instancia previa, asegurar su detención antes de reiniciarla
      if (qrRef.current) {
        await qrRef.current.stop().catch(() => {})
        qrRef.current = null
      }

      scannerRef.current.id = readerId

      const qr = new Html5Qrcode(readerId)
      qrRef.current = qr

      setCamStatus("scanning")
      setCameraError(null)

      try {
        // Intentar primero con la cámara trasera (ideal para móvil)
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await qr.stop().catch(() => {})
            setCamStatus("idle")
            await checkIn.submit(decodedText, "qr")
          },
          () => {}
        )
      } catch (environmentError) {
        console.warn("No se detectó cámara trasera, probando con cámara frontal/webcam:", environmentError)
        // Fallback a cámara frontal/webcam (ideal para laptops, PC o emuladores)
        await qr.start(
          { facingMode: "user" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            await qr.stop().catch(() => {})
            setCamStatus("idle")
            await checkIn.submit(decodedText, "qr")
          },
          () => {}
        )
      }
    } catch (err) {
      console.error("Error al iniciar escáner QR:", err)
      const name = err instanceof DOMException ? err.name : ""
      const isTypeError = err instanceof TypeError
      const permissionDenied = name === "NotAllowedError" || name === "PermissionDeniedError"

      let errorMessage = "No se pudo acceder a la cámara."
      if (permissionDenied) {
        errorMessage = "Permiso de cámara rechazado. Habilita el acceso en tu navegador."
      } else if (isTypeError || (typeof window !== "undefined" && !navigator?.mediaDevices)) {
        errorMessage = "La cámara requiere una conexión segura (HTTPS o localhost) o no es soportada."
      }

      setCameraError({
        message: errorMessage,
        permissionDenied,
      })
      setCamStatus("idle")
      if (qrRef.current) {
        qrRef.current.clear()
        qrRef.current = null
      }
    }
  }

  const stopScanner = async () => {
    if (qrRef.current) {
      await qrRef.current.stop().catch(() => {})
      qrRef.current = null
    }
    setCamStatus("idle")
  }

  useEffect(() => {
    return () => {
      if (qrRef.current) {
        qrRef.current.stop().catch(() => {})
      }
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Visor de cámara */}
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 aspect-square max-w-sm mx-auto">
        <div ref={scannerRef} className="w-full h-full" />

        {camStatus === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
            <div className="size-20 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center">
              <QrCode className="size-10 text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-500 text-center px-8">
              Presiona el botón para activar la cámara y escanear el QR
            </p>
          </div>
        )}

        {camStatus === "scanning" && (
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

        {checkIn.status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <Loader2 className="size-8 text-red-500 animate-spin" />
          </div>
        )}
      </div>

      {/* Error de cámara */}
      {cameraError && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-xs text-red-400">{cameraError.message}</p>
          <button
            type="button"
            onClick={onSwitchToManual}
            className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors"
          >
            <KeyRound className="size-3.5" />
            Usar código manual
          </button>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3">
        {camStatus === "idle" ? (
          <button
            onClick={startScanner}
            disabled={checkIn.status === "loading"}
            className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Camera className="size-5" />
            Activar cámara
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex-1 h-12 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
