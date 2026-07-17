import { requireAdminSession } from "@/lib/auth/session"
import { PageHeader } from "@/components/layout/page-header"
import { ClasesAgenda } from "@/components/admin/clases-agenda"
import { ROUTES } from "@/constants/routes"

export const dynamic = "force-dynamic"

export default async function AdminClasesPage() {
  await requireAdminSession()

  return (
    <div>
      <PageHeader title="Clases" backHref={ROUTES.ADMIN_ENTRENAMIENTO} />
      <div className="p-4">
        <ClasesAgenda />
      </div>
    </div>
  )
}
