# Changelog - Nenes Gym

Todos los cambios notables en este proyecto serán documentados en este archivo.

## [1.7.0] - 2026-07-18

### Solución de Errores e Infraestructura
- **Hotfix de Producción para Caché (`unstable_cache` vs `createClient`)**: Se solucionó la caída en producción de la pestaña "Más" y otras vistas del administrador. Next.js restringe estrictamente el uso de cookies y cabeceras dinámicas dentro del callback de `unstable_cache`. Se migraron todas las consultas cacheadas (`getGymSettings`, `getTrainingRoutines`, `getAdminRoutines`, `getClientsWithoutRoutine`, `getDailyClasses`, `getWeekMuscleBalance`, `getAvailablePlans`) para que utilicen `createAdminClient()`. Esto elimina la lectura implícita de cookies/headers, preserva el caché y mantiene los filtros del gimnasio (`gym_id`) 100% seguros y aislados.

### Características y Mejoras
- **Rediseño Premium de Medios de Pago**: Tarjetas con gradientes temáticos oscuros y bordes brillantes de color de marca (Nequi y Daviplata). Adicionalmente, ahora se muestra de forma prominente el **Titular de la cuenta** en cada tarjeta, simplificando la verificación de transferencias.
- **Navegación por Pestañas (Tabs) en Pagos**: Se dividió la pantalla de Pagos en dos pestañas navegables independientes y persistentes en la URL (`?tab=por-aprobar` y `?tab=historial`):
  - **Por aprobar**: Muestra los medios de pago configurados y la lista de pagos pendientes.
  - **Historial de pagos**: Muestra el histórico completo de transacciones formateadas en una grilla responsiva de dos columnas en computadoras.
- **Caché Inteligente e Invalidación Reactiva en Historial**: Se envolvieron las consultas de historial (`getAllPayments`) y pendientes (`getPendingPayments`) en `unstable_cache` bajo el tag `"admin-payments"`. El caché se revalida de manera automática y reactiva en tiempo real en los siguientes escenarios:
  - Cuando el cliente sube un nuevo comprobante de pago.
  - Cuando el administrador aprueba un pago.
  - Cuando el administrador rechaza un pago.
  - Cuando el administrador registra un pago manual rápido.

## [1.6.0] - 2026-07-17

### Solución de Errores e Infraestructura
- **Corrección de lectura de Planes (Fallo de RLS)**: Se cambió el cliente de base de datos de `getAdminPlans` de anónimo (`getCacheSafeClient`) a autenticado (`createClient` desde el servidor). El cliente anónimo no enviaba las cookies del administrador, lo que provocaba que las políticas RLS de Supabase bloquearan la consulta y devolvieran silenciosamente una lista vacía `[]`, mostrando "Aún no hay planes creados".
- **Corrección de subida de imágenes (File a Buffer)**: Se solucionó el fallo de carga de imágenes en la biblioteca de ejercicios. Los objetos `File` web que viajan en Server Actions a veces pierden serialización binaria al subirse directamente con el SDK de Supabase en Node.js. Se lee ahora el archivo como `ArrayBuffer` y se convierte a `Buffer` antes de la subida a Storage. Se aplicó de forma preventiva en la subida de comprobantes de pago también.

### Características y Mejoras
- **Plantillas rápidas de autocompletado en Planes**: Se agregaron botones de plantilla rápidos (`3x sem`, `4x sem`, `5x sem`, `6x sem`) en la esquina superior del formulario de nuevos planes para autocompletar automáticamente el nombre (formato elegante), días incluidos y vencimiento (30 días).
- **Eliminación definitiva de Planes**: Se implementó el botón "Eliminar" al lado de activar/desactivar, con confirmación rápida integrada en UI. Cuenta con validación contra la clave foránea en Supabase para evitar eliminar planes con pagos o membresías activas asociadas, sugiriendo desactivarlos en su lugar.
- **Caché Inteligente en Entrenamientos y Configuración**:
  - Toda la sección de Entrenamiento (Rutinas de biblioteca, Asignaciones de clientes, Agenda de clases y Balance muscular) ahora usa caching en servidor con `unstable_cache`. Se revalida de manera automática e instantánea solo cuando el administrador agrega, edita, elimina o duplica registros de entrenamiento o clases.
  - La configuración general del gimnasio (`getGymSettings`) ahora está cacheada bajo el tag `"gym"` y se revalida únicamente al editar los datos en el menú "Más", reduciendo consultas de base de datos a cero en navegaciones comunes.

## [1.5.0] - 2026-07-17

