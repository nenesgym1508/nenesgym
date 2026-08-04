# 🗺️ Roadmap y Visión — NENE'S GYM

Este documento define la visión estratégica y las próximas características a implementar en el sistema.

---

## 📌 Visión General
Transformar la plataforma del gimnasio en un sistema integrado de alto rendimiento de entrenamiento y cobros, permitiendo la automatización de la prospección, validación de pagos vía Inteligencia Artificial (comprobantes de Nequi/Bancolombia) y gestión activa de membresías.

---

## 📋 Roadmap Técnico (Próximas Sesiones)

### Fase 1: Panel del Profesor (Detalle de Cliente en Admin)
*   **Pantalla `/admin/clientes/[id]`:** Crear la interfaz completa para el administrador/profesor. Debe permitir ver el estado del cliente, membresía actual activa, strikes acumulados por pagos, e historial completo de asistencia y progreso.
*   **Asignador de Rutinas:** Incorporar la capacidad de seleccionar plantillas de rutinas y asignarlas a clientes de forma directa desde su vista de detalle.

### Fase 2: Métricas Avanzadas
*   **Asistencia 7 Días (Admin):** Mostrar gráficas de afluencia semanal e informes en el dashboard del administrador.
*   **Resumen de Progreso:** UI para que los profesores e instructores puedan visualizar de forma comparativa la evolución del peso, masa grasa y BMI de cada alumno.

### Fase 3: QA de Aislamiento y Seguridad RLS
*   **Auditoría de Políticas:** Validar que un cliente A del gimnasio X no pueda bajo ninguna circunstancia leer ni escribir datos de un cliente B o interactuar con el gimnasio Y.
*   **Pruebas de Integridad:** Simulación de check-in por código QR, vencimiento automático de membresías y renovación.

---

### Fase 4: Deuda técnica identificada (Sesión 17)
Ninguna bloquea la entrega, pero conviene no dejarlas crecer:
*   **Dominio propio para Cloudflare R2 → `img.nenesgym.com`.** Todo el catálogo ya vive en R2, pero servido por la URL de desarrollo `pub-*.r2.dev`, que Cloudflare limita y desaconseja para producción. Se comprobó con `curl` que **no devuelve `cf-cache-status`**: la caché de borde no actúa, cada petición llega al almacenamiento.
    *   ⚠️ **No es un cambio de configuración trivial.** R2 exige que la zona esté delegada a Cloudflare, y hoy los nameservers de `nenesgym.com` son de **Hostinger** (`aster.dns-parking.com` / `helios.dns-parking.com`). Hay que mover el DNS entero: añadir el dominio a Cloudflare, verificar que se importa el `A` de la raíz a Vercel (`76.76.21.21`) y el `CNAME` de `www`, y recién entonces cambiar los NS en Hostinger. A favor: **no hay registros MX**, así que no hay correo en riesgo.
    *   **Momento de hacerlo: ya, mientras nadie use la web** (dato del dueño, 2026-08-03). El riesgo de esta migración es la caída durante la propagación; sin usuarios ese riesgo es cero, y con clientes activos dejaría de serlo.
    *   Lado del código ya resuelto: `scripts/switch-r2-public-url.mjs` reescribe las 116 `media_url` y **aborta si el host nuevo todavía no sirve una imagen**, con backup y `--rollback`. Después queda actualizar a mano `NEXT_PUBLIC_R2_PUBLIC_URL` (`.env.local` + Vercel) y `remotePatterns` en `next.config.ts`.
    *   **Ya NO tiene nada que ver con el cupo de Vercel** (Sesión 17): las imágenes de ejercicio salieron del optimizador con variantes pre-generadas. El dominio propio queda solo por sus propios méritos — marca en las URLs, caché de borde y quitarse el rate-limit de `r2.dev`.
    *   **Urgencia real: baja.** Desde que las miniaturas pasan por `next/image` y los objetos llevan `Cache-Control: max-age=31536000, immutable`, el optimizador de Vercel pide cada original una vez y lo cachea un año — el tráfico contra `r2.dev` es proporcional al número de imágenes distintas (116), no a las visitas.
*   **Deuda de `any`.** 69 errores de lint, todos por los casts `(supabase as any)` en services y actions. La causa raíz es que `database.types.ts` está desactualizado (autogenerado, no se regenera solo tras cada migración). Regenerarlo eliminaría la mayoría de golpe.
*   **`middleware` → `proxy`.** Next 16 avisa en cada build de que la convención `middleware` está deprecada.
*   **`confirm()` / `alert()` nativos** en ~41 puntos de la UI admin/cliente, incluido el borrado de ejercicios. Rompen la consistencia visual con el resto de modales del sistema.

---

## 💡 Ideas a futuro (no priorizadas)

### Modo offline como panel aparte (propuesto Sesión 16 — 2026-08-03)
Se construyó y probó de punta a punta un modo offline (Service Worker + IndexedDB + shell HTML estático) para que el admin pudiera cobrar en efectivo sin internet. Se revirtió antes de entrega (ver `CHANGELOG.md` Sesión 16 y `LECCIONES_APRENDIDAS.md`) por alargar el plazo de entrega más de lo previsto, no por inviabilidad técnica — funcionaba.

Idea del usuario para retomarlo más adelante, **desacoplado del sistema principal**: un panel/app separado que se conecte a la página y guarde localmente la información necesaria (estado de clientes, cobro en efectivo, check-in), en vez de integrarlo directamente en `nenes-gym` como se intentó esta vez. Ventaja: no compite con el ciclo de release del sistema principal ni introduce Service Worker/caché en el código que sí ve el cliente final todos los días.

Si se retoma, el plan detallado (arquitectura, migraciones, verificación) quedó documentado en `C:\Users\ander\.claude\plans\clever-churning-kay.md` — sigue siendo válido como punto de partida técnico, aunque habría que adaptarlo al enfoque de "panel aparte" en vez de integrado. La migración 023 (acumulación de membresía al renovar) y 024 (pago en efectivo atómico) ya quedaron aplicadas en producción independientemente de esto — no son parte de lo pendiente.
