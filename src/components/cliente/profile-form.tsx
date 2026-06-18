"use client"

import { useState } from "react"
import { Loader2, CheckCircle, User, Mail, Lock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  updateProfileNameAction,
  updateProfilePhoneAction,
  updateEmailAction,
  updatePasswordAction,
} from "@/actions/auth.actions"

type Msg = { type: "ok" | "err"; text: string } | null

function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null
  return (
    <p
      className={`text-sm px-3 py-2 rounded-lg flex items-start gap-2 ${
        msg.type === "ok"
          ? "bg-green-500/10 border border-green-500/20 text-green-400"
          : "bg-red-500/10 border border-red-500/20 text-red-400"
      }`}
    >
      {msg.type === "ok" && <CheckCircle className="size-4 mt-0.5 shrink-0" />}
      {msg.text}
    </p>
  )
}

interface ClientProfileFormProps {
  currentName: string
  currentPhone: string
  currentEmail: string
}

export function ClientProfileForm({ currentName, currentPhone, currentEmail }: ClientProfileFormProps) {
  const [name, setName] = useState(currentName)
  const [phone, setPhone] = useState(currentPhone)
  const [dataLoading, setDataLoading] = useState(false)
  const [dataMsg, setDataMsg] = useState<Msg>(null)

  const [newEmail, setNewEmail] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState<Msg>(null)

  const [pw, setPw] = useState("")
  const [pw2, setPw2] = useState("")
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg] = useState<Msg>(null)

  const dataDirty = name.trim() !== currentName || phone.trim() !== currentPhone

  async function handleDataSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !dataDirty) return
    setDataLoading(true)
    setDataMsg(null)
    const results = await Promise.all([
      name.trim() !== currentName ? updateProfileNameAction(name.trim()) : Promise.resolve({ success: true }),
      phone.trim() !== currentPhone ? updateProfilePhoneAction(phone.trim()) : Promise.resolve({ success: true }),
    ])
    setDataLoading(false)
    const err = results.find((r) => "error" in r && r.error)
    if (err && "error" in err) setDataMsg({ type: "err", text: err.error as string })
    else setDataMsg({ type: "ok", text: "Datos actualizados correctamente" })
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
        text: `Te enviamos un correo a ${newEmail} para confirmar el cambio.`,
      })
      setNewEmail("")
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (!pw) return
    if (pw !== pw2) {
      setPwMsg({ type: "err", text: "Las contraseñas no coinciden" })
      return
    }
    setPwLoading(true)
    setPwMsg(null)
    const result = await updatePasswordAction(pw)
    setPwLoading(false)
    if (result?.error) setPwMsg({ type: "err", text: result.error })
    else {
      setPwMsg({ type: "ok", text: "Contraseña actualizada correctamente" })
      setPw("")
      setPw2("")
    }
  }

  return (
    <div className="space-y-5">
      {/* Nombre + teléfono */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Mis datos</h3>
        </div>
        <form onSubmit={handleDataSave} className="space-y-3">
          <Input
            id="full_name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre completo"
            label="Nombre"
          />
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: 300 123 4567"
            label="Teléfono"
          />
          <Feedback msg={dataMsg} />
          <Button
            type="submit"
            disabled={dataLoading || !name.trim() || !dataDirty}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold h-10"
          >
            {dataLoading ? <Loader2 className="size-4 animate-spin" /> : "Guardar cambios"}
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
          <Feedback msg={emailMsg} />
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
          <Lock className="size-4 text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Cambiar contraseña</h3>
        </div>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <Input
            id="new_password"
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="Nueva contraseña"
            label="Nueva contraseña"
          />
          <Input
            id="new_password_confirm"
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Repite la contraseña"
            label="Confirmar contraseña"
          />
          <Feedback msg={pwMsg} />
          <Button
            type="submit"
            disabled={pwLoading || !pw || !pw2}
            className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold h-10"
          >
            {pwLoading ? <Loader2 className="size-4 animate-spin" /> : "Actualizar contraseña"}
          </Button>
        </form>
      </Card>
    </div>
  )
}
