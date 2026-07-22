"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { registerSchema, type RegisterInput } from "@/schemas/client.schema"
import { registerAction } from "@/actions/auth.actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { GoogleAuthButton } from "@/components/auth/google-button"
import { ROUTES } from "@/constants/routes"

export function RegisterForm() {
  const [showPwd, setShowPwd] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const onSubmit = async (data: RegisterInput) => {
    setServerError(null)
    const result = await registerAction({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone || undefined,
      password: data.password,
    })
    if (result?.error) setServerError(result.error)
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleAuthButton label="Registrarse con Google" />

      <div className="relative my-1 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <span className="relative bg-zinc-950 px-2 text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          o regístrate con correo
        </span>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          id="full_name"
          type="text"
          label="Nombre completo"
          placeholder="Juan Pérez"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register("full_name")}
        />
        <Input
          id="email"
          type="email"
          label="Correo electrónico"
          placeholder="hola@ejemplo.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          id="phone"
          type="tel"
          label="WhatsApp / Celular (opcional)"
          placeholder="3001234567"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />
        <div className="relative">
          <Input
            id="password"
            type={showPwd ? "text" : "password"}
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
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
        <Input
          id="confirm_password"
          type={showPwd ? "text" : "password"}
          label="Confirmar contraseña"
          placeholder="••••••••"
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          {...register("confirm_password")}
        />

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
            "Crear cuenta"
          )}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          ¿Ya tienes cuenta?{" "}
          <Link href={ROUTES.LOGIN} className="text-red-500 hover:text-red-400 font-medium">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}
