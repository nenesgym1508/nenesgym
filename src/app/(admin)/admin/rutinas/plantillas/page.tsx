import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getRoutineTemplates } from "@/services/routine-templates.service"
import { PageHeader } from "@/components/layout/page-header"
import { RoutineTemplatesList } from "@/components/admin/routine-templates-list"
import { ROUTES } from "@/constants/routes"
import { createRoutineTemplateAction } from "@/actions/routine-templates.actions"

export const dynamic = "force-dynamic"

export default async function AdminRoutineTemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const templates = await getRoutineTemplates()

  // Inline handle server actions for template creation to keep files clean and standard
  const handleCreate = async (formData: FormData) => {
    "use server"
    const name = formData.get("name") as string
    if (!name?.trim()) return

    const res = await createRoutineTemplateAction({ name })
    if (res.success && res.id) {
      redirect(`/admin/rutinas/plantillas/${res.id}`)
    }
  }

  return (
    <div>
      <PageHeader title="Plantillas de Rutina" backHref={ROUTES.ADMIN_RUTINAS} />
      <div className="p-4 space-y-6">
        <form action={handleCreate} className="rounded-2xl border border-white/8 bg-zinc-900/60 p-4 space-y-3">
          <p className="text-xs font-semibold text-zinc-400">Crear una plantilla desde cero</p>
          <div className="flex gap-2">
            <input
              type="text"
              name="name"
              required
              placeholder="Nombre de la plantilla"
              className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-200 outline-none focus:border-red-600/50"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
            >
              <Plus className="size-4" />
              Crear
            </button>
          </div>
        </form>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Plantillas Disponibles
          </h3>
          <RoutineTemplatesList templates={templates} />
        </div>
      </div>
    </div>
  )
}
