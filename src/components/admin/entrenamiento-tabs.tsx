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
    <div className="flex bg-[#0a0a0a] border border-[#222] rounded-xl p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "rutinas" ? ROUTES.ADMIN_ENTRENAMIENTO : `${ROUTES.ADMIN_ENTRENAMIENTO}?tab=${tab.value}`}
          className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors cursor-pointer text-center ${
            active === tab.value
              ? "text-red-500 border-b-2 border-red-500 bg-zinc-900/60"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
