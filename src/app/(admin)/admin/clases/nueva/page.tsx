"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2, Wand2, ChevronDown, ChevronUp } from "lucide-react"
import { createClassAction } from "@/actions/classes.actions"
import { generateClassAction } from "@/actions/generate-class.action"
import { PageHeader } from "@/components/layout/page-header"
import { Input, Textarea } from "@/components/ui/input"
import { ROUTES } from "@/constants/routes"
import {
  CLASS_OBJECTIVE_LABELS,
  CLASS_LEVEL_LABELS,
  type ClassObjective,
  type ClassLevel,
} from "@/types/class"
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/types/exercise"

export default function NuevaClasePage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0]!

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [classDate, setClassDate] = useState(dateParam)
  const [objective, setObjective] = useState<ClassObjective | "">("")
  const [level, setLevel] = useState<ClassLevel | "">("")
  const [duration, setDuration] = useState<string>("")
  const [notes, setNotes] = useState("")

  // Generator
  const [genOpen, setGenOpen] = useState(false)
  const [genMuscle, setGenMuscle] = useState<MuscleGroup | "">("")
  const [genObjective, setGenObjective] = useState<ClassObjective | "">("")
  const [genLevel, setGenLevel] = useState<ClassLevel | "">("")
  const [genDuration, setGenDuration] = useState("60")
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genWarning, setGenWarning] = useState<string | null>(null)

  useEffect(() => {
    setClassDate(dateParam)
  }, [dateParam])

  const handleCreate = async () => {
    if (!title.trim()) { setError("El título es obligatorio"); return }
    if (!classDate) { setError("La fecha es obligatoria"); return }
    setError(null)
    setLoading(true)

    const result = await createClassAction({
      title,
      class_date: classDate,
      objective: objective || undefined,
      level: level || undefined,
      estimated_duration_minutes: duration ? parseInt(duration) : undefined,
      notes: notes || undefined,
    })

    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (result.id) router.push(`/admin/clases/${result.id}`)
  }

  const handleGenerate = async (force = false) => {
    if (!genMuscle || !genObjective || !genLevel) { setGenError("Completa todos los campos"); return }
    setGenError(null)
    if (force) setGenWarning(null)
    setGenerating(true)

    const result = await generateClassAction({
      class_date: classDate,
      muscle_group: genMuscle,
      objective: genObjective,
      level: genLevel,
      estimated_duration_minutes: parseInt(genDuration),
      force,
    })

    setGenerating(false)
    if (result.warning) { setGenWarning(result.warning); return }
    if (result.error) { setGenError(result.error); return }
    if (result.id) router.push(`/admin/clases/${result.id}`)
  }

  const objectives = Object.keys(CLASS_OBJECTIVE_LABELS) as ClassObjective[]
  const levels = Object.keys(CLASS_LEVEL_LABELS) as ClassLevel[]
  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

  return (
    <div>
      <PageHeader title="Nueva clase" backHref={ROUTES.ADMIN_CLASES} />
      <div className="p-4 space-y-4 pb-24">
        <Input
          id="cls-date"
          type="date"
          label="Fecha"
          value={classDate}
          onChange={(e) => setClassDate(e.target.value)}
        />

        <Input
          id="cls-title"
          label="Nombre de la clase *"
          placeholder="Ej: Pierna + Glúteo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <SelectField
          label="Objetivo"
          value={objective}
          onChange={(v) => setObjective(v as ClassObjective | "")}
          options={[{ value: "", label: "Sin especificar" }, ...objectives.map((o) => ({ value: o, label: CLASS_OBJECTIVE_LABELS[o] }))]}
        />

        <SelectField
          label="Nivel"
          value={level}
          onChange={(v) => setLevel(v as ClassLevel | "")}
          options={[{ value: "", label: "General" }, ...levels.map((l) => ({ value: l, label: CLASS_LEVEL_LABELS[l] }))]}
        />

        <SelectField
          label="Duración estimada"
          value={duration}
          onChange={(v) => setDuration(v)}
          options={[
            { value: "", label: "Sin especificar" },
            { value: "30", label: "30 minutos" },
            { value: "45", label: "45 minutos" },
            { value: "60", label: "60 minutos" },
            { value: "75", label: "75 minutos" },
            { value: "90", label: "90 minutos" },
          ]}
        />

        <Textarea
          id="cls-notes"
          label="Notas (opcional)"
          placeholder="Observaciones para esta sesión..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* Generador */}
        <div className="rounded-2xl border border-white/8 bg-zinc-900/40 overflow-hidden">
          <button
            onClick={() => setGenOpen(!genOpen)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Wand2 className="size-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-300">Generar clase automáticamente</span>
            </div>
            {genOpen ? <ChevronUp className="size-4 text-zinc-500" /> : <ChevronDown className="size-4 text-zinc-500" />}
          </button>

          {genOpen && (
            <div className="px-4 pb-4 space-y-3 border-t border-white/8">
              <p className="text-xs text-zinc-500 pt-3">Se generará un borrador editable con ejercicios de la biblioteca.</p>
              <SelectField
                label="Grupo muscular principal"
                value={genMuscle}
                onChange={(v) => setGenMuscle(v as MuscleGroup | "")}
                options={[{ value: "", label: "Seleccionar..." }, ...muscleGroups.map((g) => ({ value: g, label: MUSCLE_GROUP_LABELS[g] }))]}
              />
              <SelectField
                label="Objetivo"
                value={genObjective}
                onChange={(v) => setGenObjective(v as ClassObjective | "")}
                options={[{ value: "", label: "Seleccionar..." }, ...objectives.map((o) => ({ value: o, label: CLASS_OBJECTIVE_LABELS[o] }))]}
              />
              <SelectField
                label="Nivel"
                value={genLevel}
                onChange={(v) => setGenLevel(v as ClassLevel | "")}
                options={[{ value: "", label: "Seleccionar..." }, ...levels.map((l) => ({ value: l, label: CLASS_LEVEL_LABELS[l] }))]}
              />
              <SelectField
                label="Duración"
                value={genDuration}
                onChange={(v) => setGenDuration(v)}
                options={[
                  { value: "30", label: "30 min" },
                  { value: "45", label: "45 min" },
                  { value: "60", label: "60 min" },
                  { value: "90", label: "90 min" },
                ]}
              />
              {genError && <p className="text-xs text-red-400">{genError}</p>}
              {genWarning && (
                <div className="rounded-xl border border-yellow-600/30 bg-yellow-600/10 px-3 py-2.5 space-y-2">
                  <p className="text-xs text-yellow-300">{genWarning}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleGenerate(true)}
                      disabled={generating}
                      className="flex-1 rounded-lg bg-yellow-600/80 py-1.5 text-xs font-semibold text-white hover:bg-yellow-600 transition-colors disabled:opacity-50"
                    >
                      Sí, continuar
                    </button>
                    <button
                      onClick={() => setGenWarning(null)}
                      className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors"
                    >
                      Cambiar grupo
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-600/30 bg-red-600/10 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-600/15 transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <><Wand2 className="size-4" /> Generar borrador</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer sticky */}
      <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 md:backdrop-blur-md p-4">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Crear clase"}
        </button>
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-red-600"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-zinc-900">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
