import { redirect } from "next/navigation"
import { CheckCircle2, CircleDashed, Clock } from "lucide-react"
import { getCurrentClientData } from "@/services/clients.service"
import { getClientAttendance } from "@/services/attendance.service"
import { PageHeader } from "@/components/layout/page-header"
import { Card } from "@/components/ui/card"
import { QrScannerWrapper } from "@/components/qr/qr-scanner-wrapper"
import { formatDate, formatDatetime, todayInBogota } from "@/lib/dates"
import { ROUTES } from "@/constants/routes"

export default async function ClienteAsistenciaPage() {
  const clientData = await getCurrentClientData()
  if (!clientData) redirect(ROUTES.LOGIN)

  const { client } = clientData
  const recent = client ? await getClientAttendance(client.id, 3) : []
  const alreadyToday = recent[0]?.check_in_date === todayInBogota()

  return (
    <div>
      <PageHeader title="Entrada" />
      <div className="p-4 space-y-4">
        {/* Estado del día */}
        <Card
          className={`flex items-center gap-3 p-3.5 ${
            alreadyToday ? "border-green-700/40 bg-green-500/5" : "border-white/8"
          }`}
        >
          {alreadyToday ? (
            <CheckCircle2 className="size-5 shrink-0 text-green-400" />
          ) : (
            <CircleDashed className="size-5 shrink-0 text-zinc-400" />
          )}
          <p className="text-sm font-medium text-zinc-200">
            {alreadyToday ? "Ya registraste tu ingreso hoy" : "Aún no has registrado tu ingreso hoy"}
          </p>
        </Card>

        <div className="text-center">
          <p className="text-zinc-400 text-sm">
            Escanea el código QR del gimnasio para registrar tu ingreso
          </p>
        </div>

        <QrScannerWrapper />

        {/* Últimos 3 ingresos */}
        {recent.length > 0 && (
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Últimos ingresos
            </h3>
            <Card className="p-0 overflow-hidden">
              {recent.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i < recent.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="size-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Clock className="size-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{formatDate(a.check_in_date)}</p>
                    <p className="text-xs text-zinc-500">{formatDatetime(a.checked_in_at)}</p>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
