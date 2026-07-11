"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronDown, ChevronRight, PenLine, BookOpen, Dumbbell, Loader2, Check } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { ROUTES } from "@/constants/routes"
import { createRoutineAction, createRoutineFromClassAction, createRoutineFromTemplateAction } from "@/actions/routines.actions"
import { ChipSelect } from "@/components/ui/chip-select"
import {
  CLIENT_ROUTINE_GOAL_LABELS,
  ROUTINE_LEVEL_LABELS,
  type RoutineGoal,
  type ClientRoutineGoal,
  type RoutineLevel
} from "@/types/routine"
import type { RoutineTemplate } from "@/services/routine-templates.service"
import type { DailyClass } from "@/types/class"

interface NuevaRutinaAdminFlowProps {
  templates: RoutineTemplate[]
  classes: DailyClass[]
  clients: { id: string; profile: { full_name: string | null } | null }[]
}

type CreationMethod = "manual" | "template" | "class"

const DAYS_PER_WEEK_OPTIONS = [1, 2, 3, 4, 5, 6]

export function NuevaRutinaAdminFlow({
  templates,
  classes,
  clients
}: NuevaRutinaAdminFlowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState("")
  const [clientSearch, setClientSearch] = useState("")

  // Flujo por pasos
  // "client-select" -> "method-select" -> "form-fill"
  const [currentStep, setCurrentStep] = useState<"client-select" | "method-select" | "form-fill">("client-select")
  const [creationMethod, setCreationMethod] = useState<CreationMethod>("manual")

  // Manual States (Flujo simple cliente)
  const [title, setTitle] = useState("")
  const [goal, setGoal] = useState<ClientRoutineGoal | "">("")
  const [customGoal, setCustomGoal] = useState("")
  const [level, setLevel] = useState<RoutineLevel | "">("general")
  const [daysPerWeek, setDaysPerWeek] = useState("")
  const [notes, setNotes] = useState("")
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // Template/Class States
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")

  const selectedClient = clients.find(c => c.id === clientId)

  const filteredClients = clients.filter(c =>
    c.profile?.full_name?.toLowerCase().includes(clientSearch.toLowerCase().trim()) ?? false
  )

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !clientId) return
    if (goal === "otro" && !customGoal.trim()) return

    setLoading(true)
    const res = await createRoutineAction({
      client_id: clientId,
      title: title.trim(),
      goal: goal ? (goal as RoutineGoal) : undefined,
      custom_goal: goal === "otro" ? customGoal.trim() : undefined,
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

  const goBack = () => {
    if (currentStep === "method-select") {
      setClientId("")
      setCurrentStep("client-select")
    } else if (currentStep === "form-fill") {
      setCurrentStep("method-select")
    } else {
      router.push(ROUTES.ADMIN_RUTINAS)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {/* Header unificado */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/8 bg-zinc-950/90 backdrop-blur-md px-4">
        <button onClick={goBack} className="rounded-lg p-1 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100 transition-colors">
          <ChevronLeft className="size-5" />
        </button>
        <div>
          <h1 className="text-sm font-semibold text-zinc-200">Nueva Rutina</h1>
          {selectedClient && (
            <p className="text-[10px] text-zinc-500">
              Para: {selectedClient.profile?.full_name ?? "Cliente"}
            </p>
          )}
        </div>
      </header>

      {/* PASO 1: Seleccionar Cliente */}
      {currentStep === "client-select" && (
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium text-zinc-300">¿Para quién es esta rutina?</p>
          <input
            type="text"
            placeholder="Buscar cliente por nombre..."
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-3 text-sm text-zinc-200 outline-none focus:border-red-600/50"
          />

          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {filteredClients.length === 0 ? (
              <p className="text-center py-8 text-sm text-zinc-500">No se encontraron clientes.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60 divide-y divide-white/5">
                {filteredClients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClientId(c.id)
                      setCurrentStep("method-select")
                    }}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/40 text-left transition-colors"
                  >
                    <span className="text-sm text-zinc-200 font-medium">
                      {c.profile?.full_name ?? "Sin nombre"}
                    </span>
                    <ChevronRight className="size-4 text-zinc-600 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PASO 2: Seleccionar Método */}
      {currentStep === "method-select" && (
        <div className="p-4 space-y-4">
          <p className="text-sm font-medium text-zinc-300">¿Cómo deseas preparar esta rutina?</p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setCreationMethod("manual")
                setCurrentStep("form-fill")
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
                <PenLine className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">En blanco (Manual)</p>
                <p className="text-xs text-zinc-500">Formulario guiado idéntico al del cliente.</p>
              </div>
            </button>

            <button
              onClick={() => {
                setCreationMethod("template")
                setCurrentStep("form-fill")
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Desde plantilla de rutina</p>
                <p className="text-xs text-zinc-500">Copia los ejercicios y bloques de una plantilla prediseñada.</p>
              </div>
            </button>

            <button
              onClick={() => {
                setCreationMethod("class")
                setCurrentStep("form-fill")
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-4 text-left hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15 text-red-400">
                <Dumbbell className="size-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Desde clase diaria</p>
                <p className="text-xs text-zinc-500">Puebla la rutina con el entrenamiento planificado de una clase.</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Formularios */}
      {currentStep === "form-fill" && (
        <div className="p-4">
          {/* Método: Manual (Flujo simple cliente) */}
          {creationMethod === "manual" && (
            <form onSubmit={handleCreateManual} className="space-y-6">
              <div>
                <label className="text-xs font-semibold text-zinc-400">Nombre de la rutina *</label>
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
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 font-semibold"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <><Check className="size-4" /> Crear rutina</>
                )}
              </button>
            </form>
          )}

          {/* Método: Plantilla */}
          {creationMethod === "template" && (
            <form onSubmit={handleCreateFromTemplate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Seleccionar Plantilla *</label>
                <select
                  required
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
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
                disabled={loading || !selectedTemplateId}
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

          {/* Método: Clase diaria */}
          {creationMethod === "class" && (
            <form onSubmit={handleCreateFromClass} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Seleccionar Clase Diaria *</label>
                <select
                  required
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
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
                disabled={loading || !selectedClassId}
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
      )}
    </div>
  )
}
