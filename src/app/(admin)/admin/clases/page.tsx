import Link from "next/link"
import { redirect } from "next/navigation"
import { Plus, Dumbbell, BookOpen, ChevronRight, CheckCircle2, AlertCircle, Wand2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getDailyClassByDate, getWeekMuscleBalance, CLASS_OBJECTIVE_LABELS } from "@/services/classes.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { ROUTES, adminClaseDetalle } from "@/constants/routes"
import { todayInBogota } from "@/lib/dates"
import { MUSCLE_GROUP_LABELS } from "@/types/exercise"

export const dynamic = "force-dynamic"

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00")
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]!
}

function getMondayDate(today: string): string {
  const d = new Date(today + "T12:00:00")
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]!
}

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export default async function AdminClasesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin") redirect(ROUTES.CLIENTE_DASHBOARD)

  const today = todayInBogota()
  const tomorrow = addDays(today, 1)
  const monday = getMondayDate(today)

  // Clases de la semana
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  const [todayClass, tomorrowClass, balance, ...weekClassResults] = await Promise.all([
    getDailyClassByDate(today),
    getDailyClassByDate(tomorrow),
    getWeekMuscleBalance(monday),
    ...weekDates.map((d) => getDailyClassByDate(d)),
  ])

  const weekClasses = weekDates.map((date, i) => ({
    date,
    cls: weekClassResults[i] ?? null,
  }))

  // Balance semanal: niveles relativos + mensajes neutrales.
  const maxCount = balance.items[0]?.count ?? 0
  const balanceRows = balance.items.map((it) => {
    const ratio = maxCount > 0 ? it.count / maxCount : 0
    const level = ratio >= 0.66 ? "Alto" : ratio >= 0.33 ? "Medio" : "Bajo"
    return { ...it, level }
  })
  const topGroup = balanceRows[0]
  const lowGroup = [...balanceRows].reverse().find((r) => r.level === "Bajo")
  const balanceMessage =
    balance.classCount < 2 || balanceRows.length === 0
      ? "Aún no hay suficientes clases para calcular balance."
      : null

  return (
    <div>
      <PageHeader title="Clases" showLogout />
      <div className="p-4 space-y-4">

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={ROUTES.ADMIN_CLASES_EJERCICIOS}
            className="flex items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
          >
            <Dumbbell className="size-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Ejercicios</span>
          </Link>
          <Link
            href={ROUTES.ADMIN_CLASES_PLANTILLAS}
            className="flex items-center gap-2 rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-3 hover:bg-zinc-800/60 transition-colors"
          >
            <BookOpen className="size-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-300">Plantillas</span>
          </Link>
        </div>
        <Link
          href={ROUTES.ADMIN_CLASES_NUEVA}
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
        >
          <Plus className="size-4" />
          Nueva clase
        </Link>

        {/* Hoy */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Hoy</p>
          {todayClass ? (
            <Link href={adminClaseDetalle(todayClass.id)}>
              <Card className="hover:bg-zinc-800/60 transition-colors cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-green-400 shrink-0" />
                      <p className="text-sm font-semibold text-zinc-100 truncate">{todayClass.title}</p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      {todayClass.objective && (
                        <span>{CLASS_OBJECTIVE_LABELS[todayClass.objective]}</span>
                      )}
                      {todayClass.estimated_duration_minutes && (
                        <span>{todayClass.estimated_duration_minutes} min</span>
                      )}
                      <span className={`capitalize ${todayClass.status === "published" ? "text-green-500" : "text-zinc-500"}`}>
                        {todayClass.status === "draft" ? "Borrador" : todayClass.status === "published" ? "Publicada" : todayClass.status}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-600 shrink-0" />
                </div>
              </Card>
            </Link>
          ) : (
            <Link href={`${ROUTES.ADMIN_CLASES_NUEVA}?date=${today}`}>
              <Card className="hover:bg-zinc-800/60 transition-colors cursor-pointer border-dashed">
                <div className="flex items-center gap-3">
                  <AlertCircle className="size-4 text-zinc-600" />
                  <p className="text-sm text-zinc-500">Sin clase preparada para hoy</p>
                  <ChevronRight className="size-4 text-zinc-600 ml-auto" />
                </div>
              </Card>
            </Link>
          )}
        </div>

        {/* Mañana */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Mañana</p>
          {tomorrowClass ? (
            <Link href={adminClaseDetalle(tomorrowClass.id)}>
              <Card className="hover:bg-zinc-800/60 transition-colors cursor-pointer">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-100 truncate">{tomorrowClass.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      {tomorrowClass.objective && (
                        <span>{CLASS_OBJECTIVE_LABELS[tomorrowClass.objective]}</span>
                      )}
                      {tomorrowClass.estimated_duration_minutes && (
                        <span>{tomorrowClass.estimated_duration_minutes} min</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-zinc-600 shrink-0" />
                </div>
              </Card>
            </Link>
          ) : (
            <Card className="border-dashed border-red-600/20">
              <p className="text-sm text-zinc-400 mb-3">No hay clase preparada para mañana.</p>
              <div className="flex gap-2">
                <Link
                  href={`${ROUTES.ADMIN_CLASES_NUEVA}?date=${tomorrow}`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  <Plus className="size-4" />
                  Preparar clase
                </Link>
                <Link
                  href={`${ROUTES.ADMIN_CLASES_NUEVA}?date=${tomorrow}&modo=generar`}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-800 px-3 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <Wand2 className="size-4" />
                  Generar
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Esta semana */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Esta semana</p>
          <Card className="p-0 overflow-hidden">
            {weekClasses.map(({ date, cls }, i) => {
              const dayDate = new Date(date + "T12:00:00")
              const dayName = DAY_NAMES[i] ?? ""
              const dayNum = dayDate.getDate()
              const isToday = date === today
              return (
                <Link
                  key={date}
                  href={cls ? adminClaseDetalle(cls.id) : `${ROUTES.ADMIN_CLASES_NUEVA}?date=${date}`}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 transition-colors ${
                    i < 6 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className={`flex flex-col items-center w-8 shrink-0 ${isToday ? "text-red-400" : "text-zinc-500"}`}>
                    <span className="text-[10px] font-medium">{dayName}</span>
                    <span className="text-sm font-bold leading-none">{dayNum}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {cls ? (
                      <>
                        <p className="text-sm font-medium text-zinc-200 truncate">{cls.title}</p>
                        <p className="text-[11px] text-zinc-500">
                          {cls.objective ? CLASS_OBJECTIVE_LABELS[cls.objective] : ""}
                          {cls.estimated_duration_minutes ? ` · ${cls.estimated_duration_minutes} min` : ""}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-zinc-600">Sin preparar</p>
                    )}
                  </div>
                  {cls ? (
                    <CheckCircle2 className="size-4 text-green-500/60 shrink-0" />
                  ) : (
                    <Plus className="size-4 text-zinc-700 shrink-0" />
                  )}
                </Link>
              )
            })}
          </Card>
        </div>

        {/* Balance semanal */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Balance semanal</p>
          <Card className="p-3">
            {balanceMessage ? (
              <p className="text-xs text-zinc-500 text-center py-1">{balanceMessage}</p>
            ) : (
              <>
                <div className="space-y-1">
                  {balanceRows.slice(0, 4).map((r) => (
                    <div key={r.group} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{MUSCLE_GROUP_LABELS[r.group]}</span>
                      <span
                        className={`text-[11px] font-semibold ${
                          r.level === "Alto" ? "text-green-400" : r.level === "Medio" ? "text-yellow-400" : "text-zinc-500"
                        }`}
                      >
                        {r.level}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 border-t border-white/5 pt-2 space-y-0.5">
                  {topGroup && (
                    <p className="text-[11px] text-zinc-500">
                      Esta semana has trabajado bastante {MUSCLE_GROUP_LABELS[topGroup.group].toLowerCase()}.
                    </p>
                  )}
                  {lowGroup && lowGroup.group !== topGroup?.group && (
                    <p className="text-[11px] text-zinc-500">
                      {MUSCLE_GROUP_LABELS[lowGroup.group]} aparece poco esta semana.
                    </p>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
