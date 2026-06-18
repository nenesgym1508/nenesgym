"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Download, Share, Plus, X } from "lucide-react"
import { Card } from "@/components/ui/card"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

// Estado del navegador (display-mode / iOS) leído vía useSyncExternalStore:
// patrón idiomático para sincronizar con sistemas externos sin setState en efectos.
function subscribeStandalone(cb: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)")
  mq.addEventListener("change", cb)
  window.addEventListener("appinstalled", cb)
  return () => {
    mq.removeEventListener("change", cb)
    window.removeEventListener("appinstalled", cb)
  }
}
function getStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true
}
function getIsIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}
const noopSubscribe = () => () => {}

interface InstallAppCardProps {
  variant?: "card" | "header"
}

export function InstallAppCard({ variant = "card" }: InstallAppCardProps) {
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandalone, () => false)
  const isIOS = useSyncExternalStore(noopSubscribe, getIsIOS, () => false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [showIosDialog, setShowIosDialog] = useState(false)

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)
    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // Ya instalada o cerrada por el usuario → no mostrar nada.
  if (isStandalone || dismissed) return null
  // Sin prompt disponible y no es iOS → no hay acción posible, no mostramos botón muerto.
  if (!deferred && !isIOS) return null

  async function handleInstall() {
    if (!deferred) return
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === "accepted") setDeferred(null)
  }

  if (variant === "header") {
    const triggerInstall = deferred ? handleInstall : () => setShowIosDialog(true)

    return (
      <>
        <button
          type="button"
          onClick={triggerInstall}
          title="Instalar App"
          className="flex items-center gap-1 rounded-lg border border-red-900/50 bg-red-950/30 px-2 py-1 text-[10px] font-bold text-red-400 hover:bg-red-900/40 transition-colors cursor-pointer"
        >
          <Download className="size-3" />
          <span>Instalar App</span>
        </button>

        {showIosDialog && (
          <div 
            className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4" 
            onClick={() => setShowIosDialog(false)}
          >
            <div 
              className="relative w-full max-w-[280px] rounded-xl bg-zinc-900 border border-white/10 p-5" 
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setShowIosDialog(false)} 
                className="absolute right-4 top-4 text-zinc-500 hover:text-zinc-300"
              >
                <X className="size-4" />
              </button>
              <h3 className="text-sm font-semibold text-zinc-100 mb-3">Instalar en tu iPhone</h3>
              <div className="space-y-2.5 text-xs text-zinc-400">
                <p className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded bg-white/10 font-bold text-zinc-200">1</span>
                  <span>Toca el botón Compartir <Share className="inline size-3 text-zinc-300 ml-0.5" /> en Safari</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex size-5 items-center justify-center rounded bg-white/10 font-bold text-zinc-200">2</span>
                  <span>Selecciona &ldquo;Agregar al inicio&rdquo; <Plus className="inline size-3 text-zinc-300 ml-0.5" /></span>
                </p>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <Card className="relative border-red-900/40 bg-gradient-to-br from-red-950/40 to-zinc-900 p-4">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Cerrar"
        className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-600/15">
          <Download className="size-5 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100">Instala NENE&apos;S GYM en tu celular</h3>
          <p className="mt-0.5 text-xs text-zinc-400">
            Accede más rápido desde tu pantalla de inicio.
          </p>

          {deferred ? (
            <button
              type="button"
              onClick={handleInstall}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
            >
              <Download className="size-4" />
              Instalar app
            </button>
          ) : (
            <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Para instalar en iPhone:</p>
              <p className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded bg-white/10 font-bold">1</span>
                Toca el botón Compartir <Share className="inline size-3.5 text-zinc-300" />
              </p>
              <p className="flex items-center gap-1.5">
                <span className="flex size-5 items-center justify-center rounded bg-white/10 font-bold">2</span>
                Selecciona &ldquo;Agregar a pantalla de inicio&rdquo; <Plus className="inline size-3.5 text-zinc-300" />
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
