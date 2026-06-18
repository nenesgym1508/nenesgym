import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const path = searchParams.get("path")

  if (!path) return NextResponse.json({ error: "Path requerido" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient.storage.from("receipts").createSignedUrl(path, 300)

  if (error || !data) {
    return NextResponse.json({ error: "No se pudo obtener el comprobante" }, { status: 500 })
  }

  return NextResponse.redirect(data.signedUrl)
}
