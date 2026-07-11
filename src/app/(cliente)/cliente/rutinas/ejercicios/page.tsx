import { redirect } from "next/navigation"
import { getCurrentClientData } from "@/services/clients.service"
import { getExercises, getMyCreatedExercises, getMyLibrary } from "@/services/exercises.service"
import { PageHeader } from "@/components/layout/page-header"
import { ClientExercisesManager } from "@/components/cliente/client-exercises-manager"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function ClienteEjerciciosPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  if (!client) redirect(ROUTES.CLIENTE_DASHBOARD)

  const [myLibrary, gymExercises, myCreated] = await Promise.all([
    getMyLibrary(client.id),
    getExercises({ visibility: "gym", includeInactive: true }),
    getMyCreatedExercises(client.id),
  ])

  return (
    <div className="pb-24">
      <PageHeader title="Mis ejercicios" backHref={ROUTES.CLIENTE_RUTINAS} />
      <div className="p-4">
        <ClientExercisesManager
          initialLibrary={myLibrary}
          initialGymExercises={gymExercises}
          initialMyCreated={myCreated}
        />
      </div>
    </div>
  )
}
