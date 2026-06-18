import { PageHeader } from "@/components/layout/page-header"
import { QrScannerWrapper } from "@/components/qr/qr-scanner-wrapper"

export default function ClienteAsistenciaPage() {
  return (
    <div>
      <PageHeader title="Registrar ingreso" />
      <div className="p-4 space-y-4">
        <div className="text-center mb-2">
          <p className="text-zinc-400 text-sm">
            Escanea el código QR del gimnasio para registrar tu ingreso
          </p>
        </div>
        <QrScannerWrapper />
      </div>
    </div>
  )
}
