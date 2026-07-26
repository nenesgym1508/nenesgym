import { redirect } from "next/navigation"
import { adminClienteDetalle } from "@/constants/routes"

// "Rutinas" pasó de ruta propia a pestaña dentro del detalle del cliente
// (ver /admin/clientes/[id]?tab=rutinas). Se conserva esta ruta como redirect
// por si quedó algún enlace o marcador guardado apuntando aquí.
export default async function ClienteRutinasPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`${adminClienteDetalle(id)}?tab=rutinas` as const)
}
