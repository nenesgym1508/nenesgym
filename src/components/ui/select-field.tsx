interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

/**
 * Select con etiqueta, con el estilo de los formularios de ejercicio.
 *
 * Nota: `nueva-clase-flow.tsx` tiene su propia variante con otro tratamiento
 * visual (borde claro sobre fondo translúcido). No se unificó aquí para no
 * cambiarle el aspecto a esa pantalla sin querer.
 */
export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
