import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getTrainingRoutineWithDays } from "@/services/training-routines.service"
import { TrainingRoutinePreview } from "@/components/cliente/training-routine-preview"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteBibliotecaRutinaDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  if (!client) redirect(ROUTES.CLIENTE_DASHBOARD)

  // getTrainingRoutineWithDays está ligado a la sesión (RLS): para un cliente
  // solo devuelve la rutina si es pública y activa (migración 020). Si no lo
  // es, o no existe, devuelve null y se redirige — no hay forma de "adivinar"
  // el contenido de una rutina no publicada por esta vía.
  const routine = await getTrainingRoutineWithDays(id)
  if (!routine || !routine.is_public) {
    redirect(ROUTES.CLIENTE_RUTINAS)
  }

  return <TrainingRoutinePreview routine={routine} />
}
