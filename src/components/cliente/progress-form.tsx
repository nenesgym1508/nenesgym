"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle, Plus } from "lucide-react"
import { progressRecordSchema } from "@/schemas/progress.schema"
import { addProgressRecord } from "@/actions/progress.actions"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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
        className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] py-4 text-sm font-medium text-zinc-500 transition-all hover:border-red-600/40 hover:bg-red-950/20 hover:text-zinc-300"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 transition-colors group-hover:bg-red-600/20">
          <Plus className="size-3.5 transition-colors group-hover:text-red-400" />
        </div>
        Registrar nueva medición
      </button>
    )
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-green-900/40 bg-green-950/20 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
          <CheckCircle className="size-6 text-green-400" />
        </div>
        <div>
          <p className="font-semibold text-zinc-200">Registro guardado</p>
          <p className="mt-0.5 text-xs text-zinc-500">Tus medidas fueron guardadas correctamente</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-zinc-900/60 p-4">
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
    </div>
  )
}
