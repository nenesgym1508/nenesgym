"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/constants/routes"
import { createClientRoutineAction } from "@/actions/routines.actions"
import { RoutineBasicForm, EMPTY_ROUTINE_BASIC_FORM_VALUES, type RoutineBasicFormValues } from "@/components/routine/routine-basic-form"

export function NuevaRutinaFlow() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [values, setValues] = useState<RoutineBasicFormValues>(EMPTY_ROUTINE_BASIC_FORM_VALUES)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.title.trim()) return
    if (values.goal === "otro" && !values.customGoal.trim()) return

    setLoading(true)
    const res = await createClientRoutineAction({
      title: values.title.trim(),
      goal: values.goal ? values.goal : undefined,
      custom_goal: values.goal === "otro" ? values.customGoal.trim() : undefined,
      level: values.level ? values.level : undefined,
      days_per_week: values.daysPerWeek ? parseInt(values.daysPerWeek) : undefined,
      notes: values.notes || undefined
    })
    setLoading(false)

    if (res.success && res.id) {
      router.push(`/cliente/rutinas/${res.id}`)
    } else {
      alert(res.error || "Ocurrió un error al crear la rutina.")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      <div className="sticky top-0 z-40 border-b border-white/8 bg-zinc-950/90 backdrop-blur-md px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.CLIENTE_RUTINAS}
            className="rounded-lg p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-sm font-semibold text-zinc-200">Nueva Rutina</h1>
        </div>
      </div>

      <div className="px-4 py-6">
        <RoutineBasicForm
          values={values}
          onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </div>
    </div>
  )
}
