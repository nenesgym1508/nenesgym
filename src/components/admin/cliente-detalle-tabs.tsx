import Link from "next/link"
import { adminClienteDetalle } from "@/constants/routes"

export type ClienteDetalleTab = "plan" | "rutinas" | "progreso"

const TABS: { value: ClienteDetalleTab; label: string }[] = [
  { value: "plan", label: "Plan" },
  { value: "rutinas", label: "Rutinas" },
  { value: "progreso", label: "Progreso" },
]

export function ClienteDetalleTabs({ clientId, active }: { clientId: string; active: ClienteDetalleTab }) {
  const base = adminClienteDetalle(clientId)
  return (
    <div className="flex bg-[#0a0a0a] border border-[#222] rounded-xl p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value === "plan" ? base : `${base}?tab=${tab.value}`}
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
