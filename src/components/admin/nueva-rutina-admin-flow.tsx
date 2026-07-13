"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, ChevronRight, Loader2, Check } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { createRoutineAction, createRoutineFromClassAction } from "@/actions/routines.actions"
import { assignTrainingRoutineToClientAction } from "@/actions/training-routines.actions"
import { ChipSelect } from "@/components/ui/chip-select"
import { RoutineBasicForm, EMPTY_ROUTINE_BASIC_FORM_VALUES, type RoutineBasicFormValues } from "@/components/routine/routine-basic-form"
import type { RoutineGoal } from "@/types/routine"
import type { TrainingRoutine } from "@/services/training-routines.service"
import type { DailyClass } from "@/types/class"

interface NuevaRutinaAdminFlowProps {
  routines: TrainingRoutine[]
  classes: DailyClass[]
  clients: { id: string; profile: { full_name: string | null } | null }[]
  initialClientId?: string
}

type Step = "client-select" | "form"
type FormMode = "manual" | "existing"
type ExistingSourceType = "routine" | "class"

export function NuevaRutinaAdminFlow({
  routines,
  classes,
  clients,
  initialClientId
}: NuevaRutinaAdminFlowProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState(initialClientId ?? "")
  const [clientSearch, setClientSearch] = useState("")

  const [currentStep, setCurrentStep] = useState<Step>(initialClientId ? "form" : "client-select")
  const [formMode, setFormMode] = useState<FormMode>("manual")
  const [existingSourceType, setExistingSourceType] = useState<ExistingSourceType>("routine")

  const [values, setValues] = useState<RoutineBasicFormValues>(EMPTY_ROUTINE_BASIC_FORM_VALUES)

  // Rutina existente / clase existente (opción secundaria)
  const [selectedRoutineId, setSelectedRoutineId] = useState("")
  const [selectedClassId, setSelectedClassId] = useState("")

  const selectedClient = clients.find(c => c.id === clientId)

  const filteredClients = clients.filter(c =>
    c.profile?.full_name?.toLowerCase().includes(clientSearch.toLowerCase().trim()) ?? false
  )

  const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.title.trim() || !clientId) return
    if (values.goal === "otro" && !values.customGoal.trim()) return

    setLoading(true)
    const res = await createRoutineAction({
      client_id: clientId,
      title: values.title.trim(),
      goal: values.goal ? (values.goal as RoutineGoal) : undefined,
      custom_goal: values.goal === "otro" ? values.customGoal.trim() : undefined,
      level: values.level ? values.level : undefined,
      days_per_week: values.daysPerWeek ? parseInt(values.daysPerWeek) : undefined,
      notes: values.notes || undefined
    })
    setLoading(false)

    if (res.success && res.id) {
      router.push(`/admin/rutinas/${res.id}`)
    } else {
      alert(res.error || "Error al crear la rutina.")
    }
  }

  const handleCreateFromRoutine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoutineId || !clientId) return

    setLoading(true)
    const res = await assignTrainingRoutineToClientAction(selectedRoutineId, clientId)
    setLoading(false)

    if (res.success && res.id) {
      router.push(`/admin/rutinas/${res.id}`)
    } else {
      alert(res.error || "Error al crear desde rutina existente.")
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
    if (currentStep === "form" && !initialClientId) {
      setClientId("")
      setFormMode("manual")
      setCurrentStep("client-select")
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
                      setCurrentStep("form")
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

      {/* PASO 2: Formulario (idéntico al del cliente) */}
      {currentStep === "form" && (
        <div className="p-4">
          {formMode === "manual" ? (
            <RoutineBasicForm
              values={values}
              onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))}
              onSubmit={handleCreateManual}
              loading={loading}
              titleLabel="Nombre de la rutina *"
              footer={
                <button
                  type="button"
                  onClick={() => setFormMode("existing")}
                  className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 hover:underline underline-offset-2 transition-colors"
                >
                  ¿Prefieres partir de una rutina o clase existente?
                </button>
              }
            />
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setFormMode("manual")}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="size-3.5" />
                Volver al formulario manual
              </button>

              <div>
                <label className="text-xs font-semibold text-zinc-400">Origen</label>
                <div className="mt-2">
                  <ChipSelect
                    options={[
                      { value: "routine" as const, label: "Rutina existente" },
                      { value: "class" as const, label: "Clase diaria" }
                    ]}
                    value={existingSourceType}
                    onChange={setExistingSourceType}
                  />
                </div>
              </div>

              {existingSourceType === "routine" ? (
                <form onSubmit={handleCreateFromRoutine} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-400">Seleccionar Rutina *</label>
                    <select
                      required
                      value={selectedRoutineId}
                      onChange={(e) => setSelectedRoutineId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-3.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
                    >
                      <option value="">Selecciona rutina</option>
                      {routines.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.days_per_week ? `${r.days_per_week} días/sem` : "Sin días"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !selectedRoutineId}
                    className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-red py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <><Check className="size-4" /> Crear desde Rutina</>
                    )}
                  </button>
                </form>
              ) : (
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
                    className="w-full flex items-center justify-center gap-2 rounded-xl btn-glossy-red py-3.5 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
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
      )}
    </div>
  )
}
