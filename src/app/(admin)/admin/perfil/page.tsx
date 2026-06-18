import { redirect } from "next/navigation"
import { ROUTES } from "@/constants/routes"

// La configuración del profesor vive ahora en "Más".
export default function AdminPerfilPage() {
  redirect(ROUTES.ADMIN_MAS)
}
