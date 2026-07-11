"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronDown, Check, Loader2 } from "lucide-react"
import Link from "next/link"
import { ROUTES } from "@/constants/routes"
import { createClientRoutineAction } from "@/actions/routines.actions"
import { ChipSelect } from "@/components/ui/chip-select"
import { CLIENT_ROUTINE_GOAL_LABELS, ROUTINE_LEVEL_LABELS, type ClientRoutineGoal, type RoutineLevel } from "@/types/routine"

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6]

export function NuevaRutinaFlow() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [goal, setGoal] = useState<ClientRoutineGoal | "">("")
  const [customGoal, setCustomGoal] = useState("")
  const [level, setLevel] = useState<RoutineLevel | "">("general")
  const [daysPerWeek, setDaysPerWeek] = useState("")
  const [notes, setNotes] = useState("")
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (goal === "otro" && !customGoal.trim()) return

    setLoading(true)
    const res = await createClientRoutineAction({
      title: title.trim(),
      goal: goal ? goal : undefined,
      custom_goal: goal === "otro" ? customGoal.trim() : undefined,
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

      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        <div>
          <label className="text-xs font-semibold text-zinc-400">Nombre *</label>
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
          <label className="text-xs font-semibold text-zinc-400">¿Cuántos días vas a entrenar?</label>
          <div className="mt-2">
            <ChipSelect
              options={DAYS_PER_WEEK_OPTIONS.map((n) => ({ value: String(n), label: n === 1 ? "1 día" : `${n} días` }))}
              value={daysPerWeek}
              onChange={setDaysPerWeek}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-400">Objetivo</label>
          <div className="mt-2">
            <ChipSelect
              options={Object.entries(CLIENT_ROUTINE_GOAL_LABELS).map(([k, v]) => ({ value: k as ClientRoutineGoal, label: v }))}
              value={goal}
              onChange={setGoal}
            />
          </div>
          {goal === "otro" && (
            <input
              type="text"
              required
              autoFocus
              maxLength={60}
              placeholder="Escribe tu objetivo..."
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            />
          )}
        </div>

        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-3 text-sm font-medium text-zinc-300 hover:bg-zinc-900 transition-colors"
        >
          Opciones avanzadas
          <ChevronDown className={`size-4 text-zinc-500 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
        </button>

        {advancedOpen && (
          <div className="space-y-4 rounded-xl border border-white/8 bg-zinc-900/30 p-4">
            <div>
              <label className="text-xs font-semibold text-zinc-400">Nivel</label>
              <div className="mt-2">
                <ChipSelect
                  options={Object.entries(ROUTINE_LEVEL_LABELS).map(([k, v]) => ({ value: k as RoutineLevel, label: v }))}
                  value={level}
                  onChange={setLevel}
                />
              </div>
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
        )}

        <button
          type="submit"
          disabled={loading || !title.trim() || (goal === "otro" && !customGoal.trim())}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <><Check className="size-4" /> Crear rutina</>
          )}
        </button>
      </form>
    </div>
  )
}
