"use client"

interface ChipSelectProps<T extends string> {
  options: { value: T; label: string }[]
  value: T | ""
  onChange: (value: T) => void
}

export function ChipSelect<T extends string>({ options, value, onChange }: ChipSelectProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
            value === opt.value
              ? "bg-red-600 border-red-600 text-white"
              : "bg-zinc-900 border-white/10 text-zinc-300 hover:border-white/20"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
