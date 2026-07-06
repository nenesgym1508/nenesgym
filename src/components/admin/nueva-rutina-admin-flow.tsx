"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, PenLine, BookOpen, Dumbbell, Loader2, Check } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { ROUTES } from "@/constants/routes"
import { createRoutineAction, createRoutineFromClassAction, createRoutineFromTemplateAction } from "@/actions/routines.actions"
import { ROUTINE_GOAL_LABELS, ROUTINE_LEVEL_LABELS, type RoutineGoal, type RoutineLevel } from "@/types/routine"
import type { RoutineTemplate } from "@/services/routine-templates.service"
import type { DailyClass } from "@/types/class"

interface ClientSelectProps {
  clients: { id: string; profile: { full_name: string | null } | null }[]
  value: string
  onChange: (val: string) => void
}

function ClientSelect({ clients, value, onChange }: ClientSelectProps) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-zinc-400">Cliente *</label>
      <select
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
      >
        <option value="">Selecciona un cliente</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.profile?.full_name ?? "Sin nombre"}
          </option>
        ))}
      </select>
    </div>
  )
}

interface NuevaRutinaAdminFlowProps {
  templates: RoutineTemplate[]
  classes: DailyClass[]
  clients: { id: string; profile: { full_name: string | null } | null }[]
}

type Step = "chooser" | "manual" | "template" | "class"

export function NuevaRutinaAdminFlow({
  templates,
  classes,
  clients
}: NuevaRutinaAdminFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("chooser")
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState("")

  // Manual states
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [goal, setGoal] = useState<RoutineGoal | "">("")
  const [level, setLevel] = useState<RoutineLevel | "">("")
  const [daysPerWeek, setDaysPerWeek] = useState("")
  const [notes, setNotes] = useState("")

  // Template states
  const [selectedTemplateId, setSelectedTemplateId] = useState("")

  // Class states
  const [selectedClassId, setSelectedClassId] = useState("")

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !clientId) return

    setLoading(true)
    const res = await createRoutineAction({
      client_id: clientId,
      title: title.trim(),
      description: description || undefined,
      goal: goal ? goal : undefined,
      level: level ? level : undefined,
      days_per_week: daysPerWeek ? parseInt(daysPerWeek) : undefined,
      notes: notes || undefined
    })
    setLoading(false)

    if (res.success && res.id) {
      router.push(`/admin/rutinas/${res.id}`)
    } else {
      alert(res.error || "Error al crear la rutina.")
    }
  }

  const handleCreateFromTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId || !clientId) return

    setLoading(true)
    const res = await createRoutineFromTemplateAction(selectedTemplateId, clientId)
    setLoading(false)

    if (res.success && res.id) {
      router.push(`/admin/rutinas/${res.id}`)
    } else {
      alert(res.error || "Error al crear desde plantilla.")
    }
  }

  const handleCreateFromClass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !clientId) return

    setLoading(true)
    const res = await createRoutineFromClassAction(selectedClassId, clientId)
    setLoading(false)

    if (res.success && res.id) {
      router.push(`/admin/rutinas/${res.id}`)
    } else {
      alert(res.error || "Error al crear desde clase.")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {step === "chooser" ? (
        <PageHeader title="Nueva Rutina" backHref={ROUTES.ADMIN_RUTINAS} />
      ) : (
        <header className="flex h-14 items-center gap-3 border-b border-white/8 px-4">
          <button onClick={() => setStep("chooser")} className="text-zinc-400 hover:text-zinc-100">
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="flex-1 text-base font-semibold">
            {step === "manual" ? "Desde Cero" : step === "template" ? "Desde Plantilla" : "Desde Clase"}
          </h1>
        </header>
      )}

      {step === "chooser" && (
        <div className="p-4 space-y-3">
          <p className="text-sm text-zinc-400 mb-1">¿Cómo deseas preparar esta rutina?</p>

          <button
            onClick={() => setStep("manual")}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
              <PenLine className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Desde cero (Manual)</p>
              <p className="text-xs text-zinc-500">Crea una rutina vacía y añade ejercicios paso a paso.</p>
            </div>
          </button>

          <button
            onClick={() => setStep("template")}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
              <BookOpen className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Desde una plantilla de rutina</p>
              <p className="text-xs text-zinc-500">Importa días, bloques y ejercicios de una plantilla.</p>
            </div>
          </button>

          <button
            onClick={() => setStep("class")}
            className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
              <Dumbbell className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-100">Desde una clase diaria</p>
              <p className="text-xs text-zinc-500">Convierte el entrenamiento de un día de clase en rutina.</p>
            </div>
          </button>
        </div>
      )}

      {step === "manual" && (
        <form onSubmit={handleCreateManual} className="p-4 space-y-4">
          <ClientSelect clients={clients} value={clientId} onChange={setClientId} />

          <div>
            <label className="text-xs font-semibold text-zinc-400">Título de la rutina *</label>
            <input
              type="text"
              required
              placeholder="Ej. Rutina de Fuerza"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-400">Descripción</label>
            <textarea
              placeholder="Descripción de la rutina..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
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
            <label className="text-xs font-semibold text-zinc-400">Días por semana</label>
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
            <label className="text-xs font-semibold text-zinc-400">Notas generales</label>
            <textarea
              placeholder="Notas generales..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !title.trim() || !clientId}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <><Check className="size-4" /> Crear Rutina</>
            )}
          </button>
        </form>
      )}

      {step === "template" && (
        <form onSubmit={handleCreateFromTemplate} className="p-4 space-y-4">
          <ClientSelect clients={clients} value={clientId} onChange={setClientId} />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Seleccionar Plantilla *</label>
            <select
              required
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            >
              <option value="">Selecciona plantilla</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.days_per_week ? `${t.days_per_week} días/sem` : "Sin días"})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedTemplateId || !clientId}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <><Check className="size-4" /> Crear desde Plantilla</>
            )}
          </button>
        </form>
      )}

      {step === "class" && (
        <form onSubmit={handleCreateFromClass} className="p-4 space-y-4">
          <ClientSelect clients={clients} value={clientId} onChange={setClientId} />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-zinc-400">Seleccionar Clase Diaria *</label>
            <select
              required
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            >
              <option value="">Selecciona clase</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.class_date})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedClassId || !clientId}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <><Check className="size-4" /> Crear desde Clase</>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
