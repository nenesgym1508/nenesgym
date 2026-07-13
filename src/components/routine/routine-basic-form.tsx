"use client"

import { useState } from "react"
import { ChevronDown, Check, Loader2 } from "lucide-react"
import { ChipSelect } from "@/components/ui/chip-select"
import { CLIENT_ROUTINE_GOAL_LABELS, ROUTINE_LEVEL_LABELS, type ClientRoutineGoal, type RoutineLevel } from "@/types/routine"

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6]

export interface RoutineBasicFormValues {
  title: string
  goal: ClientRoutineGoal | ""
  customGoal: string
  level: RoutineLevel | ""
  daysPerWeek: string
  notes: string
}

interface RoutineBasicFormProps {
  values: RoutineBasicFormValues
  onChange: (patch: Partial<RoutineBasicFormValues>) => void
  onSubmit: (e: React.FormEvent) => void
  loading?: boolean
  titleLabel?: string
  titlePlaceholder?: string
  submitLabel?: string
  footer?: React.ReactNode
}

export function RoutineBasicForm({
  values,
  onChange,
  onSubmit,
  loading = false,
  titleLabel = "Nombre *",
  titlePlaceholder = "Ej. Mi rutina de volumen",
  submitLabel = "Crear rutina",
  footer
}: RoutineBasicFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="text-xs font-semibold text-zinc-400">{titleLabel}</label>
        <input
          type="text"
          required
          placeholder={titlePlaceholder}
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-400">¿Cuántos días vas a entrenar?</label>
        <div className="mt-2">
          <ChipSelect
            options={DAYS_PER_WEEK_OPTIONS.map((n) => ({ value: String(n), label: n === 1 ? "1 día" : `${n} días` }))}
            value={values.daysPerWeek}
            onChange={(v) => onChange({ daysPerWeek: v })}
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-400">Objetivo</label>
        <div className="mt-2">
          <ChipSelect
            options={Object.entries(CLIENT_ROUTINE_GOAL_LABELS).map(([k, v]) => ({ value: k as ClientRoutineGoal, label: v }))}
            value={values.goal}
            onChange={(v) => onChange({ goal: v })}
          />
        </div>
        {values.goal === "otro" && (
          <input
            type="text"
            required
            autoFocus
            maxLength={60}
            placeholder="Escribe tu objetivo..."
            value={values.customGoal}
            onChange={(e) => onChange({ customGoal: e.target.value })}
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
                value={values.level}
                onChange={(v) => onChange({ level: v })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400">Notas de entrenamiento</label>
            <textarea
              placeholder="Notas generales de calentamiento u observaciones..."
              value={values.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50 resize-none"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !values.title.trim() || (values.goal === "otro" && !values.customGoal.trim())}
        className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-red py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> {submitLabel}</>}
      </button>

      {footer}
    </form>
  )
}

export const EMPTY_ROUTINE_BASIC_FORM_VALUES: RoutineBasicFormValues = {
  title: "",
  goal: "",
  customGoal: "",
  level: "general",
  daysPerWeek: "",
  notes: ""
}