### Rendimiento — Bloque 1 (navegación inmediata)
- **Reactivado prefetch + Router Cache del cliente**: se eliminó el header `no-store` global de páginas HTML en `next.config.ts` (desactivaba el prefetch de `<Link>` y el Router Cache → cada navegación era un ida-y-vuelta completo, con sensación de lentitud y "doble clic"). Se añadió `experimental.staleTimes: { dynamic: 30, static: 180 }`. Sigue fresco: las páginas son `force-dynamic` y las mutaciones usan `revalidatePath`.
- **Feedback inmediato del toque** con `useLinkStatus` (hook nativo Next 16) en `bottom-nav.tsx` (barra inferior + FAB "Entrada") y en ambos sidebars vía `SidebarNavLink` compartido: el ítem tocado se resalta al instante aunque los datos sigan cargando.
- **4 `loading.tsx` nuevos** con skeletons locales (respetan header + estructura, sin overlay global): `cliente/pagos`, `cliente/progreso`, `cliente/asistencia`, `admin/asistencias`.

### Rendimiento — Bloque 2 (consultas: auth duplicada) ✅ cierra pendiente Tier 2
- **Eliminada la auth duplicada por página en las 12 rutas admin**: cada página hacía su propio `supabase.auth.getUser()` (round-trip de red) + consulta `profiles.select("role")`, sin deduplicarse con el `getAuthenticatedSession()` que el layout ya ejecuta. Se centralizó en `requireAdminSession()` (`src/lib/auth/session.ts`), que reutiliza la sesión cacheada con React `cache()`. Ahorro por navegación admin: **1 `getUser` de red + 1 query `profiles`**. Sin cambios de comportamiento del guard.
- **Búsqueda + filtros + paginación de Clientes movidos a Postgres** (antes se descargaban hasta 500 clientes y se filtraba en el navegador). La página `admin/clientes` ahora es dirigida por `searchParams` (`?q=&status=&page=`); el buscador tiene debounce de 350ms y `useTransition` (descarta búsquedas anteriores vía navegación URL). Nuevo servicio `searchAdminClients()` que llama la RPC `admin_search_clients` (búsqueda ilike + filtro de estado date-based + `LIMIT/OFFSET` + `count(*) over()` en una sola consulta). El badge exacto por tarjeta se sigue calculando en JS.
- **Migración `admin_search_clients.sql` aplicada y verificada en producción** (RPC `SECURITY INVOKER` + `search_path=public` → respeta RLS, sin advisories nuevos). Probados los 3 filtros, búsqueda ilike y paginación con conteo total. `searchAdminClients` conserva un fallback con gracia (carga completa + JS) por si la RPC no existiera, así el código nunca rompe la página.
- **Dashboard admin ya no descarga todos los clientes**: el contador "Clientes" usa `countClients()` (total vía la RPC, sin traer filas) y el buscador rápido (`ClientSearchBox`) consulta al servidor con debounce 300ms + descarte de respuestas viejas (`searchClientsQuickAction`), en vez de recibir la lista completa. Mismo patrón de escala que la pantalla de Clientes.
- **Invalidación de caché de catálogos al editar**: los planes (`getAvailablePlans`/`getAdminPlans`, tag `plans`) y la config del gym (`getGymSettings`, tag `gym`) ya estaban cacheados, pero sus ediciones no refrescaban el caché. Ahora `savePlanAction`, `setPlanActiveAction` y `updateGymSettingsAction` llaman `updateTag(...)` (Next 16, expiración inmediata / leer-tus-propios-cambios), así el cambio del admin aparece para todos en la siguiente apertura, no una versión vieja. Se verificó que no hay otras rutas que modifiquen `plans`/`gyms` sin invalidar.

## [1.4.0] - 2026-07-14

### Rendimiento (Tier 1 — investigación + fixes aplicados)
- **`getActiveRoutineForClient` paralizado**: se movió dentro del `Promise.all` del dashboard cliente; antes se ejecutaba secuencialmente DESPUÉS del bloque de 4 queries, añadiendo ~300-600ms innecesarios. Ahora corre en paralelo.
- **Cache headers inteligentes en `next.config.ts`**: la regla `no-store` global sobreescribía los assets `/_next/static/*` que Next.js ya genera con hashes inmutables. Ahora los assets JS/CSS van con `max-age=31536000, immutable` (CDN Vercel), íconos con `max-age=86400`, y las páginas HTML siguen con `no-store`. Resultado: recarga de página usa caché de assets en lugar de re-descargarlos.
- Investigación completa de benchmarks industry (Mindbody, Glofox, PushPress, WodGuru) y plan de mejoras Tier 2-3 documentado en `performance_report.md`.

### Pendiente (Tier 2 — próxima sesión)
- `unstable_cache` para planes y gym settings
- ~~Eliminar auth duplicada en layouts~~ ✅ hecho en 1.5.0
- ~~Paginación real en lista de clientes~~ ✅ hecho y migración aplicada en 1.5.0

