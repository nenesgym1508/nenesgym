"use server"

import { revalidatePath, updateTag } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { GYM_ID } from "@/constants/plans"
import { ROUTES } from "@/constants/routes"
import type { PaymentMethod } from "@/types/payment"

export async function uploadPaymentAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("profile_id", user.id)
    .single()
  if (!client) return { error: "Perfil de cliente no encontrado" }

  const file = formData.get("receipt") as File | null
  const planId = formData.get("plan_id") as string | null
  const method = (formData.get("method") as PaymentMethod) ?? "nequi"
  const amountCentsStr = formData.get("amount_cents") as string
  const amountCents = parseInt(amountCentsStr)

  if (!amountCents || amountCents <= 0) return { error: "Monto inválido" }

  if (planId) {
    const { data: plan } = await supabase
      .from("plans")
      .select("price_cents")
      .eq("id", planId)
      .maybeSingle()
    if (plan && plan.price_cents !== amountCents) {
      return { error: "El monto ingresado no coincide con el precio del plan seleccionado." }
    }
  }

  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

  let receiptPath: string | null = null
  if (file && file.size > 0) {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return { error: "Tipo de archivo no permitido. Usá JPG, PNG, WEBP o PDF." }
    if (file.size > MAX_FILE_SIZE) return { error: "El archivo no puede superar 5 MB." }
    const adminClient = createAdminClient()
    const ext = file.name.split(".").pop() ?? "jpg"
    const fileName = `${Date.now()}.${ext}`
    const path = `${GYM_ID}/${client.id}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const { error: uploadError } = await adminClient.storage
      .from("receipts")
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (uploadError) return { error: "Error al subir el comprobante: " + uploadError.message }
    receiptPath = path
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    gym_id: GYM_ID,
    client_id: client.id,
    plan_id: planId || null,
    amount_cents: amountCents,
    method,
    status: "pending",
    receipt_path: receiptPath,
  })

  if (paymentError) return { error: "Error al registrar el pago: " + paymentError.message }

  updateTag("admin-payments")
  revalidatePath(ROUTES.CLIENTE_PAGOS)
  revalidatePath(ROUTES.CLIENTE_DASHBOARD)
  return { success: true }
}
