import { requireAdminSession } from "@/lib/auth/session"
import { NuevaRutinaBibliotecaFlow } from "@/components/admin/nueva-rutina-biblioteca-flow"

export const dynamic = "force-dynamic"

export default async function NuevaRutinaBibliotecaPage({
  searchParams
}: {
  searchParams: Promise<{ returnToDate?: string }>
}) {
  await requireAdminSession()

  const { returnToDate } = await searchParams

  return <NuevaRutinaBibliotecaFlow returnToDate={returnToDate} />
}
