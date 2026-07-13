# Changelog - Nenes Gym

Todos los cambios notables en este proyecto serán documentados en este archivo.

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
