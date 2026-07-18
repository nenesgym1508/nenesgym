"use client"

import { useState } from "react"
import { Loader2, CheckCircle, Smartphone, CreditCard } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { updateGymSettingsAction } from "@/actions/admin.actions"

interface MediosDePagoFormProps {
  gymName: string
  gymGraceDays: number
  initialNequiNumber?: string | null
  initialNequiTitular?: string | null
  initialDaviplataNumber?: string | null
  initialDaviplataTitular?: string | null
}

export function MediosDePagoForm({
  gymName,
  gymGraceDays,
  initialNequiNumber,
  initialNequiTitular,
  initialDaviplataNumber,
  initialDaviplataTitular,
}: MediosDePagoFormProps) {
  const [nequiNumber, setNequiNumber] = useState(initialNequiNumber ?? "")
  const [nequiTitular, setNequiTitular] = useState(initialNequiTitular ?? "")
  const [daviplataNumber, setDaviplataNumber] = useState(initialDaviplataNumber ?? "")
  const [davaplataTitular, setDavaplataTitular] = useState(initialDaviplataTitular ?? "")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const result = await updateGymSettingsAction({
      name: gymName,
      graceDays: gymGraceDays,
      nequiNumber: nequiNumber.trim(),
      nequiTitular: nequiTitular.trim(),
      daviplataNumber: daviplataNumber.trim(),
      davaplataTitular: davaplataTitular.trim(),
    })
    setLoading(false)
    if (result?.error) {
      setMsg({ type: "err", text: result.error })
    } else {
      setMsg({ type: "ok", text: "Medios de pago actualizados correctamente" })
    }
  }

  return (
    <Card className="p-5 md:p-6 bg-[#0f0f11]/80 backdrop-blur-md border border-white/5 rounded-2xl shadow-xl shadow-black/40 space-y-5">
      <div className="flex items-center gap-2 pb-3 border-b border-white/5">
        <Smartphone className="size-5 text-zinc-400" />
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Configuración de Cuentas de Pago</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Define los números a los cuales tus clientes transferirán el pago.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bloque Nequi */}
          <div className="space-y-4 p-4 rounded-xl border border-fuchsia-500/10 bg-fuchsia-950/5">
            <div className="flex items-center gap-2 text-fuchsia-400 font-bold text-xs uppercase tracking-wider">
              <span className="size-2 rounded-full bg-fuchsia-500" />
              Configurar Nequi
            </div>
            <div className="space-y-3">
              <Input
                id="nequi_number"
                value={nequiNumber}
                onChange={(e) => setNequiNumber(e.target.value)}
                label="Número Nequi"
                placeholder="3232975867"
                type="tel"
              />
              <Input
                id="nequi_titular"
                value={nequiTitular}
                onChange={(e) => setNequiTitular(e.target.value)}
                label="Titular Nequi"
                placeholder="Nombre del titular"
              />
            </div>
          </div>

          {/* Bloque Daviplata */}
          <div className="space-y-4 p-4 rounded-xl border border-red-500/10 bg-red-950/5">
            <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
              <span className="size-2 rounded-full bg-red-500" />
              Configurar Daviplata
            </div>
            <div className="space-y-3">
              <Input
                id="daviplata_number"
                value={daviplataNumber}
                onChange={(e) => setDaviplataNumber(e.target.value)}
                label="Número Daviplata"
                placeholder="3232975867"
                type="tel"
              />
              <Input
                id="daviplata_titular"
                value={davaplataTitular}
                onChange={(e) => setDavaplataTitular(e.target.value)}
                label="Titular Daviplata"
                placeholder="Nombre del titular"
              />
            </div>
          </div>
        </div>

        {msg && (
          <p
            className={`text-sm px-4 py-3 rounded-xl flex items-start gap-2 animate-in fade-in duration-200 ${
              msg.type === "ok"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {msg.type === "ok" && <CheckCircle className="size-4 mt-0.5 shrink-0" />}
            {msg.text}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-11 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Guardando cambios...
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              Guardar Configuración de Medios de Pago
            </>
          )}
        </Button>
      </form>
    </Card>
  )
}
