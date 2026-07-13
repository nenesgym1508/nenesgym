import Link from "next/link"
import { ROUTES } from "@/constants/routes"

export type EntrenamientoTab = "rutinas" | "asignaciones" | "clases"

const TABS: { value: EntrenamientoTab; label: string }[] = [
  { value: "rutinas", label: "Rutinas" },
  { value: "asignaciones", label: "Asignaciones" },
  { value: "clases", label: "Clases" },
]

export function EntrenamientoTabs({ active }: { active: EntrenamientoTab }) {
  return (
    <div className="flex gap-1 rounded-2xl border border-white/8 bg-zinc-900/60 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "rutinas" ? ROUTES.ADMIN_ENTRENAMIENTO : `${ROUTES.ADMIN_ENTRENAMIENTO}?tab=${tab.value}`}
          className={`flex-1 rounded-xl py-2 text-center text-sm font-semibold transition-colors ${
            active === tab.value ? "bg-red-600 text-white" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
