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

### Fase 5: Cerrar el ciclo del socio dado de alta a mano (abierto en Sesión 18)
El admin ya puede registrar a un socio que llega sin celular (`createClientAction` + `NewClientModal`). Falta lo que convierte esa cuenta "sin acceso" en una cuenta normal:
*   ~~Editar datos del socio / darle acceso~~ — **resuelto en Sesión 18** con el sistema de invitaciones (`client_invitations` + `accept_client_invitation`). ✅ Migraciones `026` y `027` **aplicadas y verificadas en producción** el 2026-08-22.
*   **Aviso de socio parecido ANTES de cobrar (lo más rentable que queda).** El alta bloquea duplicados por WhatsApp, y desde la migración 028 eso ya cubre a quien se registró por `/register`. Pero **Google no entrega teléfono**, así que ese socio sigue con `profiles.phone` NULL y puede duplicarse: el admin le crea ficha nueva, le cobra, y el socio no puede reclamarla (`ACCOUNT_HAS_DATA`) — el dinero queda en la ficha huérfana. Falta avisar en el paso 1 del alta si existe un socio con nombre parecido, con dos salidas: "Ver su ficha" o "Es otro socio, continuar".
*   **Segundo factor para el enlace de invitación (recomendado).** El enlace es una credencial reenviable por WhatsApp. Pedir los **4 últimos dígitos del celular** antes de habilitar el botón de Google lo volvería inútil si se filtra. El celular ya es obligatorio en el alta, así que cuesta un input. Es lo primero que añadiría si se quiere endurecer.
*   **Fusionar dos fichas con historial.** Hoy la RPC aborta con `ACCOUNT_HAS_DATA` cuando el Google del socio ya es otro socio con datos, y lo resuelve un humano. Automatizarlo exige reasignar 11 tablas y decidir qué membresía sobrevive: alto riesgo para un caso raro.
*   **Buscar por celular (y documento) en `admin_search_clients`** — hoy solo filtra por `full_name` y `email`, justo lo que le falta al socio sin correo. Se implementó en Sesión 18 y **se retiró a petición del usuario** junto con la cédula; el enfoque técnico quedó documentado en el CHANGELOG por si se retoma.
*   **Aviso de posible duplicado por nombre** antes de crear. Al haberse retirado la cédula, hoy **no hay ninguna defensa** contra registrar dos veces a la misma persona: el nombre es lo único que se puede comparar.

---

### Fase 6: Vincular el correo del socio por WhatsApp (propuesta del usuario, Sesión 18 — 2026-08-22)

**Contexto.** El socio dado de alta a mano tiene una cuenta con correo marcador: existe en el sistema pero no puede entrar a la app. Falta el paso que la convierte en cuenta real. Desde 2026-08-22 el **celular es obligatorio** en el alta, así que ya hay un canal garantizado para ese socio.

**Decisión del usuario: NO integrar la API de Meta.** En vez de enviar el mensaje automáticamente, el panel abre un enlace `wa.me` con el mensaje **ya escrito**, y el admin solo pulsa enviar desde su propio WhatsApp. Cero verificación de negocio, cero número dedicado, cero plantillas aprobadas, cero coste por conversación. Como el admin está delante del socio en ese momento, el resultado práctico es el mismo.

**Enfoque técnico propuesto (sin migraciones ni tablas nuevas):**
1. El mensaje lleva un **magic link de Supabase** generado en el servidor con `auth.admin.generateLink({ type: 'magiclink', email: <correo marcador> })`. `generateLink` **devuelve** el enlace sin enviar ningún correo — que es justo lo que hace falta, porque ese buzón no existe.
2. El socio pulsa el enlace desde su WhatsApp → entra a su propia cuenta sin contraseña.
3. Ya dentro, pone su correo y su contraseña con **lo que ya existe**: el modal de perfil del cliente, `updateEmailAction` y `setPasswordAction` (esta última escrita justo para cuentas sin contraseña, ver Sesión 12).
4. El botón vive en la ficha del cliente y en el paso final del alta: `https://wa.me/57{celular}?text={mensaje url-encoded}`.

**Puntos a resolver antes de implementar:**
*   **Caducidad.** Los magic links de Supabase expiran (1 h por defecto) y son de un solo uso. Si el socio lo abre tres días después, está muerto y el admin tiene que reenviarlo. Hay que decidir si se sube la caducidad en Supabase o si se asume el reenvío (el botón estará siempre disponible en la ficha).
*   **Redirect permitido.** La URL de retorno tiene que estar en la lista de *Redirect URLs* de Supabase Auth.
*   **Confirmación del correo nuevo.** `updateEmailAction` usa `supabase.auth.updateUser({ email })`, que manda correo de confirmación a la dirección nueva (verifica que es real, pero depende del SMTP de Supabase). La alternativa es `admin.updateUserById({ email, email_confirm: true })` desde una action, sin confirmación. Decidir cuál.
*   **Seguridad.** Un magic link es una credencial: quien lo tenga entra a esa cuenta. Va por WhatsApp al número que el admin acaba de teclear — si se equivoca de número, se lo manda a un desconocido. Mitiga que caduque pronto y que la cuenta nueva no tenga datos sensibles todavía.

---

## 💡 Ideas a futuro (no priorizadas)

### Modo offline como panel aparte (propuesto Sesión 16 — 2026-08-03)
Se construyó y probó de punta a punta un modo offline (Service Worker + IndexedDB + shell HTML estático) para que el admin pudiera cobrar en efectivo sin internet. Se revirtió antes de entrega (ver `CHANGELOG.md` Sesión 16 y `LECCIONES_APRENDIDAS.md`) por alargar el plazo de entrega más de lo previsto, no por inviabilidad técnica — funcionaba.

Idea del usuario para retomarlo más adelante, **desacoplado del sistema principal**: un panel/app separado que se conecte a la página y guarde localmente la información necesaria (estado de clientes, cobro en efectivo, check-in), en vez de integrarlo directamente en `nenes-gym` como se intentó esta vez. Ventaja: no compite con el ciclo de release del sistema principal ni introduce Service Worker/caché en el código que sí ve el cliente final todos los días.

Si se retoma, el plan detallado (arquitectura, migraciones, verificación) quedó documentado en `C:\Users\ander\.claude\plans\clever-churning-kay.md` — sigue siendo válido como punto de partida técnico, aunque habría que adaptarlo al enfoque de "panel aparte" en vez de integrado. La migración 023 (acumulación de membresía al renovar) y 024 (pago en efectivo atómico) ya quedaron aplicadas en producción independientemente de esto — no son parte de lo pendiente.
