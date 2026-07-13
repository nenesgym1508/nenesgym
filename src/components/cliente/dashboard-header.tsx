"use client"

import { useState } from "react"
import { User, LogOut, X, Dumbbell, Settings } from "lucide-react"
import { ActionMenu } from "@/components/ui/action-menu"
import { ClientProfileForm } from "@/components/cliente/profile-form"
import { logoutAction } from "@/actions/auth.actions"
import { Card } from "@/components/ui/card"
import { InstallAppCard } from "@/components/pwa/install-app-card"

interface DashboardHeaderProps {
  profile: {
    full_name: string | null
    phone: string | null
    email: string
  }
}

export function DashboardHeader({ profile }: DashboardHeaderProps) {
  const [showProfileModal, setShowProfileModal] = useState(false)

  const menuActions = [
    {
      label: "Editar perfil",
      icon: <User className="size-4" />,
      onClick: () => setShowProfileModal(true)
    },
    {
      label: "Cerrar sesión",
      icon: <LogOut className="size-4" />,
      destructive: true,
      onClick: async () => {
        if (confirm("¿Seguro de que deseas cerrar sesión?")) {
          await logoutAction()
        }
      }
    }
  ]

  return (
    <>
      <header className="flex h-14 items-center gap-3 border-b border-white/8 px-4 md:px-10 bg-zinc-950">
        <h1 className="flex-1 text-base font-semibold text-zinc-100">NENE&apos;S GYM</h1>
        <div className="flex items-center gap-2 shrink-0">
          <InstallAppCard variant="header" />
          <ActionMenu 
            items={menuActions} 
            label="Ajustes de perfil" 
            triggerIcon={<Settings className="size-4" />} 
          />
        </div>
      </header>

      {showProfileModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 md:backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h3 className="text-base font-bold text-zinc-100">Mi Perfil</h3>
                <p className="text-xs text-zinc-500">Administra tus datos y contraseña</p>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)} 
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-1 space-y-4 pb-2">
              <ClientProfileForm
                currentName={profile.full_name ?? ""}
                currentPhone={profile.phone ?? ""}
                currentEmail={profile.email}
              />
              
              <Card className="flex items-center gap-3 p-4 bg-zinc-950/40 border border-white/5">
                <div className="size-10 rounded-xl bg-red-600/15 flex items-center justify-center">
                  <Dumbbell className="size-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Mi gimnasio</p>
                  <p className="text-sm font-semibold text-zinc-200">NENE&apos;S GYM</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
