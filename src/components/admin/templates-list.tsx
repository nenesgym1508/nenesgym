"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Copy, Power, Loader2, ChevronRight, BookOpen, X } from "lucide-react"
import { toggleTemplateAction, createClassFromTemplateAction } from "@/actions/templates.actions"
import { CLASS_OBJECTIVE_LABELS } from "@/types/class"
import { adminPlantillaDetalle } from "@/constants/routes"
import type { ClassTemplate } from "@/services/templates.service"

interface TemplatesListProps {
  initialTemplates: ClassTemplate[]
  userId: string
}

export function TemplatesList({ initialTemplates, userId }: TemplatesListProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState(initialTemplates)
  const [isPending, startTransition] = useTransition()
  const [useModalOpen, setUseModalOpen] = useState<ClassTemplate | null>(null)
  const [targetDate, setTargetDate] = useState("")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleToggle = (tpl: ClassTemplate) => {
    startTransition(async () => {
      await toggleTemplateAction(tpl.id, !tpl.is_active)
      setTemplates((prev) =>
        prev.map((t) => (t.id === tpl.id ? { ...t, is_active: !t.is_active } : t))
      )
    })
  }

  const handleUseTemplate = async () => {
    if (!useModalOpen || !targetDate) return
    setError(null)
    setCreating(true)
    const result = await createClassFromTemplateAction(useModalOpen.id, targetDate, userId)
    setCreating(false)
    if (result.error) { setError(result.error); return }
    if (result.id) {
      setUseModalOpen(null)
      router.push(`/admin/clases/${result.id}`)
    }
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-12 text-center">
        <BookOpen className="size-8 text-zinc-700" />
        <div>
          <p className="text-sm font-medium text-zinc-400">Sin plantillas</p>
          <p className="text-xs text-zinc-600 mt-1">
            Guarda una clase como plantilla desde el editor para reutilizarla.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/60">
        {templates.map((tpl, i) => (
          <div
            key={tpl.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${
              !tpl.is_active ? "opacity-50" : ""
            } ${i < templates.length - 1 ? "border-b border-white/5" : ""}`}
          >
            <Link href={adminPlantillaDetalle(tpl.id)} className="flex-1 min-w-0 flex items-center gap-1 hover:opacity-80 transition-opacity">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-200 truncate">{tpl.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                  {tpl.exercise_count != null && (
                    <span>{tpl.exercise_count} ejercicio{tpl.exercise_count === 1 ? "" : "s"}</span>
                  )}
                  {tpl.objective && (
                    <span>{CLASS_OBJECTIVE_LABELS[tpl.objective as keyof typeof CLASS_OBJECTIVE_LABELS] ?? tpl.objective}</span>
                  )}
                  {tpl.estimated_duration_minutes && (
                    <span>{tpl.estimated_duration_minutes} min</span>
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 text-zinc-600 shrink-0" />
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const tomorrow = new Date()
                  tomorrow.setDate(tomorrow.getDate() + 1)
                  setTargetDate(tomorrow.toISOString().split("T")[0]!)
                  setUseModalOpen(tpl)
                }}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
              >
                <Copy className="size-3" />
                Usar
              </button>
              <button
                onClick={() => handleToggle(tpl)}
                disabled={isPending}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  tpl.is_active
                    ? "bg-green-600/15 text-green-400 hover:bg-zinc-800 hover:text-zinc-400"
                    : "bg-zinc-800 text-zinc-600 hover:bg-green-600/15 hover:text-green-400"
                }`}
              >
                <Power className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-zinc-600 text-center">
        Para crear una plantilla, guarda una clase desde el editor usando "Guardar como plantilla".
      </p>

      {/* Modal de uso de plantilla */}
      {useModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 md:backdrop-blur-sm"
          onClick={() => setUseModalOpen(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border border-white/10 bg-zinc-900 p-5 pb-8 sm:pb-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-zinc-100">Usar plantilla</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{useModalOpen.name}</p>
              </div>
              <button onClick={() => setUseModalOpen(null)} className="text-zinc-500 hover:text-zinc-300">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-4">
              <label className="text-sm font-medium text-zinc-300">Fecha de la clase</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
              />
            </div>

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            <button
              onClick={handleUseTemplate}
              disabled={creating || !targetDate}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {creating ? <Loader2 className="size-4 animate-spin" /> : <><Copy className="size-4" /> Crear clase desde plantilla</>}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
