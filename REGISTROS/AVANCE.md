# 🏋️ NENE'S GYM — Bitácora de Avance

> PWA de gestión de gimnasio (profesor/admin + clientes): membresías con cupo de días +
> vencimiento mensual, pagos con comprobante, check-in por QR.

**Última actualización:** 2026-06-24 (noche)

## Datos del proyecto

| Recurso | Valor |
|---|---|
| **Stack** | Next.js 16 (App Router) · React 19 · TypeScript estricto · Tailwind v4 · Supabase · Vercel |
| **App en producción** | https://nenes-gym.vercel.app |
| **Proyecto Supabase** | `nenes-gym-app` · id `nqhkfqoroisszycdxwuy` · región us-west-2 · Postgres 17 |
| **Equipo Vercel** | axonwebs15-2172's projects |
| **Localización** | Colombia · zona horaria `America/Bogota` · moneda `COP` |
| **GYM_ID (seed)** | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` |

---

## Estado general

| # | Sección | Estado | Fecha |
|---|---|---|---|
| 1 | Base de datos Supabase (tablas, enums, RLS, funciones, seed) | ✅ Completado | 2026-06-14 |
| 2 | Setup Next.js 16 + TS estricto + Tailwind v4 + estructura | ✅ Completado | 2026-06-14 |
| 3 | Conexión Supabase (`@supabase/ssr`, 3 clientes, `proxy.ts`, types) | ✅ Completado | 2026-06-14 |
| 4 | Tema oscuro/rojo + componentes UI | ✅ Completado | 2026-06-15 |
| 5 | Auth + roles + protección de rutas | ✅ Completado | 2026-06-15 |
| 6 | Páginas cliente (dashboard, pagos, asistencia/QR, progreso) | ✅ Completado | 2026-06-15 |
| 7 | Páginas admin (dashboard, clientes, pagos, asistencias, perfil) | ✅ Completado | 2026-06-15 |
| 8 | Check-in QR (API, scanner, QR del gym para imprimir) | ✅ Completado | 2026-06-16 |
| 9 | Pagos (subida de comprobante, aprobar/rechazar) | ✅ Completado | 2026-06-16 |
| 10 | Activación manual de plan por cliente | ✅ Completado | 2026-06-16 |
| 11 | Íconos PWA + manifest | ✅ Completado | 2026-06-15 |
| 12 | Deploy a Vercel producción + variables de entorno | ✅ Completado | 2026-06-16 |
| 13 | Calendario de asistencia en dashboard (lógica mensual, indicador de inicio, días sin servicio por plan) | ✅ Completado | 2026-06-18 |
| 14 | Rediseño de Catálogo de Planes (Día suelto, Mensuales de 20 y 24 días con cálculo dinámico de ahorro y badges verdes) | ✅ Completado | 2026-06-18 |
| 15 | Optimización de Instalador PWA (botón mini en Header al lado de Salir, modal con pasos específicos de Safari para iOS) | ✅ Completado | 2026-06-18 |
| 16 | Alineación con spec v1: nav 5 tabs + FAB Entrada, perfil cliente, admin "Más" con gestión de planes/gym, estados UI reutilizables | ✅ Completado | 2026-06-23 |
| 17 | Fix caché de navegador: headers HTTP no-store en next.config.ts, iconos PWA regenerados, bottom nav visible en fondo oscuro | ✅ Completado | 2026-06-23 |
| 18 | Análisis de comprobantes con IA (Gemini): subida → extracción → validaciones → auto-aprobación, strikes, bloqueo, panel admin con imagen | ✅ Completado | 2026-06-24 |
| 19 | Modelo de membresía base calendario: las faltas también descuentan días (no solo las asistencias) | ✅ Completado | 2026-06-24 |
| 20 | Ajustes UI dashboard cliente (botón Entrada compacto en cabecera, saludo "¡Hola!" sin emoji) + métodos de pago reducidos a Efectivo y Nequi | ✅ Completado | 2026-06-24 |
| 21 | UX Premium Dashboard — rediseño visual completo con gamificación, microinteracciones, imágenes de marca e identidad visual | ✅ Completado | 2026-06-24 |
| 22 | Doble ingreso AM/PM — permite hasta 2 check-ins por día (mañana + tarde) sin consumir días extra de membresía | ✅ Completado | 2026-06-24 |

---

## Detalle por sección

### 1. Base de datos Supabase — ✅
Esquema completo en Postgres: tablas `gyms`, `profiles`, `clients`, `plans`, `memberships`,
`payments`, `attendance`, `progress_records`. Enums (`user_role`, `membership_status`,
`payment_status`, `payment_method`). Funciones críticas `SECURITY DEFINER`:
`process_check_in` (check-in atómico), `approve_payment`, `reject_payment`,
`membership_effective_status`. RLS activado en todas las tablas + helpers `is_admin()` y
`current_gym_id()`. Seed: 1 gym "NENE'S GYM", 5 planes (día suelto → mensual 26 días).

### 2. Setup Next.js 16 + estructura — ✅
Proyecto `nenes-gym` con TypeScript estricto, Tailwind v4, estructura de carpetas (`actions/`,
`services/`, `components/`, `lib/`, `schemas/`, `constants/`, `types/`). Turbopack como bundler.

### 3. Conexión Supabase — ✅
`@supabase/ssr` con 3 clientes: `createClient()` (server), `createBrowserClient()` (browser),
`createAdminClient()` (service role, solo server). `src/proxy.ts` para refresco de sesión y
protección de rutas. Tipos generados en `database.types.ts`. Variables en `.env.local`.

### 4. Tema oscuro/rojo + UI — ✅
Modo oscuro siempre activo (`class="dark"`). Rojo primario `#dc2626`. Componentes base:
`input`, `card`, `badge` (con `MembershipBadge` y `PaymentBadge`), `button`. Navegación inferior
(`bottom-nav`) y `page-header`.

