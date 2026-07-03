"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Loader2, Wand2, ChevronLeft, PenLine, BookOpen, Copy } from "lucide-react"
import { createClassAction } from "@/actions/classes.actions"
import { generateClassAction } from "@/actions/generate-class.action"
import { createClassFromTemplateAction } from "@/actions/templates.actions"
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
import type { ClassTemplate } from "@/services/templates.service"

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "60 minutos" },
  { value: "75", label: "75 minutos" },
  { value: "90", label: "90 minutos" },
]

type Path = "chooser" | "manual" | "plantilla" | "generar"

interface NuevaClaseFlowProps {
  templates: ClassTemplate[]
  userId: string
}

export function NuevaClaseFlow({ templates, userId }: NuevaClaseFlowProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0]!
  const modoParam = searchParams.get("modo")

  const [path, setPath] = useState<Path>(modoParam === "generar" ? "generar" : "chooser")
  const [classDate, setClassDate] = useState(dateParam)

  useEffect(() => {
    setClassDate(dateParam)
  }, [dateParam])

  const backHref = path === "chooser" ? ROUTES.ADMIN_CLASES : undefined
  const title =
    path === "manual" ? "Desde cero"
    : path === "plantilla" ? "Usar plantilla"
    : path === "generar" ? "Generar borrador"
    : "Nueva clase"

  return (
    <div>
      {path === "chooser" ? (
        <PageHeader title={title} backHref={backHref} />
      ) : (
        <header className="flex h-14 items-center gap-3 border-b border-white/8 px-4">
          <button onClick={() => setPath("chooser")} className="text-zinc-400 hover:text-zinc-100">
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">{title}</h1>
        </header>
      )}

      {path === "chooser" && <ChooserStep onSelect={setPath} />}
      {path === "manual" && <ManualStep classDate={classDate} setClassDate={setClassDate} />}
      {path === "plantilla" && (
        <PlantillaStep templates={templates} userId={userId} classDate={classDate} setClassDate={setClassDate} />
      )}
      {path === "generar" && <GenerarStep classDate={classDate} setClassDate={setClassDate} />}
    </div>
  )
}

// ─── Paso 0: elegir camino ──────────────────────────────────────────────────

function ChooserStep({ onSelect }: { onSelect: (p: Path) => void }) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-sm text-zinc-400 mb-1">¿Cómo quieres preparar la clase?</p>

      <button
        onClick={() => onSelect("manual")}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
          <PenLine className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Desde cero</p>
          <p className="text-xs text-zinc-500">Crea una clase manual con bloques vacíos.</p>
        </div>
      </button>

      <button
        onClick={() => onSelect("plantilla")}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
          <BookOpen className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Usar plantilla</p>
          <p className="text-xs text-zinc-500">Parte de una clase guardada.</p>
        </div>
      </button>

      <button
        onClick={() => onSelect("generar")}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
          <Wand2 className="size-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">Generar borrador</p>
          <p className="text-xs text-zinc-500">La app arma una clase base usando ejercicios guardados.</p>
        </div>
      </button>
    </div>
  )
}

// ─── Paso: Desde cero ───────────────────────────────────────────────────────

