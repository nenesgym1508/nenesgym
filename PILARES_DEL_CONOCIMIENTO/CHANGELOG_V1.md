# 📋 Registro de Trabajo Histórico — NENE'S GYM (V1)

Este archivo contiene el registro histórico del progreso y desarrollo del proyecto (secciones 1 a 27), migrado desde el antiguo sistema de registros.

Para ver el progreso de la sesión activa, dirígete al [CHANGELOG.md activo](./CHANGELOG.md).

---

## 🏋️ Resumen de Hitos y Avances Históricos

### Hitos Principales
*   **Base de datos y Setup Inicial:** Creación del esquema de Supabase, enums, funciones RPC (check-in atómico, aprobación de pagos) y políticas RLS (2026-06-14).
*   **Diseño Visual Oscuro/Rojo:** Interfaz branded roja (#dc2626) en modo oscuro absoluto y maquetación de layouts móviles (2026-06-15).
*   **Autenticación y Roles:** Control de acceso y redirección inteligente (`admin` -> `/admin/dashboard`, `client` -> `/cliente/dashboard`) con registro auto-confirmado (2026-06-15).
*   **Check-in por Código QR:** Endpoint `/api/check-in` + RPC robusto. Scanner nativo `html5-qrcode` y generación de código QR del gimnasio para impresión (2026-06-16).
*   **Sistema de Gestión de Pagos:** Flujo multipaso de subida de comprobantes a bucket privado en Storage y aprobación/rechazo administrativo con notas (2026-06-16).
*   **Modelo Base Calendario (Faltas Descuentan):** Rediseño matemático del cálculo de días restantes. En lugar de descontar por uso, descuenta por días hábiles transcurridos según el plan (20 días/mes o 24 días/mes), descontando las faltas del cliente (2026-06-24).
*   **UX Premium Dashboard:** Gamificación con barra de metas dinámica, racha de entrenamientos, banners branded motivacionales y botón de check-in con animación heartbeat (2026-06-24).
*   **Doble Ingreso AM/PM:** Soporte de doble check-in por día (mañana + tarde) en un intervalo protegido sin consumir días extra de membresía (2026-06-24).
*   **Análisis Antifraude con IA (Gemini):** Validación automática de comprobantes de transferencia (Nequi/Efectivo) analizando destinatario, monto, fecha, hashes SHA-256 e imagen negra (2026-06-24).
*   **Optimización de Navegación y Render:** Reescritura del bottom-nav simétrico y componentes para evitar hidrataciones innecesarias en Next.js (2026-07-03).
*   **Módulo de Clases y Rutinas:** Panel de clases semanales para el admin y hub completo de rutinas (visor, editor y asignador de plantillas) para el cliente y el administrador (2026-07-03 y 2026-07-06).

---

## 📋 Detalle de Avances Históricos (1 al 27)

### 1. Base de datos Supabase
Esquema completo en Postgres: tablas `gyms`, `profiles`, `clients`, `plans`, `memberships`, `payments`, `attendance`, `progress_records`. Enums (`user_role`, `membership_status`, `payment_status`, `payment_method`). Funciones críticas `SECURITY DEFINER`: `process_check_in` (check-in atómico), `approve_payment`, `reject_payment`, `membership_effective_status`. RLS activado en todas las tablas + helpers `is_admin()` y `current_gym_id()`. Seed: 1 gym "NENE'S GYM", 5 planes (día suelto → mensual 26 días).

### 2. Setup Next.js 16 + estructura
Proyecto `nenes-gym` con TypeScript estricto, Tailwind v4, estructura de carpetas (`actions/`, `services/`, `components/`, `lib/`, `schemas/`, `constants/`, `types/`). Turbopack como bundler.

### 3. Conexión Supabase
`@supabase/ssr` con 3 clientes: `createClient()` (server), `createBrowserClient()` (browser), `createAdminClient()` (service role, solo server). `src/proxy.ts` para refresco de sesión y protección de rutas. Tipos generados en `database.types.ts`. Variables en `.env.local`.

### 4. Tema oscuro/rojo + UI
Modo oscuro siempre activo (`class="dark"`). Rojo primario `#dc2626`. Componentes base: `input`, `card`, `badge` (con `MembershipBadge` y `PaymentBadge`), `button`. Navegación inferior (`bottom-nav`) y `page-header`.

### 5. Auth + roles + protección de rutas
Login/registro con un solo `/login` para todos. Redirección automática por rol: `admin` → `/admin/dashboard`, `client` → `/cliente/dashboard`. Registro auto-confirma el correo (sin paso de confirmación por email). Mensajes de error de inicio de sesión traducidos al español. Cuenta dueña: `andersonrua12@gmail.com` (rol `admin`).

### 6. Páginas cliente
Dashboard (estado de membresía, días restantes), pagos (subir comprobante + historial), asistencia (scanner QR), progreso (registro de peso/estatura + IMC + historial).

### 7. Páginas admin
Dashboard (stats: clientes, pagos pendientes, ingresos hoy), clientes (lista filtrada por rol `client`), pagos (aprobar/rechazar), asistencias (ingresos del día), perfil (cambiar nombre y correo).

### 8. Check-in QR
`POST /api/check-in` → RPC `process_check_in` (atómico, 1 ingreso por día, descuenta 1 día). Scanner con `html5-qrcode` + fallback de código manual. QR del gym generado con `qrcode` y mostrado en un modal desde el panel de Clientes para imprimir.

### 9. Pagos
Cliente sube comprobante (Storage privado `receipts` + URL firmada). Admin aprueba (crea membresía con días + `end_date`) o rechaza con nota. Comprobantes visibles solo por URL firmada.

### 10. Activación manual de plan
Desde el panel de Clientes, botón "Activar plan" por cliente: selecciona plan + método de pago → `createManualPaymentAction` registra el pago ya aprobado y activa la membresía al instante.

### 11. Íconos PWA + manifest
`manifest.ts` (`theme_color #dc2626`, `display standalone`). Íconos 192px y 512px generados en `public/icons/`.

### 12. Deploy a Vercel
Proyecto `nenesgym` en equipo `nenesgym1508-7305's projects`. Variables configuradas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`. Build limpio (18 rutas). Repo GitHub conectado (`nenesgym1508/nenesgym`, público). URL producción: `https://nenesgym.vercel.app`.

### 13. Calendario de asistencia en dashboard
Integración de un calendario mensual con visualización de asistencias en verde y faltas en rojo translúcido. El día actual se resalta en rojo brillante con sombra y escala ampliada. Se marca el día de activación de la membresía con un anillo blanco en el borde. El componente discrimina los días de descanso según el plan del cliente (los fines de semana no cuentan para planes de 20 días/5 días por semana, y solo domingos para planes de 24 días).

### 14. Rediseño de Catálogo de Planes
Depuración de la base de datos Supabase para ofrecer exclusivamente tres planes: "Día suelto" ($5.000), "Mensual (5 días/semana) (20 días)" ($70.000) y "Mensual (6 días/semana) (24 días)" ($80.000). Se rediseñó la UI en cliente y administrador para calcular y presentar el porcentaje de ahorro real (30% y 33% respectivamente) mediante badges elegantes en color verde translúcido.

### 15. Optimización de Instalador PWA
El banner grande de instalación PWA fue removido del cuerpo central del dashboard del cliente para ahorrar espacio. En su lugar, se implementó un botón miniatura "Instalar App" en la cabecera (Header) al lado de "Salir". Para dispositivos iOS (Safari), al pulsar el botón se despliega un modal elegante explicando los pasos manuales de instalación usando el botón de Compartir nativo.

### 16. Alineación con spec v1
Cierre de los gaps G1–G8 identificados en el plan de alineación:
- **Nav 5 tabs + FAB central** (`bottom-nav.tsx`): cliente tiene Inicio · Pagos · [Entrada FAB rojo elevado] · Progreso · Perfil. Admin tiene Panel · Clientes · Pagos · Ingresos · Más. Naming unificado: "Entrada" en cliente, "Ingresos" en admin.
- **Perfil cliente** (`/cliente/perfil`): nombre, teléfono, correo, cambiar contraseña, cerrar sesión, línea "Mi gimnasio: NENE'S GYM". Reutiliza `ClientProfileForm`.
- **Dashboard cliente completo**: aviso de pago pendiente/rechazado, mini-resumen de progreso (peso + IMC), estado "ya ingresaste hoy", `InstallAppCard` en header.
- **Entrada completa** (`/cliente/asistencia`): estado del día ("ya registraste"/"aún no"), últimos 3 ingresos, fallback de código manual.
- **Admin "Más"** (`/admin/mas`): gestión de planes (nombre/precio/días via `PlansManager`), días de gracia y nombre del gym (`GymSettingsForm`), perfil del profesor, cerrar sesión.
- **Admin Asistencias**: botón "Ver QR del gimnasio" y "Registrar ingreso manual" cableados.
- **Estados UI reutilizables**: `EmptyState`, `LoadingState`, `ErrorState` en `src/components/ui/states.tsx`.
- **Rutas**: `CLIENTE_PERFIL` y `ADMIN_MAS` añadidas a `routes.ts`.

### 17. Fix caché de navegador y visibilidad de bottom nav
- **`next.config.ts`**: añadidos headers HTTP `Cache-Control: no-store, max-age=0` para todas las rutas de página. Los navegadores y Vercel nunca cachean el HTML desde ahora.
- **`layout.tsx`**: eliminadas las meta tags `httpEquiv="Cache-Control"` que los navegadores modernos ignoran para bundles JS.
- **`bottom-nav.tsx`**: cambiado `bg-zinc-900/95 backdrop-blur-md` → `bg-zinc-950` sólido y `border-white/8` → `border-white/15`.
- **Iconos PWA**: `icon-192.png` e `icon-512.png` regenerados con `sharp` + SVG (fondo rojo `#dc2626`, letra "N" blanca centrada).

### 18. Análisis de comprobantes con IA (Gemini)
El cliente sube el comprobante, la IA lo analiza y valida, y según la configuración el pago se aprueba solo o queda pendiente para el admin.
- **Flujo (componente `payment-upload-form.tsx`, multipaso):** `plan` → `imagen` → `preview` → `analizando` → `confirmar` → `enviando` → `aprobado`/`pendiente`/`error`.
- **API `POST /api/analizar-comprobante`** (`accion: "analizar" | "confirmar"`): Modelo **`gemini-2.5-flash`** (Google Generative AI). Extrae monto, referencia, entidad, fecha, hora, destinatario, número destino, transacción exitosa.
- **Anti-duplicados:** hash **SHA-256** (imagen exacta) + **dHash perceptual** de 64 bits con `jimp` (hamming ≤ 8 sobre los últimos 500 pagos) + **referencia repetida** contra `payments.ai_referencia`.
- **Rate limit:** 10 análisis/hora por cliente (persistido en `gym_config`).
- **Veredicto temporal** en `receipt_verdicts` (TTL 15 min) con anti-tampering.
- **Auto-aprobación:** si el cliente tiene `auto_aprobacion = true` y la IA validó, llama a la RPC `approve_payment` y activa la membresía al instante.
- **Sistema de strikes** (`registrarStrike`): imagen/referencia repetida suma un strike. 1 strike = aviso · 2 = bloqueo temporal 24 h (`comprobante_bloqueado_hasta`) · 3 = bloqueo permanente (`comprobante_bloqueado = true`).
- **Panel admin** (`pending-payment-card.tsx`): sección "Análisis IA" con datos detectados, badge ⚡ Auto y vista previa de la imagen.
- **Config del gym** (`/admin/mas` → `GymSettingsForm`): número y titular de Nequi y Daviplata; la IA verifica que el comprobante haya sido enviado a esas cuentas.

### 19. Modelo de membresía base calendario (las faltas descuentan)
Cada día hábil que pasa descuenta, asista o no.
- Helper `eligibleDaysElapsed(startDate, today, daysPerWeek)` en `src/lib/dates`: cuenta los días hábiles transcurridos desde la activación hasta ayer. Domingo siempre es libre; sábado también en planes de 5 días/semana.
- `días restantes = total_days − días hábiles transcurridos` (`membershipRemainingDays`).
- Aplicado en dashboard cliente, admin clientes, check-in manual y en SQL.
- `used_days` se conserva como estadística de veces que asistió; ya no controla el cupo.

### 20. Ajustes UI dashboard + métodos de pago
- **Botón "Registrar entrada"** movido a la cabecera del dashboard, al lado del saludo, en formato compacto (mantiene estado "Ya ingresaste" en verde).
- **Tarjeta "Mi progreso"** eliminada del dashboard (ya está en la barra inferior).
- **Saludo**: "Hola, [nombre] 👋" → "**¡Hola!**" + nombre, sin emoji.
- **Métodos de pago** del formulario del cliente reducidos a **Efectivo** y **Nequi**.

### 21. UX Premium Dashboard
Rediseño visual completo del dashboard del cliente.
- **Estructura:** Saludo con avatar inicial → MembershipSummaryCard → alerta de pago → CTA "Registrar entrada" → Estado de hoy → Tu progreso → Calendario → Gamificación → Banner motivacional → Últimos ingresos.
- **Componentes nuevos:** `MembershipSummaryCard` (imagen branded), `TodayStatusCard` (anillo de estado), `QuickProgressCard` (peso/IMC/delta), `WorkoutStreakCard` (racha), `MonthlyGoalCard` (meta mensual), `MotivationalBanner`, `ProgressBar`, `SuccessToast`.
- **Botón "Registrar entrada":** Imagen PNG sin fondo (`public/btn-registrar.png`) con animación heartbeat pulsante en drop-shadow rojo.

### 22. Doble ingreso AM/PM
Se permite máximo 2 check-ins por día, uno por franja (mañana y tarde), sin consumir días extra de membresía.

### 23. Optimización de rendimiento frontend
Remoción de importaciones muertas y renderizados duplicados en cascada.

### 24. Rediseño del sistema de creación de clases
Flujos limpios y modulares para crear clases diarias paso a paso con biblioteca de ejercicios e interactividad.

### 25. Rediseño visual del Panel Admin
Estilo consistente con el tema oscuro, bordes suavizados e indicadores de color rojo para reflejar marca.

### 26. Rendimiento de navegación cliente
Eliminación de la caché de rutas del lado del cliente en Next.js para forzar la actualización de datos frescos al cambiar de vista.

### 27. Módulo de Rutinas completo
Despliegue y creación física de la suite completa de creación, edición y asignación de rutinas y plantillas para clientes y profesores.