### 5. Auth + roles + protección de rutas — ✅
Login/registro con un solo `/login` para todos. Redirección automática por rol: `admin` →
`/admin/dashboard`, `client` → `/cliente/dashboard`. Registro auto-confirma el correo (sin paso de
confirmación por email). Mensajes de error traducidos al español (`traducirErrorAuth`).
Cuenta dueña: `andersonrua12@gmail.com` (rol `admin`); el resto se registra como `client`.

### 6. Páginas cliente — ✅
Dashboard (estado de membresía, días restantes), pagos (subir comprobante + historial),
asistencia (scanner QR), progreso (registro de peso/estatura + IMC + historial).

### 7. Páginas admin — ✅
Dashboard (stats: clientes, pagos pendientes, ingresos hoy), clientes (lista filtrada por
rol `client`), pagos (aprobar/rechazar), asistencias (ingresos del día), perfil (cambiar
nombre y correo — el cambio de correo sí pide confirmación).

### 8. Check-in QR — ✅
`POST /api/check-in` → RPC `process_check_in` (atómico, 1 ingreso por día, descuenta 1 día).
Scanner con `html5-qrcode` + fallback de código manual. QR del gym generado con `qrcode` y
mostrado en un modal desde el panel de Clientes (botón "QR de ingreso") para imprimir y pegar
en la entrada.

### 9. Pagos — ✅
Cliente sube comprobante (Storage privado `receipts` + URL firmada). Admin aprueba (crea
membresía con días + `end_date`) o rechaza con nota. Comprobantes visibles solo por URL firmada.

### 10. Activación manual de plan — ✅
Desde el panel de Clientes, botón "Activar plan" por cliente: selecciona plan + método de pago →
`createManualPaymentAction` registra el pago ya aprobado y activa la membresía al instante.

### 11. Íconos PWA + manifest — ✅
`manifest.ts` (`theme_color #dc2626`, `display standalone`). Íconos 192px y 512px generados
en `public/icons/`.

