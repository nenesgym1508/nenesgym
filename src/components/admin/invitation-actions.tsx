"use client"

import { useState, useCallback } from "react"
import { MessageCircle, Link2, Loader2, RefreshCw } from "lucide-react"
import { createInvitationAction } from "@/actions/invitations.actions"
import { SuccessToast } from "@/components/ui/success-toast"

interface InvitationActionsProps {
  clientId: string
  /** Enlace ya generado por quien monta el componente (paso 3 del alta). */
  initialUrl?: string | null
  initialWaUrl?: string | null
  /** true mientras el padre está generando el enlace. */
  initialLoading?: boolean
  /** Texto del botón que dispara la generación cuando no hay enlace previo. */
  generateLabel?: string
  onGenerated?: () => void
}

/**
 * Botones de invitación: WhatsApp + Copiar enlace.
 *
 * Se usa en DOS sitios —el paso 3 del alta y la ficha del cliente—, así que vive
 * aquí y no dentro de ninguno de los dos.
 *
 * El enlace solo se puede mostrar UNA vez: en la base únicamente queda el sha256
 * del token, así que si se pierde esta pantalla hay que regenerarlo (lo que
 * revoca el anterior). Por eso no se guarda en ningún estado del servidor.
 */
export function InvitationActions({
  clientId,
  initialUrl = null,
  initialWaUrl = null,
  initialLoading = false,
  generateLabel = "Generar invitación",
  onGenerated,
}: InvitationActionsProps) {
  const [generating, setGenerating] = useState(false)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [waUrl, setWaUrl] = useState<string | null>(initialWaUrl)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const loading = generating || initialLoading
  const currentUrl = url ?? initialUrl
  const currentWaUrl = waUrl ?? initialWaUrl

  // Generar SOLO desde un evento del usuario (o desde el flujo del padre). Nunca
  // desde un efecto: además de disparar renders en cascada, cada generación
  // revoca el enlace anterior, así que un efecto mal atado quemaría enlaces.
  const generate = useCallback(async () => {
    setGenerating(true)
    setError("")
    let result: Awaited<ReturnType<typeof createInvitationAction>>
    try {
      result = await createInvitationAction(clientId)
    } catch {
      setGenerating(false)
      setError("No se pudo conectar. Intenta de nuevo.")
      return
    }
    setGenerating(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    setUrl(result.url)
    setWaUrl(result.waUrl)
    onGenerated?.()
  }, [clientId, onGenerated])

  const copy = async () => {
    if (!currentUrl) return
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
    } catch {
      setError("No se pudo copiar. Selecciona el enlace a mano.")
    }
  }

  if (loading && !currentUrl) {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-xs text-zinc-500">
        <Loader2 className="size-4 animate-spin" />
        Generando invitación...
      </div>
    )
  }

  if (!currentUrl) {
    return (
      <div className="space-y-2">
        <button
          onClick={generate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium text-zinc-300 hover:border-white/20 disabled:opacity-50 cursor-pointer"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          {generateLabel}
        </button>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <div className="w-full space-y-2">
      {currentWaUrl ? (
        <a
          href={currentWaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-xl btn-glossy-green py-2.5 text-sm font-semibold text-white cursor-pointer"
        >
          <MessageCircle className="size-4" />
          Enviar invitación por WhatsApp
        </a>
      ) : (
        // Sin teléfono usable no se pinta un botón que no llevaría a ninguna
        // parte: el admin lo manda por otro medio con "Copiar enlace".
        <p className="rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-center text-[11px] text-zinc-500">
          Este cliente no tiene un WhatsApp válido. Copia el enlace y mándaselo por otro medio.
        </p>
      )}

      <button
        onClick={copy}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] py-2.5 text-sm font-medium text-zinc-300 hover:border-white/20 cursor-pointer"
      >
        <Link2 className="size-4" />
        Copiar enlace de invitación
      </button>

      <button
        onClick={generate}
        disabled={loading}
        className="flex w-full items-center justify-center gap-1.5 py-1 text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50 cursor-pointer"
      >
        {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
        Generar uno nuevo (anula el anterior)
      </button>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <SuccessToast
        open={copied}
        title="Enlace copiado"
        subtitle="Pégalo donde quieras enviárselo al cliente"
        onClose={() => setCopied(false)}
      />
    </div>
  )
}
