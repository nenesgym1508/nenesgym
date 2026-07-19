"use client"

import { useState } from "react"

interface ProgresoTabsProps {
  progresoContent: React.ReactNode
  historialContent: React.ReactNode
}

export function ProgresoTabs({ progresoContent, historialContent }: ProgresoTabsProps) {
  const [activeTab, setActiveTab] = useState<"progreso" | "historial">("progreso")

  return (
    <div className="space-y-6">
      <div className="flex bg-zinc-900 rounded-2xl p-1 shadow-inner border border-white/5">
        <button
          onClick={() => setActiveTab("progreso")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
            activeTab === "progreso" ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg border border-red-500/20" : "text-zinc-500 hover:text-zinc-300 bg-transparent border border-transparent"
          }`}
        >
          Mi Progreso
        </button>
        <button
          onClick={() => setActiveTab("historial")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
            activeTab === "historial" ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg border border-red-500/20" : "text-zinc-500 hover:text-zinc-300 bg-transparent border border-transparent"
          }`}
        >
          Historial
        </button>
      </div>

      <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "progreso" ? progresoContent : historialContent}
      </div>
    </div>
  )
}
