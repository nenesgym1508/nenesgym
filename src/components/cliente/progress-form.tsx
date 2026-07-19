"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle, Plus, X, Pencil, ChevronDown, ChevronUp } from "lucide-react"
import { progressRecordSchema } from "@/schemas/progress.schema"
import { addProgressRecord } from "@/actions/progress.actions"
import { Input, Textarea } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { z } from "zod"
import type { ProgressRecord } from "@/types/progress"

type ProgressInput = z.infer<typeof progressRecordSchema>

interface ProgressFormProps {
  todayRecord?: ProgressRecord | null
  latestHeightCm?: number | null
}

export function ProgressForm({ todayRecord, latestHeightCm }: ProgressFormProps) {
  const [open, setOpen] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [optionalOpen, setOptionalOpen] = useState(
    !!(todayRecord && (todayRecord.waist_cm != null || todayRecord.chest_cm != null || todayRecord.arm_cm != null || todayRecord.leg_cm != null || todayRecord.note))
  )

  const isEdit = !!todayRecord

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProgressInput>({
    resolver: zodResolver(progressRecordSchema),
    defaultValues: todayRecord
      ? {
          weight_kg: todayRecord.weight_kg ?? undefined,
          height_cm: todayRecord.height_cm ?? undefined,
          waist_cm: todayRecord.waist_cm ?? undefined,
          chest_cm: todayRecord.chest_cm ?? undefined,
          arm_cm: todayRecord.arm_cm ?? undefined,
          leg_cm: todayRecord.leg_cm ?? undefined,
          note: todayRecord.note ?? undefined,
        }
      : latestHeightCm != null
        ? { height_cm: latestHeightCm }
        : undefined,
  })

  const onSubmit = async (data: ProgressInput) => {
    setServerError(null)
    const result = await addProgressRecord({
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      waist_cm: data.waist_cm,
      chest_cm: data.chest_cm,
      arm_cm: data.arm_cm,
      leg_cm: data.leg_cm,
      note: data.note,
    })
    if (result.error) {
      setServerError(result.error)
    } else {
      setSuccess(true)
      if (!isEdit) reset()
      setTimeout(() => {
        setSuccess(false)
        setOpen(false)
      }, 1800)
    }
  }

  const handleClose = () => {
    if (!isEdit) reset()
    setServerError(null)
    setSuccess(false)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="group relative w-full flex items-center justify-center gap-2.5 bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white rounded-2xl py-4 text-sm font-black uppercase tracking-wide shadow-[0_0_20px_rgba(220,38,38,0.15)] hover:shadow-[0_0_30px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 border border-red-500/30 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
        <Plus className="size-5 text-white/90 group-hover:text-white transition-colors" />
        <span className="relative z-10">{isEdit ? "Modificar medición" : "Registrar nueva medición"}</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 md:backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-zinc-100">
                {isEdit ? "Editar medición de hoy" : "Nueva medición"}
              </h3>
              <button
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                aria-label="Cerrar"
              >
                <X className="size-4" />
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15">
                  <CheckCircle className="size-6 text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-zinc-200">Registro guardado</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Tus medidas fueron guardadas correctamente
                  </p>
                </div>
              </div>
            ) : (
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
                {/* Medidas opcionales */}
                <div className="rounded-2xl border border-white/8 bg-zinc-900/40 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOptionalOpen((v) => !v)}
                    className="flex w-full items-center justify-between px-3.5 py-2.5 text-left"
                  >
                    <span className="text-sm font-medium text-zinc-300">Medidas opcionales</span>
                    {optionalOpen ? (
                      <ChevronUp className="size-4 text-zinc-500" />
                    ) : (
                      <ChevronDown className="size-4 text-zinc-500" />
                    )}
                  </button>

                  {optionalOpen && (
                    <div className="space-y-3 border-t border-white/8 px-3.5 pb-3.5 pt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          id="waist"
                          type="number"
                          step="0.1"
                          label="Cintura (cm)"
                          placeholder="80"
                          error={errors.waist_cm?.message}
                          {...register("waist_cm", { setValueAs: (v: string) => v === "" ? undefined : parseFloat(v) })}
                        />
                        <Input
                          id="chest"
                          type="number"
                          step="0.1"
                          label="Pecho (cm)"
                          placeholder="95"
                          error={errors.chest_cm?.message}
                          {...register("chest_cm", { setValueAs: (v: string) => v === "" ? undefined : parseFloat(v) })}
                        />
                        <Input
                          id="arm"
                          type="number"
                          step="0.1"
                          label="Brazo (cm)"
                          placeholder="35"
                          error={errors.arm_cm?.message}
                          {...register("arm_cm", { setValueAs: (v: string) => v === "" ? undefined : parseFloat(v) })}
                        />
                        <Input
                          id="leg"
                          type="number"
                          step="0.1"
                          label="Pierna (cm)"
                          placeholder="55"
                          error={errors.leg_cm?.message}
                          {...register("leg_cm", { setValueAs: (v: string) => v === "" ? undefined : parseFloat(v) })}
                        />
                      </div>
                      <Textarea
                        id="note"
                        label="Nota"
                        placeholder="Cómo te sientes hoy..."
                        rows={2}
                        error={errors.note?.message}
                        {...register("note")}
                      />
                    </div>
                  )}
                </div>

                {serverError && (
                  <p className="text-sm text-red-400">{serverError}</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
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
            )}
          </div>
        </div>
      )}
    </>
  )
}
