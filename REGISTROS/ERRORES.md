# 🐛 NENE'S GYM — Registro de Errores y Soluciones

> Cada error detectado durante el desarrollo, su causa raíz y cómo se resolvió.
> Formato por entrada: **Síntoma → Causa raíz → Solución → Estado**.

**Última actualización:** 2026-06-24

---

## Resumen

| # | Fecha | Error | Estado |
|---|---|---|---|
| ERR-001 | 2026-06-15 | Zod v4 quitó `invalid_type_error` | ✅ Resuelto |
| ERR-002 | 2026-06-15 | `measurements` incompatible con tipo `Json` de Supabase | ✅ Resuelto |
| ERR-003 | 2026-06-15 | `ssr: false` no permitido en Server Component | ✅ Resuelto |
| ERR-004 | 2026-06-15 | Conflicto de rutas paralelas (route groups) en Turbopack | ✅ Resuelto |
| ERR-005 | 2026-06-16 | Mensajes de error de Supabase Auth en inglés | ✅ Resuelto |
| ERR-006 | 2026-06-16 | "Debes confirmar tu correo" innecesario al iniciar sesión | ✅ Resuelto |
| ERR-007 | 2026-06-16 | El admin aparecía en la lista de Clientes | ✅ Resuelto |
| ERR-008 | 2026-06-16 | `permission denied for function approve_payment` | ✅ Resuelto |
| ERR-009 | 2026-06-24 | Números Nequi/Daviplata del gym no aparecían en el form del cliente | ✅ Resuelto |
| ERR-010 | 2026-06-24 | "No se pudo analizar el comprobante" (API key vacía + modelo descontinuado) | ✅ Resuelto |

---

## Detalle

### ERR-001 — Zod v4 quitó `invalid_type_error`
- **Síntoma:** Error de compilación: `'invalid_type_error' does not exist in type {...}`.
- **Causa raíz:** Zod v4 cambió la API; `invalid_type_error` se reemplazó por `message`.
- **Solución:** En `src/schemas/progress.schema.ts`, cambiar `z.number({ invalid_type_error: '...' })`
  por `z.number({ message: '...' })`.
- **Estado:** ✅ Resuelto.

### ERR-002 — `measurements` incompatible con tipo `Json` de Supabase
- **Síntoma:** `Type 'Json' is not assignable to type 'Record<string, unknown> | null'`.
- **Causa raíz:** El tipo de `measurements` era más estricto que el tipo `Json` que genera Supabase.
- **Solución:** En `src/types/progress.ts`, cambiar `measurements: Record<string, number> | null`
  por `measurements: unknown`.
- **Estado:** ✅ Resuelto.

### ERR-003 — `ssr: false` no permitido en Server Component
- **Síntoma:** `` `ssr: false` is not allowed with `next/dynamic` in Server Components ``.
- **Causa raíz:** El scanner QR usa la cámara (solo cliente) y se importaba con `dynamic(..., { ssr:
  false })` desde un Server Component.
- **Solución:** Crear `src/components/qr/qr-scanner-wrapper.tsx` con `'use client'` que hace el
  `dynamic` import con `ssr: false`, y usar el wrapper en la página.
- **Estado:** ✅ Resuelto.

### ERR-004 — Conflicto de rutas paralelas (route groups) en Turbopack
- **Síntoma:** `You cannot have two parallel pages that resolve to the same path. Please check
  /(admin)/dashboard and /(cliente).`
- **Causa raíz:** Los route groups `(admin)` y `(cliente)` **no** añaden segmento de URL, así que
  `(cliente)/dashboard/page.tsx` y `(admin)/dashboard/page.tsx` resolvían ambos a `/dashboard`.
  Vaciar los archivos con `export {}` no bastó: Turbopack registra los `page.tsx` por nombre de
  archivo, no por contenido.
- **Solución:** Mover las páginas reales a subcarpetas con nombre propio:
  `(cliente)/cliente/dashboard/` → `/cliente/dashboard` y `(admin)/admin/dashboard/` →
  `/admin/dashboard`. **Eliminar** los `page.tsx` stub conflictivos.
- **Estado:** ✅ Resuelto.

### ERR-005 — Mensajes de error de Supabase Auth en inglés
- **Síntoma:** Errores como "Invalid login credentials" o "Email not confirmed" mostrados al
  usuario en inglés.
- **Causa raíz:** Supabase Auth devuelve los mensajes de error en inglés.
- **Solución:** Función `traducirErrorAuth(msg)` en `src/actions/auth.actions.ts` que mapea los
  errores comunes al español, con fallback genérico ("Ocurrió un error inesperado.").
- **Estado:** ✅ Resuelto.

### ERR-006 — "Debes confirmar tu correo" innecesario al iniciar sesión
- **Síntoma:** Tras registrarse, al iniciar sesión salía "Debes confirmar tu correo antes de
  ingresar".
