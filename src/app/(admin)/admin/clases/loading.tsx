import { Skeleton } from "@/components/ui/skeleton"

/**
 * Pantalla de carga de Clases.
 *
 * Sin ella, tocar la pestaña dejaba la pantalla anterior congelada hasta que
 * llegaban los datos — el profesor lo describía como "se queda cargando mucho
 * tiempo". Y con `prefetch` en la barra de navegación esto casi nunca llega a
 * verse: es la red de seguridad para cuando la precarga no alcanzó (conexión
 * lenta o entrada directa por URL).
 */
export default function ClasesLoading() {
  return (
    <div className="md:max-w-6xl md:mx-auto">
      <div className="flex items-start justify-between mb-6 px-6 pt-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl" />
      </div>

      <div className="px-6 pb-24 space-y-4">
        {/* Barra de días */}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-12 shrink-0 rounded-xl" />
          ))}
        </div>

        {/* Clases del día */}
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
