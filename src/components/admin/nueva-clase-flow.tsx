"use client"

import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Check, Wand2, Search } from "lucide-react"
import { scheduleTrainingRoutineAsClassAction } from "@/actions/training-routines.actions"
import { generateTrainingRoutineDraftAction } from "@/actions/generate-routine-draft.action"
import { PageHeader } from "@/components/layout/page-header"
import { Input, Textarea } from "@/components/ui/input"
import { ROUTES, adminRutinaBibliotecaDetalle } from "@/constants/routes"
import { CLASS_OBJECTIVE_LABELS, CLASS_LEVEL_LABELS, type ClassObjective, type ClassLevel } from "@/types/class"
import { MUSCLE_GROUP_LABELS, type MuscleGroup } from "@/types/exercise"
import { formatRoutineGoal } from "@/types/routine"
import type { TrainingRoutineWithDayOptions } from "@/services/training-routines.service"

const DURATION_OPTIONS = [
  { value: "30", label: "30 minutos" },
  { value: "45", label: "45 minutos" },
  { value: "60", label: "60 minutos" },
  { value: "75", label: "75 minutos" },
  { value: "90", label: "90 minutos" },
]

interface NuevaClaseFlowProps {
  routines: TrainingRoutineWithDayOptions[]
}

export function NuevaClaseFlow({ routines }: NuevaClaseFlowProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0]!
  const [showGenerate, setShowGenerate] = useState(false)

  const [classDate, setClassDate] = useState(dateParam)
  const [search, setSearch] = useState("")
  const [selectedRoutineId, setSelectedRoutineId] = useState("")
  const [selectedDayId, setSelectedDayId] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRoutine = routines.find((r) => r.id === selectedRoutineId)
  const filteredRoutines = routines.filter((r) => r.name.toLowerCase().includes(search.toLowerCase().trim()))

  const handleSelectRoutine = (id: string) => {
    setSelectedRoutineId(id)
    const routine = routines.find((r) => r.id === id)
    setSelectedDayId(routine?.days[0]?.id ?? "")
  }

  const handleSchedule = async () => {
    if (!selectedRoutineId || !selectedDayId || !classDate) return
    setError(null)
    setLoading(true)
    const result = await scheduleTrainingRoutineAsClassAction(selectedRoutineId, selectedDayId, classDate, time || undefined, notes || undefined)
    setLoading(false)
    if (result.error) { setError(result.error); return }
    if (result.id) router.push(`/admin/clases/${result.id}`)
  }

  return (
    <div>
      <PageHeader title="Añadir rutina" backHref={ROUTES.ADMIN_CLASES} />

      {showGenerate ? (
        <GenerarStep classDate={classDate} onBack={() => setShowGenerate(false)} />
      ) : (
        <div>
          <div className="p-4 space-y-4 pb-24">
            <Input id="cls-date" type="date" label="Fecha" value={classDate} onChange={(e) => setClassDate(e.target.value)} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-300">Buscar rutina</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Nombre de la rutina..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-red-600"
                />
              </div>
            </div>

            {filteredRoutines.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-sm text-zinc-500">No hay rutinas en la biblioteca todavía.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
                {filteredRoutines.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRoutine(r.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      i < filteredRoutines.length - 1 ? "border-b border-white/5" : ""
                    } ${selectedRoutineId === r.id ? "bg-red-600/10" : "hover:bg-zinc-800/60"}`}
                  >
                    <div
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 ${
                        selectedRoutineId === r.id ? "border-red-500 bg-red-500" : "border-zinc-600"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{r.name}</p>
                      <p className="text-xs text-zinc-500">
                        {r.goal ? formatRoutineGoal(r.goal, r.custom_goal) : ""}
                        {r.days.length > 1 ? ` · ${r.days.length} días` : ""}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {selectedRoutine && selectedRoutine.days.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Día de la rutina</label>
                <select
                  value={selectedDayId}
                  onChange={(e) => setSelectedDayId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-red-600"
                >
                  {selectedRoutine.days.map((d) => (
                    <option key={d.id} value={d.id} className="bg-zinc-900">{d.title}</option>
                  ))}
                </select>
              </div>
            )}

            <Input id="cls-time" type="time" label="Hora (opcional)" value={time} onChange={(e) => setTime(e.target.value)} />
            <Textarea id="cls-notes" label="Notas (opcional)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href={`${ROUTES.ADMIN_RUTINAS_BIBLIOTECA_NUEVA}?returnToDate=${classDate}`}
                className="text-center text-xs text-zinc-500 hover:text-zinc-300 hover:underline underline-offset-2 transition-colors"
              >
                ¿Prefieres crear una rutina nueva para esta clase?
              </Link>
              <button
                onClick={() => setShowGenerate(true)}
                className="text-center text-xs text-zinc-500 hover:text-zinc-300 hover:underline underline-offset-2 transition-colors"
              >
                Generar automáticamente un borrador
              </button>
            </div>
          </div>

          <div className="fixed bottom-16 left-0 right-0 border-t border-white/8 bg-zinc-950/90 md:backdrop-blur-md p-4">
            <button
              onClick={handleSchedule}
              disabled={loading || !selectedRoutineId || !selectedDayId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Programar</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Generar borrador automático (crea rutina, no clase) ────────────────────

function GenerarStep({ classDate, onBack }: { classDate: string; onBack: () => void }) {
  const router = useRouter()
  const [genMuscle, setGenMuscle] = useState<MuscleGroup | "">("")
  const [genObjective, setGenObjective] = useState<ClassObjective | "">("")
  const [genLevel, setGenLevel] = useState<ClassLevel | "">("")
  const [genDuration, setGenDuration] = useState("60")
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const objectives = Object.keys(CLASS_OBJECTIVE_LABELS) as ClassObjective[]
  const levels = Object.keys(CLASS_LEVEL_LABELS) as ClassLevel[]
  const muscleGroups = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[]

  const handleGenerate = async () => {
    if (!genMuscle || !genObjective || !genLevel) { setGenError("Completa todos los campos"); return }
    setGenError(null)
    setGenerating(true)

    const result = await generateTrainingRoutineDraftAction({
      muscle_group: genMuscle,
      objective: genObjective,
      level: genLevel,
      estimated_duration_minutes: parseInt(genDuration),
    })

    setGenerating(false)
    if (result.error) { setGenError(result.error); return }
    if (result.id) router.push(`${adminRutinaBibliotecaDetalle(result.id)}?schedule=1&date=${classDate}`)
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <button onClick={onBack} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">← Volver a buscar rutina</button>
      <p className="text-xs text-zinc-500">
        Se generará un borrador de rutina editable con ejercicios de la biblioteca. Podrás revisarlo y programarlo en esta fecha ({classDate}) desde el editor.
      </p>

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

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
      >
        {generating ? <Loader2 className="size-4 animate-spin" /> : <><Wand2 className="size-4" /> Generar borrador</>}
      </button>
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
