"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  stashInvitationTokenAction,
  acceptWithCurrentSessionAction,
  acceptWithPasswordAction,
} from "@/actions/invitations.actions"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { GoogleGlyph } from "@/components/auth/google-button"

interface InvitationAcceptProps {
  token: string
  firstName: string | null
  /** Correo de la sesión abierta, si la hay. Fuerza la confirmación explícita. */
  currentEmail: string | null
}

/**
 * Acciones de la landing de invitación.
 *
 * Google es la opción recomendada. El registro manual sigue existiendo, pero
 * **no crea un usuario nuevo**: reutiliza la cuenta inerte que el gimnasio ya
 * creó (ver acceptWithPasswordAction).
 */
export function InvitationAccept({ token, firstName, currentEmail }: InvitationAcceptProps) {
  const router = useRouter()
  const [mode, setMode] = useState<"choose" | "email">("choose")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  // Cuando el correo ya tiene cuenta NO se pide otro: se ofrece entrar con la
  // que ya existe y volver a este mismo enlace. Pedirle otro correo crearía una
  // segunda cuenta para la misma persona, justo lo que este flujo evita.
  const [correoYaTieneCuenta, setCorreoYaTieneCuenta] = useState(false)
  // URL de Google ya resuelta, para el rescate manual de abajo.
  const [googleUrl, setGoogleUrl] = useState<string | null>(null)

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPwd, setShowPwd] = useState(false)

  const goGoogle = async () => {
    setLoading(true)
    setError("")

    try {
      // Capa 2 del contexto: cookie de respaldo. La capa principal es el ?inv= del
      // redirectTo, porque la cookie no sobrevive al salto del WebView de WhatsApp
      // al navegador del sistema.
      //
      // ⚠️ NUNCA se espera indefinidamente a esto. Antes era un `await` pelado y
      // era el punto muerto del flujo: si la server action tardaba o fallaba (red
      // del móvil, WebView de WhatsApp), la promesa no resolvía, no había
      // try/catch, y el botón se quedaba girando para siempre sin llegar jamás a
      // Google. Bloquear el camino principal esperando a la capa de RESPALDO es
      // justo al revés de como debe ser: si la cookie no se guarda, el ?inv=
      // sigue funcionando solo.
      await Promise.race([
        stashInvitationTokenAction(token).catch(() => null),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ])

      const supabase = createClient()
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?inv=${encodeURIComponent(token)}`,
          // select_account, no consent: con la sesión del mostrador abierta, Google
          // autoseleccionaría esa cuenta y vincularía al cliente equivocado.
          queryParams: { prompt: "select_account" },
          // Navegamos a mano (abajo) en vez de dejar que supabase-js llame a
          // window.location.assign() por su cuenta. Así, si por lo que sea no
          // llega URL, lo vemos y lo decimos, en lugar de no pasar nada.
          skipBrowserRedirect: true,
        },
      })

      if (oauthError || !data?.url) {
        setError("No se pudo abrir Google. Intenta de nuevo o usa «Crear acceso con correo».")
        setLoading(false)
        return
      }

      // Rescate para navegadores incrustados (el de WhatsApp, sobre todo):
      // algunos ignoran en silencio una navegación por script que ya no cuelga
      // directamente del toque del usuario. Si a los 2,5 s seguimos aquí, es que
      // pasó eso — y un <a> que el cliente toca a mano sí funciona siempre.
      setGoogleUrl(data.url)
      setTimeout(() => setLoading(false), 2500)

      window.location.href = data.url
    } catch {
      setError("No se pudo abrir Google. Revisa tu conexión o usa «Crear acceso con correo».")
      setLoading(false)
    }
  }

  /** Capa 3: ya hay sesión y el cliente confirma que es suya. Repara el caso en que
   *  el contexto se perdió durante el OAuth. */
  const linkCurrent = async () => {
    setLoading(true)
    setError("")
    const result = await acceptWithCurrentSessionAction(token)
    if (!result.ok) {
      setError(result.message)
      setLoading(false)
      return
    }
    router.push("/invitacion/exito")
  }

  const useAnotherAccount = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    setLoading(false)
  }

  const submitEmail = async () => {
    if (password !== confirm) {
      setError("Las contraseñas no coinciden")
      return
    }
    setLoading(true)
    setError("")
    setCorreoYaTieneCuenta(false)
    let result: Awaited<ReturnType<typeof acceptWithPasswordAction>>
    try {
      result = await acceptWithPasswordAction(token, email, password)
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.")
      setLoading(false)
      return
    }
    if (!result.ok) {
      setError(result.message)
      setCorreoYaTieneCuenta(result.code === "EMAIL_TAKEN")
      setLoading(false)
      return
    }
    router.push("/invitacion/exito")
  }

  // ── Sesión abierta: confirmación explícita antes de vincular ──────────────
  if (currentEmail) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
          <p className="text-xs text-zinc-400">Estás dentro como</p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-100 break-all">{currentEmail}</p>
          {firstName && (
            <p className="mt-1.5 text-[11px] text-zinc-500">
              ¿Eres tú, {firstName}? Vincularemos esta cuenta a tu perfil del gimnasio.
            </p>
          )}
        </div>

        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

        <LoadingButton
          onClick={linkCurrent}
          pending={loading}
          pendingText="Vinculando..."
          className="w-full flex items-center justify-center gap-2 rounded-lg btn-glossy-red h-11 text-sm font-semibold text-white cursor-pointer"
        >
          Sí, vincular esta cuenta
        </LoadingButton>

        <button
          onClick={useAnotherAccount}
          disabled={loading}
          className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50 cursor-pointer"
        >
          Usar otra cuenta
        </button>
      </div>
    )
  }

  if (mode === "email") {
    return (
      <div className="space-y-3">
        <Input
          id="inv_email"
          type="email"
          label="Tu correo"
          placeholder="hola@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <div className="relative">
          <Input
            id="inv_password"
            type={showPwd ? "text" : "password"}
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            className="absolute right-3 top-[34px] text-zinc-500 hover:text-zinc-300"
          >
            {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Input
          id="inv_confirm"
          type={showPwd ? "text" : "password"}
          label="Confirmar contraseña"
          placeholder="••••••••"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        {correoYaTieneCuenta && (
          <a
            href={`/login?next=${encodeURIComponent(`/invitacion/${token}`)}`}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-sm font-medium text-zinc-200 hover:border-white/20"
          >
            Iniciar sesión con ese correo y volver
          </a>
        )}

        <LoadingButton
          onClick={submitEmail}
          pending={loading}
          pendingText="Activando..."
          disabled={!email.trim() || password.length < 8}
          className="w-full flex items-center justify-center gap-2 rounded-lg btn-glossy-red h-11 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer"
        >
          Activar mi acceso
        </LoadingButton>

        <button
          onClick={() => { setMode("choose"); setError("") }}
          className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 cursor-pointer"
        >
          Volver
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={goGoogle}
        disabled={loading}
        className="relative w-full h-11 flex items-center justify-center gap-3 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-100 font-medium text-sm transition-all duration-200 shadow-sm disabled:opacity-60 cursor-pointer"
      >
        {loading ? <Loader2 className="size-4 animate-spin text-zinc-400" /> : <GoogleGlyph />}
        <span>Continuar con Google</span>
        <span className="absolute -top-2 right-3 rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
          Recomendado
        </span>
      </button>

      {googleUrl && !loading && (
        <a
          href={googleUrl}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/20 text-sm font-medium text-amber-200"
        >
          ¿No se abrió Google? Toca aquí
        </a>
      )}

      {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      <div className="relative my-1 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-zinc-950 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          o
        </span>
      </div>

      <button
        onClick={() => setMode("email")}
        className="w-full text-center text-sm text-zinc-400 hover:text-zinc-200 cursor-pointer"
      >
        Crear acceso con correo
      </button>
    </div>
  )
}
