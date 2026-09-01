"use client"

import { useState } from "react"
import { Sparkles, Check } from "lucide-react"
import { formatCOP } from "@/lib/utils"
import { formatDate, todayInBogota, addDays } from "@/lib/dates"

/**
 * Plan a medida: días y precio que pone el admin en el momento.
 *
 * El caso que lo motivó: "quiero venderle 12 días a este por un precio
 * especial". Antes había que ir a Más → Planes, crear un plan que se veía en
 * todo el gimnasio, volver a la ficha y cobrarlo.
 *
 * Las dos formas de guardarlo NO son lo mismo, y la diferencia importa:
 *
 *   · GUARDAR PARA EL SOCIO → se crea un plan de verdad, pero **privado**
 *     (`visible_to_clients = false`). Nadie más lo ve en su lista, pero ese
 *     socio sí —porque ya lo tuvo— y puede renovarlo solo. Para tarifas que se
 *     van a repetir cada mes.
 *
 *   · SOLO ESTA VEZ → no se crea ningún plan. El cobro va con `plan_id` nulo y
 *     los días sueltos. No ensucia el catálogo. Para el favor puntual.
 */
export type PlanAMedida = {
  days: number
  durationDays: number
  priceCents: number
  /** true = queda guardado como plan privado del socio y podrá renovarlo. */
  guardar: boolean
}

interface CustomPlanCardProps {
  seleccionado: boolean
  onSelect: () => void
  valor: PlanAMedida
  onChange: (v: PlanAMedida) => void
  /** Para el nombre del plan guardado y para el texto de ayuda. */
  clientName: string
}

export function CustomPlanCard({ seleccionado, onSelect, valor, onChange, clientName }: CustomPlanCardProps) {
  // Se guardan como texto para que el campo pueda quedar vacío mientras se
  // teclea. Forzarlos a número reescribía el input al borrarlo.
  const [dias, setDias] = useState(valor.days ? String(valor.days) : "")
  const [vigencia, setVigencia] = useState(String(valor.durationDays || 30))
  const [precio, setPrecio] = useState(valor.priceCents ? String(valor.priceCents / 100) : "")

  const emitir = (d: string, v: string, p: string, guardar: boolean) => {
    onChange({
      days: Number.parseInt(d || "0", 10) || 0,
      durationDays: Number.parseInt(v || "0", 10) || 0,
      priceCents: Math.round((Number.parseFloat(p || "0") || 0) * 100),
      guardar,
    })
  }

  const soloDigitos = (s: string) => s.replace(/\D/g, "").slice(0, 4)

  const completo = valor.days >= 1 && valor.durationDays >= 1
  const vence = completo ? addDays(todayInBogota(), valor.durationDays - 1) : null
  const nombreGenerado = `${valor.days} días · ${clientName.trim().split(/\s+/)[0] || "socio"}`

  return (
    <div
      className={`rounded-xl border transition-[border-color,background-color] ${
        seleccionado
          ? "border-red-500 bg-red-950/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
          : "border-dashed border-white/15 bg-white/[0.02] hover:border-white/30"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-center gap-3 p-3.5 text-left cursor-pointer"
      >
        <Sparkles className={`size-4 shrink-0 ${seleccionado ? "text-red-400" : "text-zinc-500"}`} />
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${seleccionado ? "text-red-400" : "text-zinc-200"}`}>
            Plan a medida
          </p>
          <p className="text-[11px] text-zinc-500">Tú pones los días y el precio</p>
        </div>
        {seleccionado && completo && (
          <span className="shrink-0 text-sm font-bold text-zinc-100">{formatCOP(valor.priceCents)}</span>
        )}
      </button>

      {seleccionado && (
        <div className="space-y-3 border-t border-white/8 p-3.5 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <Campo
              label="Días"
              ayuda="asistencias"
              value={dias}
              onChange={(v) => { const d = soloDigitos(v); setDias(d); emitir(d, vigencia, precio, valor.guardar) }}
              placeholder="12"
            />
            <Campo
              label="Vigencia"
              ayuda="calendario"
              value={vigencia}
              onChange={(v) => { const d = soloDigitos(v); setVigencia(d); emitir(dias, d, precio, valor.guardar) }}
              placeholder="30"
            />
            <Campo
              label="Precio"
              ayuda="COP"
              value={precio}
              onChange={(v) => { const d = v.replace(/\D/g, "").slice(0, 8); setPrecio(d); emitir(dias, vigencia, d, valor.guardar) }}
              placeholder="45000"
            />
          </div>

          {completo && vence && (
            <p className="text-[11px] text-zinc-500">
              {valor.days} días para usar antes del{" "}
              <strong className="text-zinc-300">{formatDate(vence)}</strong>
              {valor.priceCents > 0 && <> · {formatCOP(valor.priceCents)}</>}
            </p>
          )}

          {/* Guardarlo o no NO es un detalle: decide si el socio podrá renovar
              solo o tendrá que volver al mostrador cada mes. */}
          <div className="grid grid-cols-2 gap-2">
            <Opcion
              activa={valor.guardar}
              onClick={() => { onChange({ ...valor, guardar: true }) }}
              titulo="Guardar para él"
              detalle="Podrá renovarlo solo. Nadie más lo ve."
            />
            <Opcion
              activa={!valor.guardar}
              onClick={() => { onChange({ ...valor, guardar: false }) }}
              titulo="Solo esta vez"
              detalle="No queda guardado en tus planes."
            />
          </div>

          {valor.guardar && completo && (
            <p className="rounded-lg border border-amber-500/20 bg-amber-950/20 px-2.5 py-2 text-[11px] leading-normal text-amber-200">
              Se guardará como <strong className="text-zinc-100">{nombreGenerado}</strong>, marcado como
              privado. Solo aparece en la lista de {clientName.trim().split(/\s+/)[0] || "ese socio"}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Campo({
  label, ayuda, value, onChange, placeholder,
}: { label: string; ayuda: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</label>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm tabular-nums text-zinc-100 outline-none focus:border-red-600 placeholder:text-zinc-600"
      />
      <p className="mt-0.5 text-[10px] text-zinc-600">{ayuda}</p>
    </div>
  )
}

function Opcion({
  activa, onClick, titulo, detalle,
}: { activa: boolean; onClick: () => void; titulo: string; detalle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
        activa ? "border-red-500/60 bg-red-950/20" : "border-white/10 bg-white/[0.02] hover:border-white/25"
      }`}
    >
      <span className="flex items-center gap-1.5">
        {activa && <Check className="size-3 shrink-0 text-red-400" />}
        <span className={`text-xs font-semibold ${activa ? "text-red-300" : "text-zinc-300"}`}>{titulo}</span>
      </span>
      <span className="mt-0.5 block text-[10px] leading-tight text-zinc-500">{detalle}</span>
    </button>
  )
}

/** Valor inicial: 30 días de vigencia, que es lo normal en el gimnasio. */
export const PLAN_MEDIDA_INICIAL: PlanAMedida = {
  days: 0,
  durationDays: 30,
  priceCents: 0,
  guardar: true,
}

/** Id sintético para distinguirlo de un plan del catálogo en el estado. */
export const ID_PLAN_MEDIDA = "__a_medida__"
