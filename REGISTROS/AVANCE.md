# 🏋️ NENE'S GYM — Bitácora de Avance

> PWA de gestión de gimnasio (profesor/admin + clientes): membresías con cupo de días +
> vencimiento mensual, pagos con comprobante, check-in por QR.

**Última actualización:** 2026-06-18

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
Proyecto `nenes-gym` creado en el primer deploy. Variables configuradas:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_APP_URL`. Build limpio (14 rutas). Dev local activo en `localhost:3000`.

---

## ⏳ Próximos pasos / pendientes

- [x] ~~**Aplicar GRANT** de `approve_payment`/`reject_payment` a `authenticated`~~ (resuelto, ver `ERRORES.md` → ERR-008).
- [ ] **Página de detalle de cliente** (`/admin/clientes/[id]`): usa `getClientById` +
      `getMembershipsForClient` (ya existen en backend, sin UI).
- [ ] **Estadística de asistencia 7 días** (`getRecentAttendance`, sin UI).
- [ ] **Resumen de progreso** del cliente (`getProgressSummary`, sin UI).
- [ ] **QA de seguridad RLS** por rol (cliente A no ve datos de cliente B ni de otro gym).
- [ ] **Pruebas E2E** del flujo completo: registro → pago → aprobación → check-in → progreso.
- [ ] Limpiar datos de prueba (fila huérfana en `clients` del admin + pago de prueba de $50.000).
