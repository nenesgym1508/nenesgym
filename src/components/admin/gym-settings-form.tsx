"use client"

import { useState } from "react"
import { Loader2, CheckCircle, Building2, Smartphone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { updateGymSettingsAction } from "@/actions/admin.actions"

interface GymSettingsFormProps {
  initialName: string
  initialGraceDays: number
  initialNequiNumber?: string | null
  initialNequiTitular?: string | null
  initialDaviplataNumber?: string | null
  initialDavaplataTitular?: string | null
}

export function GymSettingsForm({
  initialName,
  initialGraceDays,
  initialNequiNumber,
  initialNequiTitular,
  initialDaviplataNumber,
  initialDavaplataTitular,
}: GymSettingsFormProps) {
  const [name, setName] = useState(initialName)
  const [graceDays, setGraceDays] = useState(String(initialGraceDays))
  const [nequiNumber, setNequiNumber] = useState(initialNequiNumber ?? "")
  const [nequiTitular, setNequiTitular] = useState(initialNequiTitular ?? "")
  const [daviplataNumber, setDaviplataNumber] = useState(initialDaviplataNumber ?? "")
  const [davaplataTitular, setDavaplataTitular] = useState(initialDavaplataTitular ?? "")
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)
    const result = await updateGymSettingsAction({
      name: name.trim(),
      graceDays: Number(graceDays),
      nequiNumber,
      nequiTitular,
      daviplataNumber,
      davaplataTitular,
    })
    setLoading(false)
    if (result?.error) setMsg({ type: "err", text: result.error })
    else setMsg({ type: "ok", text: "Configuración guardada" })
  }

  return (
    <div className="space-y-4">
      {/* Datos del gimnasio */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Datos del gimnasio</h3>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <Input
            id="gym_name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            label="Nombre del gimnasio"
            placeholder="NENE'S GYM"
          />
          <Input
            id="grace_days"
            type="number"
            min={0}
            max={60}
            value={graceDays}
            onChange={(e) => setGraceDays(e.target.value)}
            label="Días de gracia"
            placeholder="5"
          />
          <p className="text-xs text-zinc-600">
            Días extra que un cliente puede seguir entrando después de que vence su membresía.
          </p>

          {/* Cuentas de pago */}
          <div className="pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="size-4 text-zinc-400" />
              <h4 className="text-sm font-semibold text-zinc-200">Cuentas de pago</h4>
            </div>
            <p className="text-xs text-zinc-600 mb-3">
              La IA verifica que los comprobantes sean enviados a estas cuentas.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="nequi_number"
                value={nequiNumber}
                onChange={(e) => setNequiNumber(e.target.value)}
                label="Número Nequi"
                placeholder="3001234567"
              />
              <Input
                id="nequi_titular"
                value={nequiTitular}
                onChange={(e) => setNequiTitular(e.target.value)}
                label="Titular Nequi"
                placeholder="Nombre completo"
              />
              <Input
                id="daviplata_number"
                value={daviplataNumber}
                onChange={(e) => setDaviplataNumber(e.target.value)}
                label="Número Daviplata"
                placeholder="3001234567"
              />
              <Input
                id="daviplata_titular"
                value={davaplataTitular}
                onChange={(e) => setDavaplataTitular(e.target.value)}
                label="Titular Daviplata"
                placeholder="Nombre completo"
              />
            </div>
          </div>

          {msg && (
            <p
              className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
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
            disabled={loading || !name.trim()}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-10"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