### 12. Deploy a Vercel — ✅
Proyecto `nenesgym` en equipo `nenesgym1508-7305's projects`. Variables configuradas:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`. Build limpio (18 rutas). Repo GitHub conectado (`nenesgym1508/nenesgym`, público).
URL producción: `https://nenesgym.vercel.app`.

### 13. Calendario de asistencia en dashboard — ✅
Integración de un calendario mensual con visualización de asistencias en verde y faltas en rojo translúcido. El día actual se resalta en rojo brillante con sombra y escala ampliada. Se marca el día de activación de la membresía con un anillo blanco en el borde. El componente discrimina los días de descanso según el plan del cliente (los fines de semana no cuentan para planes de 20 días/5 días por semana, y solo domingos para planes de 24 días).

### 14. Rediseño de Catálogo de Planes — ✅
Depuración de la base de datos Supabase para ofrecer exclusivamente tres planes: "Día suelto" ($5.000), "Mensual (5 días/semana) (20 días)" ($70.000) y "Mensual (6 días/semana) (24 días)" ($80.000). Se rediseñó la UI en cliente y administrador para calcular y presentar el porcentaje de ahorro real (30% y 33% respectivamente) mediante badges elegantes en color verde translúcido.

### 15. Optimización de Instalador PWA — ✅
El banner grande de instalación PWA fue removido del cuerpo central del dashboard del cliente para ahorrar espacio. En su lugar, se implementó un botón miniatura "Instalar App" en la cabecera (Header) al lado de "Salir". Para dispositivos iOS (Safari), al pulsar el botón se despliega un modal elegante explicando los pasos manuales de instalación usando el botón de Compartir nativo.

### 16. Alineación con spec v1 — ✅
Cierre de los gaps G1–G8 identificados en el plan de alineación:
- **Nav 5 tabs + FAB central** (`bottom-nav.tsx`): cliente tiene Inicio · Pagos · [Entrada FAB rojo elevado] · Progreso · Perfil. Admin tiene Panel · Clientes · Pagos · Ingresos · Más. Naming unificado: "Entrada" en cliente, "Ingresos" en admin.
- **Perfil cliente** (`/cliente/perfil`): nombre, teléfono, correo, cambiar contraseña, cerrar sesión, línea "Mi gimnasio: NENE'S GYM". Reutiliza `ClientProfileForm`.
- **Dashboard cliente completo**: aviso de pago pendiente/rechazado, mini-resumen de progreso (peso + IMC), estado "ya ingresaste hoy", `InstallAppCard` en header.
- **Entrada completa** (`/cliente/asistencia`): estado del día ("ya registraste"/"aún no"), últimos 3 ingresos, fallback de código manual (`ManualCheckin` dentro de `qr-scanner.tsx`).
- **Admin "Más"** (`/admin/mas`): gestión de planes (nombre/precio/días via `PlansManager`), días de gracia y nombre del gym (`GymSettingsForm`), perfil del profesor, cerrar sesión.
- **Admin Asistencias**: botón "Ver QR del gimnasio" (`GymQrModal`) y "Registrar ingreso manual" (`ManualCheckInModal`) cableados.
- **Estados UI reutilizables**: `EmptyState`, `LoadingState`, `ErrorState` en `src/components/ui/states.tsx`.
- **Rutas**: `CLIENTE_PERFIL` y `ADMIN_MAS` añadidas a `routes.ts`.

### 17. Fix caché de navegador y visibilidad de bottom nav — ✅
- **`next.config.ts`**: añadidos headers HTTP `Cache-Control: no-store, max-age=0` para todas las rutas de página (excluye `_next/static`, `_next/image`, `icons`). Los navegadores y Vercel nunca cachean el HTML desde ahora.
- **`layout.tsx`**: eliminadas las meta tags `httpEquiv="Cache-Control"` que los navegadores modernos ignoran para bundles JS. Los headers HTTP son la fuente de verdad.
- **`bottom-nav.tsx`**: cambiado `bg-zinc-900/95 backdrop-blur-md` → `bg-zinc-950` sólido y `border-white/8` → `border-white/15`. El nav se camuflaba sobre el fondo negro del page en desktop.
- **Iconos PWA**: `icon-192.png` e `icon-512.png` regenerados con `sharp` + SVG (fondo rojo `#dc2626`, letra "N" blanca centrada). Los archivos faltaban o estaban corruptos, lo que impedía que el navegador disparara `beforeinstallprompt`.