## [1.3.0] - 2026-07-13

### Añadido
- **Diseño responsive de escritorio (Admin)**: `AdminSidebar` fijo (`src/components/layout/admin-sidebar.tsx`) reutiliza los mismos ítems de navegación que el `BottomNav`; se muestra en `md:` y superiores, oculta el bottom nav en desktop y trae perfil + logout al pie. Aplicado vía `(admin)/layout.tsx` a **todas** las rutas admin sin tocarlas una por una.
- **Diseño responsive de escritorio (Cliente)**: mismo patrón con `ClientSidebar` (`src/components/layout/client-sidebar.tsx`) y contenedor `(cliente)/layout.tsx` ensanchado (`max-w-lg` en móvil → `max-w-3xl` en desktop, antes fijo y centrado con márgenes negros grandes).
- **Grids de tarjetas en escritorio**: listas que antes eran una sola columna estirada a todo el ancho (clientes, pagos pendientes, historial, rutinas de biblioteca, asignaciones, planes personalizados del cliente) ahora usan `grid md:grid-cols-2 xl:grid-cols-3` en vez de `divide-y`/`flex-col`.
- **Rediseño de "Entrada" (check-in cliente)**: segmented control **"Escanear QR" / "Código manual"** siempre visible (antes escondido en un texto pequeño). Hook compartido `useCheckIn` (`src/components/qr/use-check-in.ts`) es la única puerta de entrada a `/api/check-in` para ambos métodos — sin duplicar validación. Distingue "Permiso de cámara rechazado" de "No se pudo acceder a la cámara" y ofrece "Usar código manual" como salida.
- **`LoadingButton`** (`src/components/ui/loading-button.tsx`): patrón único de botón con `pending`/`pendingText`, `aria-busy`/`aria-disabled` y bloqueo anti doble-clic, sin imponer estilo propio (acepta `className` para convivir con `btn-glossy-red` y demás clases ya usadas). Aplicado en login, aprobar/rechazar pago, activar/expandir plan, pago rápido en efectivo y check-in manual.
- **Skeletons por sub-ruta**: `loading.tsx` con la forma real del contenido (`Skeleton` en `src/components/ui/skeleton.tsx`) para `admin/dashboard`, `admin/clientes`, `admin/pagos`, `admin/entrenamiento`, `cliente/dashboard` (incluye grid de calendario) y `cliente/rutinas` — reemplazan el spinner genérico de pantalla completa que antes cubría toda navegación.

### Rendimiento
- 24 `select("*")` recortados a columnas explícitas en `training-routines.actions.ts` (17) y `routines.actions.ts` (7) — todas eran copias servidor-a-servidor (duplicar/asignar/programar/guardar en biblioteca de rutina→días→bloques→ejercicios) que no necesitaban traer la fila completa.
- `admin/entrenamiento` (tab Asignaciones): `getAdminRoutines()` y `getClientsWithoutRoutine()` pasan de secuencial a `Promise.all`.
- `getAllClients()` y `getAllClientsWithMembership()` ahora tienen `.limit(500)` (antes sin techo).
- Imagen de fondo de `membership-summary-card.tsx` (`fill` sin `sizes`) ahora sirve el tamaño correcto por breakpoint en vez de resolución completa siempre.
- `training-routines-list.tsx`: duplicar/archivar/eliminar rutina ahora bloquea la tarjeta específica (`pendingId`) durante la operación — era el único punto real de riesgo de doble-submit detectado en la auditoría.
- `uploadPaymentAction` revalida también `CLIENTE_DASHBOARD` (antes solo `CLIENTE_PAGOS`), evitando que el badge de pago pendiente quede desactualizado tras subir un comprobante.

### Nota
- Se auditaron índices de base de datos en Supabase (`attendance`, `memberships`, `payments`) antes de proponer una migración: ya existían índices compuestos adecuados y las tablas tienen volumen mínimo (0–7 filas), así que **no se aplicó ninguna migración** — habría sido optimizar algo ya resuelto. Ver `BITACORA_ERRORES.md`.

## [1.2.0] - 2026-07-13

### Añadido
- **Unificación de Tipografía Bebas Neue**: Aplicado el estilo condensado `font-bebas` en mayúsculas a todos los encabezados del administrador (Inicio, Clientes, Pagos, Entrenamiento, Ingresos, Más).
- **Rediseño Metálico de Clientes**: Tarjetas con degradado gris (`from-zinc-700/40 to-zinc-950/90`) y bordes de acero sólido (`border-zinc-700`).
- **Botón Rápido "Pago 1 día (efectivo)"**: Registro directo en físico de cobros diarios en efectivo en 1 solo clic con ventana interactiva de confirmación.
- **Visualización Dinámica de Plan**:
  - Texto dinámico *"Expandir plan"* / *"Expandir [N] días"* para clientes con plan activo.
  - Fechas de Inicio y Vencimiento organizadas en dos líneas al lado del calendario; el nombre del plan completo ahora se sitúa en la parte superior para evitar textos truncados.
  - Avatar con bordes dinámicos de color (verde para activo, rojo para inactivo).
  - Círculo de días restantes minimalista con micro-punto verde indicador de actividad.
