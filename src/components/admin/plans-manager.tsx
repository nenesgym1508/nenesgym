"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Pencil, Tag } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCOP } from "@/lib/utils"
import { savePlanAction, setPlanActiveAction } from "@/actions/admin.actions"

interface Plan {
  id: string
  name: string
  price_cents: number
  days: number
  duration_days: number
  is_active: boolean
}

type Editing = { id?: string; name: string; price: string; days: string; duration: string } | null

const emptyForm: Editing = { name: "", price: "", days: "", duration: "" }

export function PlansManager({ plans }: { plans: Plan[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function openNew() {
    setError(null)
    setEditing(emptyForm)
  }

  function openEdit(p: Plan) {
    setError(null)
    setEditing({
      id: p.id,
      name: p.name,
      price: String(p.price_cents / 100),
      days: String(p.days),
      duration: String(p.duration_days),
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setLoading(true)
    setError(null)
    const result = await savePlanAction({
      id: editing.id,
      name: editing.name.trim(),
      priceCents: Math.round(Number(editing.price) * 100),
      days: Number(editing.days),
      durationDays: Number(editing.duration),
    })
    setLoading(false)
    if (result?.error) {
      setError(result.error)
      return
    }
    setEditing(null)
    router.refresh()
  }

  async function handleToggle(p: Plan) {
    setTogglingId(p.id)
    await setPlanActiveAction(p.id, !p.is_active)
    setTogglingId(null)
    router.refresh()
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tag className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Planes y precios</h3>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-1 text-xs font-medium text-red-400 hover:text-red-300"
          >
            <Plus className="size-4" /> Nuevo
          </button>
        )}
      </div>

      {/* Lista de planes */}
      {!editing && (
        <div className="space-y-2">
          {plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">Aún no hay planes creados</p>
          ) : (
            plans.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-zinc-100">{p.name}</p>
                    {!p.is_active && (
                      <span className="rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] text-zinc-400">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">
                    {formatCOP(p.price_cents)} · {p.days} días · vigencia {p.duration_days} días
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggle(p)}
                  disabled={togglingId === p.id}
                  className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
                >
                  {togglingId === p.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : p.is_active ? (
                    "Desactivar"
                  ) : (
                    "Activar"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(p)}
                  aria-label="Editar"
                  className="text-zinc-400 hover:text-zinc-100"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Formulario nuevo / editar */}
      {editing && (
        <form onSubmit={handleSave} className="space-y-3">
          <p className="text-sm font-semibold text-zinc-200">
            {editing.id ? "Editar plan" : "Nuevo plan"}
          </p>
          <Input
            id="plan_name"
            value={editing.name}
            onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            label="Nombre"
            placeholder="Mensual 20 días"
          />
          <Input
            id="plan_price"
            type="number"
            min={0}
            value={editing.price}
            onChange={(e) => setEditing({ ...editing, price: e.target.value })}
            label="Precio (COP)"
            placeholder="80000"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="plan_days"
              type="number"
              min={1}
              value={editing.days}
              onChange={(e) => setEditing({ ...editing, days: e.target.value })}
              label="Días incluidos"
              placeholder="20"
            />
            <Input
              id="plan_duration"
              type="number"
              min={1}
              value={editing.duration}
              onChange={(e) => setEditing({ ...editing, duration: e.target.value })}
              label="Vigencia (días)"
              placeholder="30"
            />
          </div>
          {error && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-10 flex-1 rounded-lg border border-white/10 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={loading || !editing.name.trim()}
              className="h-10 flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Guardar plan"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  )
}