### 18. Análisis de comprobantes con IA (Gemini) — ✅
Replica del sistema antifraude de alenstreaming, adaptado al gimnasio. El cliente sube el
comprobante, la IA lo analiza y valida, y según la configuración el pago se aprueba solo o queda
pendiente para el admin.

**Flujo (componente `payment-upload-form.tsx`, multipaso):**
`plan` → `imagen` → `preview` → `analizando` → `confirmar` → `enviando` → `aprobado`/`pendiente`/`error`.
- Paso **imagen**: aviso antifraude, cuentas del gym a las que transferir (con botón Copiar, vía
  `GET /api/gym-cuentas`), detección de imagen completamente negra (muestreo en canvas).
- Paso **confirmar**: validaciones por colores (verde/ámbar/rojo) — destinatario, monto, fecha,
  transacción completada, número de cuenta, comprobante repetido. Botón "Confirmar" deshabilitado
  si hay un bloqueo duro.

**API `POST /api/analizar-comprobante`** (`accion: "analizar" | "confirmar"`):
- Modelo **`gemini-2.5-flash`** (Google Generative AI). Extrae monto, referencia, entidad, fecha,
  hora, destinatario, número destino, transacción exitosa.
- Anti-duplicados: hash **SHA-256** (imagen exacta) + **dHash perceptual** de 64 bits con `jimp`
  (hamming ≤ 8 sobre los últimos 500 pagos) + **referencia repetida** contra `payments.ai_referencia`.
- **Rate limit**: 10 análisis/hora por cliente (persistido en `gym_config`).
- **Veredicto temporal** en `receipt_verdicts` (TTL 15 min) con anti-tampering: el hash de la imagen
  al confirmar debe coincidir con el del análisis.
- **Auto-aprobación**: si el cliente tiene `auto_aprobacion = true` y la IA validó, llama a la RPC
  `approve_payment` y activa la membresía al instante.

**Sistema de strikes** (`registrarStrike`): imagen/referencia repetida suma un strike.
1 strike = aviso · 2 = bloqueo temporal 24 h (`comprobante_bloqueado_hasta`) · 3 = bloqueo
permanente (`comprobante_bloqueado = true`). El cliente bloqueado ve un estado especial en vez del
formulario. El admin puede desbloquear desde `/admin/clientes` (`DesbloquearToggle` →
`desbloquearComprobanteAction`).

**Panel admin** (`pending-payment-card.tsx`): sección "Análisis IA" con badge Válido/Revisar,
datos detectados, badge ⚡ Auto si fue auto-aprobado, y **vista previa de la imagen** del
comprobante inline (vía `/api/receipt`, URL firmada).

**Config del gym** (`/admin/mas` → `GymSettingsForm`): número y titular de Nequi y Daviplata; la IA
verifica que el comprobante haya sido enviado a esas cuentas. **Auto-aprobación por cliente**
(`/admin/clientes` → `AutoAprobacionToggle`).

**Migraciones aplicadas:** `ai_pagos` (columnas en `gyms`, `clients.auto_aprobacion`, campos `ai_*`
y hashes en `payments`, tablas `receipt_verdicts` y `gym_config`) y `strikes_clientes`
(`clients.strikes_data` JSONB, `comprobante_bloqueado`, `comprobante_bloqueado_hasta`).
**Variable de entorno:** `GEMINI_API_KEY` (Google AI Studio).

### 19. Modelo de membresía base calendario (las faltas descuentan) — ✅
Antes, los "días restantes" solo bajaban al registrar asistencia (modelo de usos), por lo que un
cliente con varias faltas seguía mostrando el cupo completo. Ahora el modelo es **base calendario**:
cada día hábil que pasa descuenta, asista o no.