- **Unificación del Listado de Asignaciones**: Pestaña "Todas" ahora combina a todos los clientes del gimnasio (con o sin rutina), señalando claramente a los atletas desprovistos de rutina con un botón de enlace directo y alerta en rojo.
- **Botón de Panel con Logo**: Icono de inicio en barra de navegación inferior reemplazado por el logo oficial del gimnasio (`logo-v3.webp`) con glow de fondo rojo tenue cuando está activo.

### Modificado
- Reemplazado el icono de rayo (`Zap`) por el de `UserCheck` (usuario verificado/activado) en los botones de confirmación y activación del plan.
- Unificada la altura física de las Stats Cards del dashboard de administración mediante flexbox y tamaño mínimo común para evitar descuadres.

---

## [1.1.0] - 2026-07-12

### Añadido
- **Modelo Rutina → Asignación → Clase**: `/admin/entrenamiento` es ahora un shell de 3 tabs persistentes (Rutinas / Asignaciones / Clases) sobre una sola tabla de biblioteca reutilizable (`training_routines`), reemplazando los dos sistemas de "plantillas" duplicados (rutina y clase).
- **Tab Rutinas (biblioteca)**: crear/editar/duplicar/archivar/eliminar/asignar/programar desde un listado con buscador y contadores de uso.
- **Tab Clases**: agenda vertical de 14 días con soporte para múltiples rutinas programadas el mismo día; "Añadir rutina" reemplaza el flujo anterior de creación manual/plantilla/generar.
- **Sección de Rutinas por cliente** (`/admin/clientes/[id]/rutinas`): asignaciones del admin + rutinas creadas por el cliente, con botón para guardarlas en la biblioteca.
- **Dashboard admin**: buscador de clientes, botón "Registrar pago", y aprobación de pagos pendientes con un clic (con opción de ver detalles/comprobante sin salir de Inicio).
- **Buscador de clientes** en `/admin/clientes`.
- Guard `requireAdmin` centralizado como defensa en profundidad en las acciones de la biblioteca de rutinas.

### Corregido
- El generador automático ahora crea un borrador de **rutina** (revisable en el editor) en vez de publicar una clase directamente.
- Filtro de "Sin rutina"/Asignaciones ya no mezclaba rutinas creadas por el propio cliente con las asignadas por el admin.
- Objetivo de la rutina se traduce correctamente al vocabulario técnico al programarla como clase (evita un posible error de base de datos).
- Se preserva la hora elegida al programar una clase.
- Botones de aprobar pago en el dashboard ya no se bloqueaban todos a la vez al procesar uno solo.

### Rendimiento
- Agenda de clases: de 14 consultas (una por día) a 1 sola por rango de fechas.
- Detalle de clase: eliminado un N+1 (una consulta por bloque de ejercicios).

### Eliminado
- Secciones y rutas de "Plantillas" (clase y rutina) — su funcionalidad la cubre ahora la biblioteca de Rutinas.

---

## [1.0.0] - 2026-07-11

### Añadido
- **Página de Entrenamiento (Admin Hub)**: Nueva página `/admin/entrenamiento` que consolida el acceso a Clases, Rutinas y Biblioteca de Ejercicios.
- **Componente RoutinesList**: Listado unificado con filtros por chips de estado, buscador en tiempo real por nombre de rutina/cliente, y layout responsivo móvil.

### Modificado
- **Navegación Inferior (Bottom Nav)**: Fusión de las pestañas "Clases" y "Rutinas" en una única pestaña "Entrenamiento" con coincidencia inteligente de rutas activas mediante `matchPrefixes`.
- **Flujo de Creación de Rutina (Admin)**: Formulario paso a paso que obliga a seleccionar primero el cliente, y ofrece selección de método visual (En blanco, Plantilla, Clase) con chips interactivos idénticos a los del cliente.
- **Menú Contextual del Editor**: Adaptación del menú `...` para mostrar acciones dinámicas basadas en el estado de la rutina (Pausar, Finalizar, Reactivar, Archivar).
- **Acción del Servidor**: Ampliación de `createRoutineAction` para soportar el almacenamiento de `custom_goal` cuando el objetivo seleccionado es "otro".
