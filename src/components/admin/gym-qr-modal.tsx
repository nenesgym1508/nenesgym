"use client"

import { useEffect, useState } from "react"
import QRCode from "qrcode"
import { QrCode, X, Loader2 } from "lucide-react"

interface GymQrModalProps {
  token: string
  gymName: string
}

export function GymQrModal({ token, gymName }: GymQrModalProps) {
  const [open, setOpen] = useState(false)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (open && !dataUrl) {
      QRCode.toDataURL(token, {
        width: 360,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
        errorCorrectionLevel: "M",
      })
        .then(setDataUrl)
        .catch(() => setDataUrl(null))
    }
  }, [open, token, dataUrl])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
      >
        <QrCode className="size-4" />
        QR de ingreso
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-white/10 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
            >
              <X className="size-5" />
            </button>

            <div className="text-center space-y-1 mb-5">
              <h3 className="text-lg font-bold text-zinc-100">{gymName}</h3>
              <p className="text-xs text-zinc-500">
                Los clientes escanean este código desde la app para registrar su ingreso
              </p>
            </div>

            <div className="flex items-center justify-center rounded-xl bg-white p-4 mx-auto w-fit">
              {dataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dataUrl} alt="QR de ingreso del gimnasio" className="size-64" />
              ) : (
                <div className="size-64 flex items-center justify-center">
                  <Loader2 className="size-8 text-zinc-400 animate-spin" />
                </div>
              )}
            </div>

            <p className="text-center text-[10px] text-zinc-600 mt-4 break-all">
              Código: {token}
            </p>
            <p className="text-center text-xs text-zinc-500 mt-3">
              Imprime y pega este QR en la entrada del gimnasio
            </p>
          </div>
        </div>
      )}
    </>
  )
}