- Helper `eligibleDaysElapsed(startDate, today, daysPerWeek)` en `src/lib/dates`: cuenta los días
  hábiles transcurridos desde la activación hasta **ayer** (hoy no descuenta hasta que pasa).
  Domingo siempre es libre; sábado también en planes de 5 días/semana.
- `días restantes = total_days − días hábiles transcurridos` (`membershipRemainingDays`).
- Aplicado en **dashboard cliente**, **admin clientes**, **check-in manual** y en SQL para
  consistencia: migración `membresia_base_calendario` crea `eligible_days_elapsed(...)`, y actualiza
  `membership_effective_status` (marca `exhausted` por calendario) y `process_check_in`
  (`remaining_days` devuelto es base calendario).
- `used_days` se conserva como **estadística de veces que asistió**; ya no controla el cupo.

### 20. Ajustes UI dashboard + métodos de pago — ✅
- **Botón "Registrar entrada"** movido a la cabecera del dashboard, al lado del saludo, en formato
  compacto (mantiene estado "Ya ingresaste" en verde). Se eliminó la fila de 2 tarjetas grandes.
- **Tarjeta "Mi progreso"** eliminada del dashboard (ya está en la barra inferior de navegación; el
  mini-resumen de peso/IMC se conserva).
- **Saludo**: "Hola, [nombre] 👋" → "**¡Hola!**" + nombre, sin emoji.
- **Métodos de pago** del formulario del cliente reducidos a **Efectivo** y **Nequi** (se ocultan
  Transferencia, Daviplata y Otro; el constante global se conserva para mostrar pagos antiguos).

### 21. UX Premium Dashboard — ✅

Rediseño visual completo del dashboard del cliente sin cambiar arquitectura ni backend.

**Orden y estructura:**
Saludo con avatar inicial → MembershipSummaryCard → alerta de pago (banner minimalista de 1 línea) → CTA "Registrar entrada" → Estado de hoy → Tu progreso → Calendario → Gamificación → Banner motivacional → Últimos ingresos.

**Componentes nuevos** (`src/components/cliente/`):
- `MembershipSummaryCard`: imagen de fondo branded (`public/gym-card-bg.png`), badge de estado, número grande de entrenamientos restantes, fechas de activación/vencimiento.
- `TodayStatusCard`: ring vacío cuando no entrenado, ícono verde cuando sí, "Te esperamos." como subtítulo, chevron derecho.
- `QuickProgressCard`: 3 columnas (ícono | peso + IMC | variación). Variación en rojo si ganó peso, verde si bajó.
- `WorkoutStreakCard`: 2 columnas (Racha en días | Este mes en entrenamientos).
- `MonthlyGoalCard`: barra de progreso roja, meta = `remainingDays` (días alcanzables reales, descuenta faltas).
- `MotivationalBanner`: imagen branded (`public/gym-banner.png`) con bordes redondeados.
- `ProgressBar`, `AttendanceLegend`, `SuccessToast`: componentes UI reutilizables.

**Botón "Registrar entrada":**
- Imagen PNG sin fondo (`public/btn-registrar.png`) dentro de un `<Link>`.
- Animación `animate-btn-heartbeat`: `drop-shadow` rojo pulsante + scale 1.03 cada 1.6 s.
- `unoptimized` en `<Image>` para evitar caché del optimizador de Next.js.

**Animaciones CSS** (sin Framer Motion, solo `tw-animate-css` + keyframes en `globals.css`):
- `animate-in fade-in slide-in-from-bottom-3` en entrada del saludo.
- `animate-pulse-glow` (box-shadow) heredado del CTA CSS anterior.
- `animate-btn-heartbeat` (drop-shadow + scale) para el botón imagen.
- `(cliente)/template.tsx`: fade-in de 300ms en transiciones entre páginas.

**Calendario** (`DashboardCalendar`): cabecera cambiada a "ASISTENCIA – MES AÑO". Leyenda con `AttendanceLegend`.

