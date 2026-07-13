import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body?.token as string | undefined

    if (!token?.trim()) {
      return NextResponse.json({ ok: false, code: "MISSING_TOKEN", message: "Token requerido." })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("process_check_in", {
      p_gym_token: token.trim(),
    })

    if (error) {
      // 22P02 = invalid_text_representation: el texto ingresado no tiene
      // forma de UUID válido (típico de un código manual mal escrito).
      if (error.code === "22P02") {
        return NextResponse.json({
          ok: false,
          code: "INVALID_CODE",
          message: "Código incorrecto.",
        })
      }
      return NextResponse.json({
        ok: false,
        code: "DB_ERROR",
        message: "Error al procesar el ingreso.",
      })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({
      ok: false,
      code: "SERVER_ERROR",
      message: "Error del servidor. Intenta de nuevo.",
    })
  }
}
