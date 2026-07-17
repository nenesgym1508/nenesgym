import { notFound } from "next/navigation"
import { requireAdminSession } from "@/lib/auth/session"
import { getDailyClassWithBlocks } from "@/services/classes.service"
import { getExercises } from "@/services/exercises.service"
import { ClassEditor } from "@/components/admin/class-editor"

export const dynamic = "force-dynamic"

export default async function AdminClaseDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  await requireAdminSession()

  const [dailyClass, exercises] = await Promise.all([
    getDailyClassWithBlocks(id),
    getExercises({ includeInactive: false }),
  ])

  if (!dailyClass) notFound()

  return <ClassEditor initialClass={dailyClass} exercises={exercises} />
}
