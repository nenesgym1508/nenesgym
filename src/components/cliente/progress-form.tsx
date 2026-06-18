"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle, Plus } from "lucide-react"
import { progressRecordSchema } from "@/schemas/progress.schema"
import { addProgressRecord } from "@/actions/progress.actions"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { z } from "zod"

type ProgressInput = z.infer<typeof progressRecordSchema>

export function ProgressForm() {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProgressInput>({ resolver: zodResolver(progressRecordSchema) })

  const onSubmit = async (data: ProgressInput) => {
    setServerError(null)
    const result = await addProgressRecord({
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      note: data.note,
    })
    if (result.error) {
      setServerError(result.error)
    } else {
      setSuccess(true)
      reset()
      setTimeout(() => {
        setSuccess(false)
        setOpen(false)
      }, 2000)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 py-4 text-sm text-zinc-500 hover:border-white/25 hover:text-zinc-400 transition-colors"
      >
        <Plus className="size-4" />
        Registrar medidas
      </button>
    )
  }

  if (success) {
    return (
      <Card className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="size-8 text-green-400" />
        <p className="font-medium text-zinc-200">Registro guardado</p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">Nueva medición</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="weight"
            type="number"
            step="0.1"
            label="Peso (kg)"
            placeholder="70.5"
            error={errors.weight_kg?.message}
            {...register("weight_kg", { valueAsNumber: true })}
          />
          <Input
            id="height"
            type="number"
            step="0.1"
            label="Estatura (cm)"
            placeholder="175"
            error={errors.height_cm?.message}
            {...register("height_cm", { valueAsNumber: true })}
          />
        </div>
        <Textarea
          id="note"
          label="Nota (opcional)"
          placeholder="Cómo te sientes hoy..."
          rows={2}
          error={errors.note?.message}
          {...register("note")}
        />

        {serverError && (
          <p className="text-sm text-red-400">{serverError}</p>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
          </Button>
        </div>
      </form>
    </Card>
  )
}
