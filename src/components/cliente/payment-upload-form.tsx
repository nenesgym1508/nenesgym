"use client"

import { useState, useRef } from "react"
import { Loader2, Upload, CheckCircle } from "lucide-react"
import { uploadPaymentAction } from "@/actions/payments.actions"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatCOP } from "@/lib/utils"
import { PAYMENT_METHOD_LABELS } from "@/constants/plans"
import type { Plan } from "@/types/payment"

interface PaymentUploadFormProps {
  plans: Plan[]
}

const METHODS = Object.entries(PAYMENT_METHOD_LABELS) as [keyof typeof PAYMENT_METHOD_LABELS, string][]

export function PaymentUploadForm({ plans }: PaymentUploadFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [method, setMethod] = useState("nequi")
  const [customAmount, setCustomAmount] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const amountCents = selectedPlan
    ? selectedPlan.price_cents
    : parseInt(customAmount) * 100 || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amountCents || amountCents <= 0) {
      setErrorMsg("Ingresa el monto del pago")
      setStatus("error")
      return
    }
    setStatus("loading")
    setErrorMsg("")

    const fd = new FormData()
    if (selectedPlan) fd.append("plan_id", selectedPlan.id)
    fd.append("amount_cents", String(amountCents))
    fd.append("method", method)
    if (file) fd.append("receipt", file)

    const result = await uploadPaymentAction(fd)
    if (result.error) {
      setErrorMsg(result.error)
      setStatus("error")
    } else {
      setStatus("success")
      setSelectedPlan(null)
      setFile(null)
      setCustomAmount("")
      formRef.current?.reset()
    }
  }

  if (status === "success") {
    return (
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="size-12 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle className="size-6 text-green-400" />
        </div>
        <p className="font-semibold text-zinc-100">¡Pago enviado!</p>
        <p className="text-sm text-zinc-500">
          Tu comprobante está siendo revisado. Te avisaremos cuando sea aprobado.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm text-red-500 hover:text-red-400 mt-1"
        >
          Enviar otro pago
        </button>
      </Card>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
        Nuevo pago
      </h3>

      {/* Selección de plan */}
      {plans.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300">Selecciona un plan</label>
          <div className="grid grid-cols-1 gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left transition-colors ${
                  selectedPlan?.id === plan.id
                    ? "border-red-600 bg-red-600/10 text-red-400"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
                }`}
              >
                <span className="text-sm font-medium">{plan.name}</span>
                <span className="text-sm font-semibold">{formatCOP(plan.price_cents)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monto personalizado si no hay plan */}
      {!selectedPlan && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Monto a pagar (COP)</label>
          <input
            type="number"
            placeholder="Ej: 80000"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
          />
        </div>
      )}

      {/* Método de pago */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Método de pago</label>
        <div className="grid grid-cols-2 gap-2">
          {METHODS.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMethod(key)}
              className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                method === key
                  ? "border-red-600 bg-red-600/10 text-red-400"
                  : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Comprobante */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">
          Comprobante de pago{" "}
          <span className="text-zinc-500 font-normal">(opcional)</span>
        </label>
        <label className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-white/15 p-4 cursor-pointer hover:border-white/25 transition-colors">
          <Upload className="size-5 text-zinc-500" />
          <span className="text-sm text-zinc-500">
            {file ? file.name : "Toca para subir foto o PDF"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {status === "error" && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
          {errorMsg}
        </p>
      )}

      {amountCents > 0 && (
        <p className="text-center text-sm text-zinc-400">
          Total: <span className="font-bold text-zinc-100">{formatCOP(amountCents)}</span>
        </p>
      )}

      <Button
        type="submit"
        disabled={status === "loading" || amountCents <= 0}
        className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold"
      >
        {status === "loading" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Enviar pago"
        )}
      </Button>
    </form>
  )
}