function ManualStep({ classDate, setClassDate }: { classDate: string; setClassDate: (v: string) => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [objective, setObjective] = useState<ClassObjective | "">("")
  const [level, setLevel] = useState<ClassLevel | "">("")
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")

  const objectives = Object.keys(CLASS_OBJECTIVE_LABELS) as ClassObjective[]
  const levels = Object.keys(CLASS_LEVEL_LABELS) as ClassLevel[]

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

  return (
    <div>
      <div className="p-4 space-y-4 pb-24">
        <Input id="cls-date" type="date" label="Fecha" value={classDate} onChange={(e) => setClassDate(e.target.value)} />
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
          onChange={setDuration}
          options={[{ value: "", label: "Sin especificar" }, ...DURATION_OPTIONS]}
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
      </div>

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

// ─── Paso: Usar plantilla ───────────────────────────────────────────────────

function PlantillaStep({
  templates,
  userId,
  classDate,
  setClassDate,
}: {
  templates: ClassTemplate[]
  userId: string
  classDate: string
  setClassDate: (v: string) => void
}) {
  const router = useRouter()
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (templates.length === 0) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-12 text-center">
          <BookOpen className="size-8 text-zinc-700" />
          <div>
            <p className="text-sm font-medium text-zinc-400">Sin plantillas</p>
            <p className="text-xs text-zinc-600 mt-1">
              Guarda una clase como plantilla desde el editor para reutilizarla.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const handleCreate = async () => {
    if (!templateId || !classDate) return
    setError(null)
    setLoading(true)
    const result = await createClassFromTemplateAction(templateId, classDate, userId)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (result.id) router.push(`/admin/clases/${result.id}`)
  }

  return (
    <div>
      <div className="p-4 space-y-4 pb-24">
        <Input id="tpl-date" type="date" label="Fecha" value={classDate} onChange={(e) => setClassDate(e.target.value)} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-300">Plantilla</label>
          <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
            {templates.map((tpl, i) => (
              <button
                key={tpl.id}
                onClick={() => setTemplateId(tpl.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                  i < templates.length - 1 ? "border-b border-white/5" : ""
                } ${templateId === tpl.id ? "bg-red-600/10" : "hover:bg-zinc-800/60"}`}
              >
                <div
                  className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    templateId === tpl.id ? "border-red-500 bg-red-500" : "border-zinc-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">{tpl.name}</p>
                  <p className="text-xs text-zinc-500">
                    {tpl.exercise_count != null ? `${tpl.exercise_count} ejercicio${tpl.exercise_count === 1 ? "" : "s"}` : ""}
                    {tpl.objective ? ` · ${CLASS_OBJECTIVE_LABELS[tpl.objective as keyof typeof CLASS_OBJECTIVE_LABELS] ?? tpl.objective}` : ""}
                    {tpl.estimated_duration_minutes ? ` · ${tpl.estimated_duration_minutes} min` : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 md:backdrop-blur-md p-4">
        <button
          onClick={handleCreate}
          disabled={loading || !templateId}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <><Copy className="size-4" /> Crear clase desde plantilla</>}
        </button>
      </div>
    </div>
  )
}

// ─── Paso: Generar borrador ─────────────────────────────────────────────────

function GenerarStep({ classDate, setClassDate }: { classDate: string; setClassDate: (v: string) => void }) {
  const router = useRouter()
  const [genMuscle, setGenMuscle] = useState<MuscleGroup | "">("")
  const [genObjective, setGenObjective] = useState<ClassObjective | "">("")
  const [genLevel, setGenLevel] = useState<ClassLevel | "">("")
  const [genDuration, setGenDuration] = useState("60")
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [genWarning, setGenWarning] = useState<string | null>(null)

  const objectives = Object.keys(CLASS_OBJECTIVE_LABELS) as ClassObjective[]
  const levels = Object.keys(CLASS_LEVEL_LABELS) as ClassLevel[]
  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

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

  return (
    <div className="p-4 space-y-4 pb-6">
      <p className="text-xs text-zinc-500">Se generará un borrador editable con ejercicios de la biblioteca. No se publica automáticamente.</p>

      <Input id="gen-date" type="date" label="Fecha" value={classDate} onChange={(e) => setClassDate(e.target.value)} />

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
      <SelectField label="Duración" value={genDuration} onChange={setGenDuration} options={DURATION_OPTIONS} />

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
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {generating ? <Loader2 className="size-4 animate-spin" /> : <><Wand2 className="size-4" /> Generar borrador</>}
      </button>
    </div>
  )
}

// ─── Shared ──────────────────────────────────────────────────────────────────

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