- **Causa raíz:** `signUp()` deja al usuario pendiente de confirmación por email; no se quiere ese
  paso para este proyecto.
- **Solución:** Cambiar el registro a `admin.auth.admin.createUser({ email_confirm: true })`, que
  crea al usuario ya confirmado e inicia sesión de inmediato. El usuario existente se confirmó con
  un `UPDATE auth.users SET email_confirmed_at = now()`.
- **Estado:** ✅ Resuelto.

### ERR-007 — El admin aparecía en la lista de Clientes
- **Síntoma:** El usuario dueño (admin) aparecía como cliente en `/admin/clientes`.
- **Causa raíz:** Al registrarse, un trigger crea fila en `profiles` **y** en `clients`. Al
  promover al usuario a `admin`, la fila en `clients` quedó huérfana, y las consultas
  `getAllClientsWithMembership` / `getAllClients` no filtraban por rol.
- **Solución:** Filtrar las consultas con join obligatorio por rol:
  `profile:profiles!inner(...)` + `.eq("profile.role", "client")` en
  `src/services/memberships.service.ts` y `src/services/clients.service.ts`.
- **Estado:** ✅ Resuelto. *(Pendiente opcional: borrar la fila huérfana + pago de prueba del admin.)*

### ERR-008 — `permission denied for function approve_payment`
- **Síntoma:** Al activar/aprobar un plan desde el panel admin: `permission denied for function
  approve_payment`.
- **Causa raíz:** Las funciones `approve_payment` y `reject_payment` (`SECURITY DEFINER`) solo
  tenían `EXECUTE` para `service_role`, no para `authenticated`. (`process_check_in` sí lo tenía,
  por eso el check-in funcionaba.)
- **Solución propuesta:** Otorgar `EXECUTE` al rol `authenticated`. Es seguro porque ambas
  funciones validan `if not is_admin() return 'No tienes permiso'` internamente:
  ```sql
  GRANT EXECUTE ON FUNCTION public.approve_payment(uuid, integer, integer) TO authenticated;
  GRANT EXECUTE ON FUNCTION public.reject_payment(uuid, text) TO authenticated;
  ```
- **Estado:** ✅ Resuelto — GRANT aplicado en producción el 2026-06-16 (migración
  `grant_execute_payment_functions_to_authenticated`). Verificado: ambas funciones tienen
  `authenticated=X` en su ACL.

### ERR-009 — Números Nequi/Daviplata del gym no aparecían en el form del cliente
- **Síntoma:** El número Nequi guardado en `/admin/mas` no se mostraba en el formulario de pago del
  cliente.
- **Causa raíz:** `updateGymSettingsAction` hacía el `UPDATE` de la tabla `gyms` usando
  `ctx.supabase` (cliente con RLS del usuario admin). La política RLS de `gyms` no permitía ese
  UPDATE, por lo que el guardado fallaba en silencio y los campos quedaban en `null`.
- **Solución:** Usar `createAdminClient()` (service role, sin RLS) para el UPDATE en
  `src/actions/admin.actions.ts`. Además, el formulario del cliente ahora obtiene las cuentas vía
  `GET /api/gym-cuentas` (que también usa el admin client) en lugar de props del servidor.
- **Nota:** Tras el fix, el valor que aparecía (`175287585`, 9 dígitos) resultó ser un dato de
  prueba mal escrito guardado previamente. Pendiente: corregirlo en `/admin/mas` (ver AVANCE.md).
- **Estado:** ✅ Resuelto.

### ERR-010 — "No se pudo analizar el comprobante" (API key vacía + modelo descontinuado)
- **Síntoma:** Al subir un comprobante, siempre devolvía el error "No se pudo analizar el
  comprobante. Intentá con una imagen más clara." (HTTP 422).
- **Causa raíz:** Dos problemas encadenados: (1) `GEMINI_API_KEY` estaba vacía en `.env.local`, así
  que la llamada a Gemini fallaba; (2) tras configurar la clave, el modelo `gemini-2.0-flash` ya no
  está disponible (Google lo descontinuó → HTTP 404 "model is no longer available").
- **Solución:** Configurar `GEMINI_API_KEY` en `.env.local` y cambiar el modelo a
  **`gemini-2.5-flash`** en `src/app/api/analizar-comprobante/route.ts`. Verificado con `curl`
  contra `generativelanguage.googleapis.com` que la clave autentica (formato nuevo `AQ.*`, funciona
  por header `x-goog-api-key` y por query param `?key=`) y que el modelo procesa peticiones.
- **Nota:** La clave debe agregarse también en las variables de entorno de Vercel para que funcione
  en producción (ver AVANCE.md → próximos pasos).
- **Estado:** ✅ Resuelto en desarrollo.
