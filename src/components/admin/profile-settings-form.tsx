"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle, Mail, User, KeyRound } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  updateProfileNameAction,
  updateEmailAction,
  updatePasswordAction,
  setPasswordAction,
} from "@/actions/auth.actions"

interface ProfileSettingsFormProps {
  currentEmail: string
  currentName: string
  /** false cuando la cuenta entró con Google y todavía no tiene contraseña propia */
  hasPassword: boolean
}

export function ProfileSettingsForm({ currentEmail, currentName, hasPassword }: ProfileSettingsFormProps) {
  const router = useRouter()
  const [name, setName] = useState(currentName)
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  async function handleNameSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim() === currentName) return
    setNameLoading(true)
    setNameMsg(null)
    const result = await updateProfileNameAction(name.trim())
    setNameLoading(false)
    if (result?.error) setNameMsg({ type: "err", text: result.error })
    else setNameMsg({ type: "ok", text: "Nombre actualizado correctamente" })
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailMsg(null)
    const result = await updateEmailAction(newEmail.trim())
    setEmailLoading(false)
    if (result?.error) setEmailMsg({ type: "err", text: result.error })
    else {
      setEmailMsg({
        type: "ok",
        text: `Te enviamos un correo a ${newEmail} para confirmar el cambio. El correo actual sigue activo hasta que confirmes.`,
      })
      setNewEmail("")
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newPassword) return
    setPassLoading(true)
    setPassMsg(null)

    const result = hasPassword
      ? await updatePasswordAction(newPassword, currentPassword)
      : await setPasswordAction(newPassword, confirmPassword)

    setPassLoading(false)
    if (result?.error) {
      setPassMsg({ type: "err", text: result.error })
      return
    }

    setPassMsg({
      type: "ok",
      text: hasPassword
        ? "Contraseña actualizada correctamente"
        : "Contraseña creada. Ahora puedes entrar con tu correo y contraseña, o seguir usando Google.",
    })
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    // Refresca para que el formulario pase a modo "cambiar contraseña"
    router.refresh()
  }

  const passwordFormValido = hasPassword
    ? currentPassword.length > 0 && newPassword.length >= 6
    : newPassword.length >= 6 && confirmPassword.length >= 6

  return (
    <div className="space-y-5">
      {/* Nombre */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Nombre</h3>
        </div>
        <form onSubmit={handleNameSave} className="space-y-3">
          <Input
            id="full_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
          />
          {nameMsg && (
            <p className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
              nameMsg.type === "ok"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {nameMsg.type === "ok" && <CheckCircle className="size-4 mt-0.5 shrink-0" />}
              {nameMsg.text}
            </p>
          )}
          <Button
            type="submit"
            disabled={nameLoading || !name.trim() || name.trim() === currentName}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-10"
          >
            {nameLoading ? <Loader2 className="size-4 animate-spin" /> : "Guardar nombre"}
          </Button>
        </form>
      </Card>

      {/* Correo */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Correo electrónico</h3>
        </div>
        <p className="text-xs text-zinc-500">
          Correo actual: <span className="text-zinc-300">{currentEmail}</span>
        </p>
        <form onSubmit={handleEmailChange} className="space-y-3">
          <Input
            id="new_email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="nuevo@correo.com"
            label="Nuevo correo"
          />
          <p className="text-xs text-zinc-600">
            Se enviará un correo de confirmación a la nueva dirección. Debes hacer clic en el enlace para activar el cambio.
          </p>
          {emailMsg && (
            <p className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
              emailMsg.type === "ok"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {emailMsg.type === "ok" && <CheckCircle className="size-4 mt-0.5 shrink-0" />}
              {emailMsg.text}
            </p>
          )}
          <Button
            type="submit"
            disabled={emailLoading || !newEmail.trim()}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold h-10"
          >
            {emailLoading ? <Loader2 className="size-4 animate-spin" /> : "Cambiar correo"}
          </Button>
        </form>
      </Card>

      {/* Contraseña */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">
            {hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </h3>
        </div>

        {!hasPassword && (
          <p className="text-xs text-zinc-500">
            Entraste con Google y tu cuenta aún no tiene contraseña. Al crear una podrás
            entrar también con tu correo y contraseña, sin perder el acceso con Google.
          </p>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-3">
          {hasPassword ? (
            <>
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                label="Contraseña actual"
              />
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                label="Nueva contraseña"
              />
            </>
          ) : (
            <>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                label="Contraseña"
              />
              <Input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                label="Confirmar contraseña"
                error={
                  confirmPassword.length > 0 && confirmPassword !== newPassword
                    ? "Las contraseñas no coinciden"
                    : undefined
                }
              />
            </>
          )}

          {passMsg && (
            <p className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
              passMsg.type === "ok"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {passMsg.type === "ok" && <CheckCircle className="size-4 mt-0.5 shrink-0" />}
              {passMsg.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={passLoading || !passwordFormValido}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-10"
          >
            {passLoading
              ? <Loader2 className="size-4 animate-spin" />
              : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
