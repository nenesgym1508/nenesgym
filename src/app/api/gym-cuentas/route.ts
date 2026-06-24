import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GYM_ID } from "@/constants/plans"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gym } = await (admin as any)
    .from("gyms")
    .select("nequi_number, nequi_titular, daviplata_number, daviplata_titular")
    .eq("id", GYM_ID)
    .single()

  const cuentas: { metodo: string; valor: string; titular: string }[] = []
  if (gym?.nequi_number) {
    cuentas.push({ metodo: "Nequi", valor: gym.nequi_number, titular: gym.nequi_titular ?? "" })
  }
  if (gym?.daviplata_number) {
    cuentas.push({ metodo: "Daviplata", valor: gym.daviplata_number, titular: gym.daviplata_titular ?? "" })
  }

  return NextResponse.json({ cuentas })
}
