"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/constants/routes"
import { createClientRoutineAction } from "@/actions/routines.actions"
import { ROUTINE_GOAL_LABELS, ROUTINE_LEVEL_LABELS, type RoutineGoal, type RoutineLevel } from "@/types/routine"

export function NuevaRutinaFlow() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [goal, setGoal] = useState<RoutineGoal | "">("")
  const [level, setLevel] = useState<RoutineLevel | "">("")
  const [daysPerWeek, setDaysPerWeek] = useState("")
  const [notes, setNotes] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    const res = await createClientRoutineAction({
      title: title.trim(),
      description: description || undefined,
      goal: goal ? goal : undefined,
      level: level ? level : undefined,
      days_per_week: daysPerWeek ? parseInt(daysPerWeek) : undefined,
      notes: notes || undefined
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
      {/* Header */}
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

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-5">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-zinc-400">Título de la rutina *</label>
            <input
              type="text"
              required
              placeholder="Ej. Mi rutina de volumen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400">Descripción (Opcional)</label>
            <textarea
              placeholder="Ej. Enfoque hipertrofia tren superior"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-400">Objetivo</label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as RoutineGoal)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              >
                <option value="">Selecciona</option>
                {Object.entries(ROUTINE_GOAL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-400">Nivel</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as RoutineLevel)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              >
                <option value="">Selecciona</option>
                {Object.entries(ROUTINE_LEVEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400">Días de entrenamiento por semana</label>
            <input
              type="number"
              min={1}
              max={7}
              placeholder="Ej. 4"
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400">Notas de entrenamiento</label>
            <textarea
              placeholder="Notas generales de calentamiento u observaciones..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50 resize-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <><Check className="size-4" /> Crear y Diseñar Rutina</>
          )}
        </button>
      </form>
    </div>
  )
}
