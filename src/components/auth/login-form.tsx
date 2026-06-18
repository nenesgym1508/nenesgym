"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { loginSchema, type LoginInput } from "@/schemas/client.schema"
import { loginAction, resetPasswordAction } from "@/actions/auth.actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"

export function LoginForm() {
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const onSubmit = async (data: LoginInput) => {
    setServerError(null)
    const result = await loginAction(data)
    if (result?.error) setServerError(result.error)
  }

  const handleReset = async () => {
    const email = (document.getElementById("email") as HTMLInputElement)?.value
    if (!email) { setServerError("Ingresa tu correo primero"); return }
    setResetLoading(true)
    const result = await resetPasswordAction(email)
    setResetLoading(false)
    if (result?.error) setServerError(result.error)
    else setResetSent(true)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input
        id="email"
        type="email"
        label="Correo electrónico"
        placeholder="hola@ejemplo.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <div className="relative">
        <Input
          id="password"
          type={showPwd ? "text" : "password"}
          label="Contraseña"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <button
          type="button"
          onClick={() => setShowPwd((v) => !v)}
          className="absolute right-3 top-[34px] text-zinc-500 hover:text-zinc-300"
        >
          {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      <div className="flex justify-end -mt-1">
        <button
          type="button"
          onClick={handleReset}
          disabled={resetLoading}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
        >
          {resetLoading ? "Enviando..." : "¿Olvidaste tu contraseña?"}
        </button>
      </div>

      {resetSent && (
        <p className="rounded-lg bg-green-500/10 border border-green-500/30 px-3 py-2 text-sm text-green-400">
          Te enviamos un correo para restablecer tu contraseña.
        </p>
      )}

      {serverError && (
        <p className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-11 mt-2 bg-red-600 hover:bg-red-700 text-white font-semibold"
      >
        {isSubmitting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          "Ingresar"
        )}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        ¿No tienes cuenta?{" "}
        <Link href={ROUTES.REGISTER} className="text-red-500 hover:text-red-400 font-medium">
          Regístrate
        </Link>
      </p>
    </form>
  )
}
