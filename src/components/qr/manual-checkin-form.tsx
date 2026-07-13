"use client"

import { useEffect, useRef, useState } from "react"
import { KeyRound } from "lucide-react"
import { LoadingButton } from "@/components/ui/loading-button"
import type { UseCheckIn } from "@/components/qr/use-check-in"

interface ManualCheckinFormProps {
  checkIn: UseCheckIn
}

export function ManualCheckinForm({ checkIn }: ManualCheckinFormProps) {
  const [code, setCode] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const isLoading = checkIn.status === "loading"
  const isNumeric = code.length > 0 && /^[0-9]+$/.test(code)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim() || isLoading) return
    checkIn.submit(code, "manual")
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-zinc-900 py-10 px-6 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-700">
          <KeyRound className="size-7 text-zinc-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">Ingresa el código del gimnasio</p>
          <p className="mt-1 text-xs text-zinc-500 max-w-xs">
            Pídelo en recepción o pégalo si lo copiaste del QR del gimnasio.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\s+/g, ""))}
        placeholder="Código del gimnasio"
        inputMode={isNumeric ? "numeric" : "text"}
        autoCapitalize="characters"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={isLoading}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-center text-base font-medium tracking-wide text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-red-600 disabled:opacity-50"
      />

      <LoadingButton
        type="submit"
        pending={isLoading}
        pendingText="Registrando..."
        disabled={!code.trim()}
        className="flex w-full items-center justify-center gap-2 h-12 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:hover:bg-red-600"
      >
        Registrar ingreso
      </LoadingButton>
    </form>
  )
}