**Alerta de pago**: reducida de card con 2 líneas a banner de 1 línea (`py-2 text-xs`).

**Avatar**: primera letra del nombre del cliente en un círculo con borde rojo (`border-2 border-red-600`).

**Meta mensual**: usa `remainingDays` en vez de `total_days` para reflejar solo los entrenamientos que aún se pueden completar.

---

### 22. Doble ingreso AM/PM — ✅

Algunos clientes entrenan mañana (5–10 am) y tarde (5–10 pm). La app ahora permite **máximo 2 check-ins por día**, uno por franja, sin consumir días extra de membresía (el modelo base calendario no cambia).

**Modelo de franja:**
- Corte a las **14:00 hora del gym** (`America/Bogota`): antes = `am`, desde las 14 = `pm`.
- El bloque cerrado del gym (10 am–5 pm) cae dentro del corte, por lo que no hay ambigüedad.
- Un 2.º intento en la misma franja es rechazado (evita dobles escaneos accidentales).

**Base de datos** (migración `allow_two_checkins_per_day` aplicada en Supabase):
- Nueva columna `attendance.session TEXT NOT NULL CHECK (session IN ('am','pm'))`.
- Backfill de filas existentes desde `checked_in_at` en la tz del gym.
- Constraint anterior `UNIQUE (client_id, check_in_date)` → **`UNIQUE (client_id, check_in_date, session)`**.
- RPC `process_check_in` reescrito: calcula `v_session`, inserta con franja, devuelve `ALREADY_TODAY` con mensaje diferenciado por franja ("Ya registraste tu ingreso de la mañana/tarde").

**Código:**
- `src/lib/dates/index.ts`: helper `gymSession(date)` → `"am" | "pm"` + constante `GYM_SESSION_CUTOFF_HOUR = 14`.
- `src/actions/admin.actions.ts` (`manualCheckInAction`): valida por franja, inserta `session`, mensaje de error por franja.
- `src/types/database.types.ts`: campo `session` añadido a `attendance` Row/Insert/Update.
- **Dashboard**: `sessionsToday = todayRows.length`; CTA muestra "Completaste tus 2 ingresos de hoy" cuando `>= 2`; pulso solo cuando `=== 0`; `monthlyCount` usa `Set` de fechas distintas para no contar doble.
- **`TodayStatusCard`**: prop `sessionsToday` muestra "· N de 2 ingresos".
- **Admin Asistencias**: muestra "Mañana" / "Tarde" junto al source (QR/Manual).

**Verificación en vivo (con rollback):**
- 2.º AM → `BLOQUEADO` (constraint actúa). PM → `INSERTADO` (OK). 0 filas persistidas tras rollback.

---

## ⏳ Próximos pasos / pendientes

- [x] ~~**Aplicar GRANT** de `approve_payment`/`reject_payment` a `authenticated`~~ (resuelto, ver `ERRORES.md` → ERR-008).
- [ ] **Página de detalle de cliente** (`/admin/clientes/[id]`): usa `getClientById` +
      `getMembershipsForClient` (ya existen en backend, sin UI).
- [ ] **Estadística de asistencia 7 días** (`getRecentAttendance`, sin UI).
- [ ] **Resumen de progreso** del cliente (`getProgressSummary`, sin UI).
- [ ] ⚠️ **Agregar `GEMINI_API_KEY` en Vercel** (Environment Variables) o el análisis de
      comprobantes fallará en producción. Ya está en `.env.local` para desarrollo.
- [ ] ⚠️ **Corregir el número Nequi del gym** en `/admin/mas`: quedó guardado `175287585`
      (9 dígitos, le falta un dígito). Ver ERR-009.
- [ ] **QA de seguridad RLS** por rol (cliente A no ve datos de cliente B ni de otro gym).
- [ ] **Pruebas E2E** del flujo completo: registro → pago → aprobación → check-in → progreso.
- [ ] Limpiar datos de prueba (fila huérfana en `clients` del admin + pago de prueba de $50.000).
