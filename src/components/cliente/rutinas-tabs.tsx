"use client"

import { useState } from "react"

interface RutinasTabsProps {
  misRutinasContent: React.ReactNode
  bibliotecaContent: React.ReactNode
}

export function RutinasTabs({ misRutinasContent, bibliotecaContent }: RutinasTabsProps) {
  const [activeTab, setActiveTab] = useState<"biblioteca" | "mias">("biblioteca")

  return (
    <div className="space-y-5">
      <div className="flex bg-zinc-900 rounded-2xl p-1 shadow-inner border border-white/5">
        <button
          onClick={() => setActiveTab("biblioteca")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
            activeTab === "biblioteca" ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg border border-red-500/20" : "text-zinc-500 hover:text-zinc-300 bg-transparent border border-transparent"
          }`}
        >
          Rutinas públicas
        </button>
        <button
          onClick={() => setActiveTab("mias")}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest rounded-xl transition-all duration-300 ${
            activeTab === "mias" ? "bg-gradient-to-r from-red-700 to-red-600 text-white shadow-lg border border-red-500/20" : "text-zinc-500 hover:text-zinc-300 bg-transparent border border-transparent"
          }`}
        >
          Mis rutinas
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {activeTab === "biblioteca" ? bibliotecaContent : misRutinasContent}
      </div>
    </div>
  )
}
