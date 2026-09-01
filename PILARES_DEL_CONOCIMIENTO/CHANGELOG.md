# 📋 Registro de Trabajo — NENE'S GYM

> **Historial de Trabajo:** Para revisar las sesiones anteriores del desarrollo (Sesiones de Avance 1 a 27), consulta el [Archivo de Changelog Histórico (V1)](./CHANGELOG_V1.md).

---

## 📌 Sesión 19 — 2026-09-01 (Descuento de días al vender un plan, campo de WhatsApp con países, auditoría de rendimiento con 400 socios y 100.000 asistencias, y limpieza de código muerto)
**Dev:** Claude (AI Agent)
**Branch:** main
**Migración aplicada a producción:** `029_search_unaccent_and_escape_wildcards.sql`

### 🎯 Qué se hizo

**1. Descontar días ya entrenados al vender un plan.**
Caso real del gimnasio: socios que llevaban semanas viniendo sin que se les hubiera
vendido plan. Contador opcional "Días que ya lleva viniendo" en *Registrar cliente*
(paso 2) y en *Activar plan*, con vista previa antes de cobrar.

Se resta a los DOS números del plan —días y ventana de calendario— porque el plan es
"N días dentro de M de calendario": restar solo los días le dejaría el plazo completo
para menos días, que es un plan distinto al que compró.

⚠️ NO se consigue retrocediendo `start_date`/`occurred_at`, que era lo primero que
parecía natural: el consumo se cuenta por días **hábiles** (`eligible_days_elapsed`),
así que retroceder 5 días de calendario podría descontar solo 3 si cayó domingo.
El precio no se toca: descontar días ajusta lo que le queda, no es una rebaja.

Sin migración: `create_and_approve_cash_payment` ya aceptaba `p_total_days` y
`p_duration_days`. Sí se añadió cota en `createManualPaymentAction`, porque esos dos
números dejaron de ser copia literal del catálogo y un 0 crearía una membresía que
nace vencida.

**2. Campo de WhatsApp con selector de país y longitud por país.**
Antes admitía letras y solo exigía "entre 10 y 15 dígitos en total". En la base ya
había un socio con **11 dígitos colombianos** (`31355587918`) y su enlace de WhatsApp
apunta a un número que no existe. Ahora Colombia exige exactamente 10, y cada país
declara su longitud nacional.

Detección automática de país **solo** si el número trae prefijo (`+57…` o `0057…`).
Sin él es imposible: un número suelto de 10 dígitos encaja en Colombia, México,
Argentina y EE.UU. por igual.

**3. El aviso de socio duplicado se adelantó al paso 1.**
Antes el admin rellenaba todo, elegía plan y método de pago, pulsaba Registrar, y solo
entonces saltaba "Ya existe un cliente con ese WhatsApp". Ahora se comprueba mientras
teclea (`checkClientPhoneAction`, con espera de 450 ms). La comprobación del servidor
en `createClientAction` **se queda**: entre teclear y guardar pueden pasar minutos.

**4. Auditoría de rendimiento contra producción.**
Se sembraron 400 socios, 342 membresías, 641 pagos y **100.000 asistencias** (un año
real: 400 socios × 20 visitas/mes × 12 meses), se midió con sesión real de admin y RLS
activo, y se borró todo. Conclusión: **no hay cuello de botella**. De 4.300 a 100.000
asistencias (23×) la consulta por socio se quedó en 218 ms, lo que prueba que el índice
existe. La latencia base es ~180 ms de red.

**5. Cascada eliminada en la ficha del socio (~400 ms).**
`getClientAccessState` estaba suelto entre dos `Promise.all` y bloqueaba a siete
consultas sin que ninguna lo necesitara. Y por dentro encadenaba dos consultas
independientes: 402 ms → 243 ms medidos.

**6. Limpieza: 12 archivos y 5 funciones muertas (−400 líneas).**
Entre ellos `src/lib/utils/index.ts`, que era **inalcanzable**: TypeScript resuelve
`utils.ts` antes que `utils/index.ts`, así que quien lo editara no habría visto
ningún efecto.

**7. Carpeta `migrations/` de la raíz unificada en `supabase/migrations/`.**
Tenía 3 funciones vivas en producción cuyo fuente estaba fuera de la carpeta
versionada; un entorno reconstruido desde ella nunca las habría aplicado.

### 📁 Archivos

**Nuevos:** `src/components/ui/phone-field.tsx`, `src/components/admin/used-days-field.tsx`,
`supabase/migrations/029_search_unaccent_and_escape_wildcards.sql`,
`030_ai_pagos_comprobantes.sql`, `031_increment_used_days.sql` (movidas de la raíz).

**Modificados:** `new-client-modal.tsx`, `activate-plan-modal.tsx`, `admin.actions.ts`,
`invitations.service.ts`, `attendance.service.ts`, `payments.service.ts`,
`memberships.service.ts`, `clientes/[id]/page.tsx`, `invitation-accept.tsx`.

**Borrados:** `check-db.ts`, `src/lib/utils/index.ts`, `src/lib/crop-image.ts`,
`progress-bar.tsx`, `monthly-goal-card.tsx`, `exercise-image-crop-modal.tsx`,
`constants/roles.ts`, `schemas/payment.schema.ts`, `schemas/progress.schema.ts`,
`types/attendance.ts`, `types/auth.ts`, `types/client.ts`,
`migrations/admin_search_clients.sql` (la sustituye la 029).

### ✅ Verificación

- `tsc --noEmit` 0 · `npm run build` 0 · lint 110 → 108 problemas (ninguno nuevo).
- **43 pantallas** recorridas con sesión real de admin y de socio: todas OK.
- Migración 029 verificada contra producción: 9 de 9 casos.
- Aislamiento entre socios: escritura y lectura ajena bloqueadas por RLS.
- Producción restaurada: 3 usuarios, 2 socios, 0 restos de siembra.

### ⏭️ Pendiente

- Probar el botón de Google de la invitación desde el WhatsApp real de Android.
- Revocar el PAT de GitHub pegado en el chat el 2026-08-31 (permisos de admin).
- 108 problemas de lint preexistentes (`any` sin tipar y comillas sin escapar).

---

## 📌 Sesión 18 — 2026-08-21 (Alta manual de clientes desde el panel admin: el socio que llega sin celular)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** pendiente de commit al cierre de esta entrada. `git push` sigue pendiente de autorización con la clave.

### 🎯 Contexto:
Hasta hoy **el único camino para que existiera un cliente era que la persona se registrara ella misma** en `/register` (correo + contraseña). El admin solo podía *activar un plan* a alguien que ya existía. El socio que llega al gimnasio sin celular no podía quedar en el sistema, y por lo tanto no podía tener membresía, ingresos ni historial.

### ✅ Qué se hizo:
- **`createClientAction`** (`src/actions/admin.actions.ts`): alta de socio con solo el nombre como obligatorio. Crea el usuario de auth (service role), completa `profiles`/`clients` de forma idempotente y, opcionalmente, activa el plan reutilizando `createManualPaymentAction` sin tocarla.
- **Correo marcador** (`src/lib/placeholder-email.ts`, nuevo): si el admin no escribe correo, se genera `nombre.a3f91c@socios.nenesgym.com`. `isPlaceholderEmail()` lo detecta para que la UI nunca lo pinte.
- **`NewClientModal`** (`src/components/admin/new-client-modal.tsx`, nuevo): modal de 2 pasos (datos → plan) con opción explícita "Registrar sin plan", aviso de que sin correo el socio no podrá entrar a la app, y enlace a la ficha al terminar.
- **Botón "Registrar cliente"** en `/admin/dashboard` (primario, rojo — "Registrar pago" pasó a secundario) y en la cabecera de `/admin/clientes` (variante discreta, que es donde el admin descubre que el socio no está).
- **`traducirErrorAuth` extraído** a `src/lib/auth/auth-errors.ts`: vivía dentro de `auth.actions.ts`, que es `"use server"` y por tanto no puede exportar funciones síncronas. Ahora la comparten `auth.actions.ts` y `admin.actions.ts` sin duplicar la tabla de mensajes.
- **Fase 3 (correo marcador oculto)** en los 2 únicos puntos de la UI que pintan el correo: `client-search-box.tsx` y `admin/clientes/[id]/page.tsx` (chip "Sin cuenta de acceso").


### 🪪 Cédula como identificador — propuesta, implementada y RETIRADA (misma sesión):
El usuario propuso pedir la cédula para distinguir a la cuenta sin correo. Se implementó completa (campo destacado, normalización, índice único parcial, búsqueda por documento y celular, `CC 1012345678` como identificador visible) y después el usuario decidió **quitarla**: *"mejor quita la cédula"*.

**Estado: revertido por completo.** Se borraron `src/lib/document-id.ts` y `supabase/migrations/026_client_document_id_search.sql`, y el campo salió del formulario de alta. **La base nunca se tocó** — se verificó antes de revertir que la migración 026 no llegó a aplicarse (la RPC `admin_search_clients` sigue devolviendo sus 7 columnas originales, sin `document_id`), así que no hay nada que deshacer en producción.

⚠️ **La columna `clients.document_id` sigue existiendo** en la base (es de la V1, no la creó esta sesión). Simplemente ya no la escribe ni la lee nadie.

Si se retoma algún día, el análisis que se hizo sigue siendo válido y está en el `CHANGELOG` de esta entrada y en `planes/plan-alta-manual-de-clientes.md`: la clave era que un dato tecleado por humanos necesita **normalizarse** antes de indexarlo como único, o el índice es decorativo.

### 📱 Celular obligatorio (2026-08-22):
Tras retirar la cédula, el usuario decidió que **el celular/WhatsApp sea obligatorio** en el alta manual. Aclara además el caso de uso original: el socio *no trae el celular encima* (por eso no puede registrarse solo), pero **sí tiene número**.
- Obligatorio en `adminCreateClientSchema`, en `createClientAction` y en el formulario (el botón "Continuar" no se habilita sin él).
- **Se guarda canonizado**: solo dígitos y sin el indicativo `57`. `"+57 300-123-4567"`, `"573001234567"` y `"3001234567"` convergen al mismo valor. Sin esto serían tres socios distintos y la detección de duplicados no vería nada (misma lección que dejó la cédula).
- **Duplicados por celular**: `createClientAction` comprueba antes de crear y devuelve el nombre de quien ya tiene ese número. Es la única defensa contra registrar dos veces a la misma persona, ahora que no hay cédula. Sin migración: es una consulta en la action, igual que la de correo que ya existía.
- Motivo de fondo: el celular es el canal para el flujo de vinculación por WhatsApp que el usuario propuso (ver `ROADMAP_VISION.md` → Fase 6).

### 🧭 El plan parecía no estar (2026-08-22):
El usuario miró el paso 1 del modal y preguntó *"faltaría la opción para añadir el plan de una vez, no?"*. **Sí estaba** — es el paso 2 — pero un botón que solo dice "Continuar" no promete nada, así que la pantalla se lee como si el flujo terminara ahí. Que lo dijera justamente quien va a usar la pantalla a diario es la señal más fuerte posible de que el diseño no comunicaba.
- Botón: "Continuar" → **"Continuar y elegir plan"** + flecha.
- Indicador **"Paso 1 de 2"** / **"Paso 2 de 2"** en la cabecera de cada paso.
- No se fusionaron los dos pasos en una sola pantalla: el paso 2 lleva la lista de planes, los descuentos y los 5 métodos de pago, y todo junto haría un modal demasiado largo en móvil, que es donde se usa.

### 🔗 Invitaciones: separar "socio del gimnasio" de "cuenta de la app" (2026-08-22)

**El problema.** El socio dado de alta a mano tenía una cuenta inerte (correo marcador + contraseña aleatoria que nadie conoce): existía en el gimnasio pero no podía entrar. Y si entraba con Google por su cuenta, el trigger de `auth.users` le creaba **una segunda ficha** y su membresía, pagos y asistencias quedaban huérfanos en la primera.

**Decisión de arquitectura (consultada con el usuario).** Se **mantiene `clients.profile_id NOT NULL`**. El dato que la decidió: el trigger de `auth.users` crea una fila en `clients` para **cada** usuario nuevo, así que hacer `profile_id` nullable **no habría evitado** la fusión al aceptar con Google — solo habría quitado la cuenta marcador, a cambio de reescribir `admin_search_clients` (hoy `INNER JOIN`: los clientes sin perfil desaparecerían del listado y del contador), 4 servicios con `profiles!inner`, y tocar a ciegas ~25 policies RLS que **no están versionadas en el repo**.

**Vincular = repuntar `clients.profile_id`.** El historial cuelga **todo** de `clients.id` (11 tablas); de `profiles.id` solo cuelgan `clients.profile_id` y `payments.reviewed_by`. Mover el puntero conserva el 100% del historial con un solo `UPDATE`, sin migrar ni duplicar nada.

**Migración `026_client_invitations.sql`:** tabla `client_invitations` (token_hash sha256, expires_at, accepted_by, revoked_by, replaced_profile_id, attempts), índice único parcial de "una sola invitación viva por socio", RLS **solo admin** (sin policy de cliente: si un socio pudiera leer la tabla podría cosechar hashes), y 3 funciones `SECURITY DEFINER`: `client_has_history`, `create_client_invitation`, `accept_client_invitation`.

**Flujo:** admin registra + cobra → paso 3 genera la invitación → WhatsApp con `wa.me` prellenado → el socio abre la landing pública `/invitacion/[token]` → Google (recomendado) o correo → se vincula → encuentra todo su historial.

### 🧪 Verificado:
- `tsc --noEmit` limpio; `eslint src/` = **69 errores, exactamente la línea base documentada, y 0 en los archivos tocados**; `npm run build` OK con las 3 rutas nuevas registradas.
- Landing pública probada en el servidor local con un token aleatorio: **HTTP 200 sin auth** (el middleware es denylist, no hubo que tocarlo), cabeceras `Referrer-Policy: no-referrer` y `X-Robots-Tag: noindex, nofollow` aplicadas, y mensaje genérico correcto. **Degrada con gracia con la migración sin aplicar** en vez de romperse.
- Equivalencia de hash Node ↔ Postgres comprobada con el vector conocido de `"abc"` → `ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad`.

### 🔴 Agujero crítico introducido y cerrado el mismo día (2026-08-22)

Una revisión adversarial (4 revisores en paralelo + refutación de cada hallazgo) encontró **dos vulnerabilidades críticas** en el sistema de invitaciones recién aplicado. Las dos son el mismo origen: **nunca se comprobaba que la ficha destino perteneciera a una cuenta inerte.**

**El encadenamiento, verificado contra producción:**
1. Un socio se registra **él mismo** (por `/register` o con Google). Tiene ficha propia y **cero invitaciones**.
2. `getClientAccessState` deducía "activo" **solo** de si había una invitación aceptada → ese socio salía como **"Sin activar"** y la tarjeta ofrecía **"Enviar invitación"**.
3. Quien abriera ese enlace (número mal tecleado, mensaje reenviado):
   - **por Google** → `accept_client_invitation` repuntaba `clients.profile_id` y el socio legítimo se quedaba con un perfil **sin ficha**: perdía membresía, pagos, asistencias y progreso;
   - **por correo** → `acceptWithPasswordAction` hacía `admin.updateUserById` sobre la cuenta **viva**: toma de control del login, no solo de la ficha.

**La condición existía de verdad**: `andersonrua12@gmail.com` (socio auto-registrado con Google, `last_sign_in_at` 2026-08-06, 0 invitaciones) aparecía como invitable.

**El arreglo (migración 027 + código), en tres capas:**
- `public.client_account_is_claimable(client_id)`: una cuenta es reclamable solo si `auth.users.last_sign_in_at IS NULL` **y** no tiene identidades distintas de `'email'`. ⚠️ **No sirve mirar el correo marcador**: el admin puede dar de alta con el correo real del socio, y esa cuenta también es inerte. El marcador significa "sin correo propio", no "sin acceso".
- Guarda en `create_client_invitation` (no emitir) **y** en `accept_client_invitation` (no aceptar, defensa en profundidad para enlaces emitidos antes).
- Guarda en `acceptWithPasswordAction` antes del `updateUserById`, y `getClientAccessState` pasa a decidir "activa" por si la cuenta se ha usado, no por la invitación.

**Verificado después del arreglo:** invitar al socio auto-registrado → `HAS_REAL_ACCOUNT`; invitar al socio inerte creado por el admin → `CREATED`; aceptar una invitación antigua contra una cuenta real → `HAS_REAL_ACCOUNT` y la ficha intacta.

### 🔁 "¿Y si el correo ya estaba registrado?" — análisis y arreglos (2026-08-22)

Pregunta del dueño. Se mapearon los 15 escenarios de los dos caminos (Google y correo+contraseña) contra el código real, con refutación de cada riesgo.

**Respuesta: NO se sobreescribe nada.** Comprobado empíricamente contra producción: `auth.users` tiene índice único de correo y `admin.updateUserById` falla de forma **atómica**. La cuenta anterior conserva correo, contraseña e historial. La integridad nunca estuvo en riesgo — lo que fallaba era el **diagnóstico y el mensaje**.

**Y NO se debe pedir otro correo.** Ese correo es casi seguro suyo; darle otro crearía una segunda cuenta para la misma persona, justo lo que este sistema existe para evitar. Lo correcto es mandarle a entrar con la que ya tiene y **volver al enlace**.

**Cinco arreglos:**

1. **Se consultaba la tabla equivocada.** El chequeo miraba `profiles.email`, que no es la fuente de verdad del login y se desincroniza (`updateEmailAction` cambia Auth y no toca `profiles`). Daba falso negativo (dejaba pasar → error de GoTrue en inglés con consejo falso) y falso positivo (bloqueaba un correo libre). Ahora se pregunta a `auth.users` con la RPC `auth_email_owner` (migración 028).
2. **`traducirErrorAuth` no capturaba el error de correo duplicado**: GoTrue dice *"already **been** registered"* y las reglas buscan *"already registered"*. Se traduce en el punto donde sí se sabe qué significa.
3. **El mensaje ahora resuelve**: *"Ese correo ya tiene cuenta. Inicia sesión con ella y vuelve a abrir este enlace"* + botón que lleva a `/login?next=/invitacion/<token>`. `loginAction` acepta `next` **solo** si casa con `^/invitacion/[A-Za-z0-9_-]{20,}$` — no puede volverse un redirect abierto.
4. **El correo marcador ya no se puede teclear**: quedaría un login en un dominio sin MX (sin recuperación de contraseña posible) y la cuenta dejaría de ser reclamable, así que el gimnasio tampoco podría reenviar invitación. Solo se arreglaba tocando la base.
5. **Carrera de dos personas con el mismo enlace**: el perdedor recibía *"Cuenta activada. Inicia sesión manualmente"* — mentira, no tenía credenciales válidas. Ahora dice la verdad y ofrece pedir invitación nueva.

**El arreglo más caro, y no era del correo:** `handle_new_user` **no copiaba el teléfono**, así que todo socio auto-registrado quedaba con `profiles.phone = NULL` — y la única defensa antiduplicado del alta manual es `.eq("phone", phone)`. Resultado: el admin creaba una ficha **duplicada** de alguien que ya existía, **le cobraba el plan ahí**, y el socio no podía reclamarla (`ACCOUNT_HAS_DATA`): el dinero quedaba en la ficha huérfana. La migración 028 hace que el trigger copie el teléfono **canonizado igual que el alta manual**. Verificado: `+57 300 999 8877` → `3009998877`, y el alta ahora responde *"Ya existe un cliente con ese WhatsApp (…)"*.

⚠️ **Sigue abierto**: Google no entrega teléfono, así que el socio que entra con Google conserva `phone` NULL y puede duplicarse igual. La defensa pendiente es **avisar al admin de un socio con nombre parecido antes de cobrar** (ver ROADMAP).

### 🧪 Pruebas de punta a punta contra producción (con limpieza completa)

Se crearon socios de prueba, se ejercitó el flujo entero impersonando usuarios reales vía `set_config('request.jwt.claims')`, y se borró todo (0 restos).

**Camino feliz — 11/11 comprobaciones:** mismo `client_id`, `profile_id` repuntado, ficha sobrante borrada, **membresía y pago intactos**, nombre del admin por encima del de Google, teléfono copiado, correo real de Google, `accepted_by` + `attempts` registrados, `replaced_profile_id` guardado, y el socio sigue apareciendo en `admin_search_clients`.

**Defensas, todas correctas:** no-admin no puede emitir (`UNAUTHORIZED`), la cuenta del gimnasio no puede aceptar (`IS_ADMIN`), una cuenta con historial propio no puede absorber otra ficha (`ACCOUNT_HAS_DATA`), token inexistente / corto (`INVALID`), sin sesión (`UNAUTHENTICATED`), reapertura por el mismo usuario (`ALREADY_ACCEPTED`, idempotente), enlace ya usado por otro (`ALREADY_USED`), re-invitar a un socio vinculado (`ALREADY_LINKED`), regenerar mata el enlace anterior (`REVOKED`), vencido (`EXPIRED`).

**Desde fuera, con la clave anónima pública**: los cuatro intentos (leer la tabla, aceptar, crear, `client_has_history`) devuelven `permission denied`.

### 🔎 Hallazgos de la auditoría de base que corrigen la documentación

- **`enforce_exclusive_admin_role` NO EXISTE en la base.** La migración `017` nunca se aplicó. La exclusividad del rol admin se sostiene **solo desde el código** (`loginAction` y `auth/callback`, con el correo `nenesgym1508@gmail.com` incrustado). Cualquier afirmación anterior de que "el trigger lo fuerza en la base" es **falsa**.
- **El trigger de alta son DOS, encadenados**: `on_auth_user_created` (AFTER INSERT en `auth.users`) → `handle_new_user` crea **solo** `profiles`; y `on_client_profile_created` (AFTER INSERT en `profiles`, **solo INSERT**) → `handle_new_client_profile` crea `clients` con `on conflict (profile_id) do nothing`, únicamente si `role='client'`. Que sea solo-INSERT es lo que hace seguro el `UPDATE` final de `profiles` en la RPC de aceptación.
- **`attempts` solo cuenta los intentos que superan la validación del token** (no los de enlace vencido/revocado): son justo los que el admin necesita ver.
- Advisor preexistente que conviene conocer: **`create_and_approve_cash_payment` es ejecutable por `anon`** (se defiende con su `is_admin()` interno, pero está expuesta). Ninguna de las funciones nuevas lo está.

### 🧪 Verificado contra producción (proyecto `nqhkfqoroisszycdxwuy`):
Se creó y borró un socio de prueba con correo marcador. Resultado: Supabase **acepta** el dominio `@socios.nenesgym.com`; el trigger de `auth.users` crea `profiles` (con `gym_id` y `role='client'` correctos) y `clients`, pero **no copia el teléfono**; el socio aparece en `admin_search_clients`; y `auth.admin.deleteUser()` limpia en cascada sin dejar filas huérfanas.

### 📦 Archivos tocados:
- **Nuevos:** `src/lib/placeholder-email.ts`, `src/lib/auth/auth-errors.ts`, `src/components/admin/new-client-modal.tsx`
- **Modificados:** `src/actions/admin.actions.ts`, `src/actions/auth.actions.ts`, `src/schemas/client.schema.ts`, `src/app/(admin)/admin/dashboard/page.tsx`, `src/app/(admin)/admin/clientes/page.tsx`, `src/app/(admin)/admin/clientes/[id]/page.tsx`, `src/components/admin/client-search-box.tsx`
- **Sin migraciones SQL.** Plan completo en `planes/plan-alta-manual-de-clientes.md`.

### ⏭️ Qué falta:
- **Editar datos del socio / darle acceso**: pantalla para que el admin cambie nombre, celular y **correo** (`auth.admin.updateUserById` + `profiles.email`), que es lo que convierte una cuenta marcador en una cuenta real. Es la pieza que cierra el ciclo.
- **Vinculación por WhatsApp** (Fase 6 del roadmap): el paso que convierte la cuenta marcador en cuenta real. Enfoque decidido: enlace `wa.me` con el mensaje ya escrito + magic link de Supabase, sin integrar la API de Meta.

---

## 📌 Sesión 17 — 2026-08-03 (Revisión de la sección Entrenamiento: bug del recorte, rescate de la migración 023, catálogo completo a R2)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** pendiente de commit al cierre de esta entrada. `git push` sigue pendiente de autorización con la clave.

### 🎯 Contexto:
El dueño reportó que "el botón Recortar no abre la imagen" al editar un ejercicio y pidió aprovechar para revisar el resto de la sección Entrenamiento: otros bugs, problemas de rendimiento, lógica duplicada e integración con Cloudflare.

### ✅ Lo que se hizo:

**1. Bug reportado — el modal de recorte se cerraba solo**
- Reproducido en Chrome real con una página de repro aislada: el modal **sí** abría y la imagen cargaba, pero cualquier clic dentro (arrastrar el encuadre, cambiar de formato, "Confirmar recorte") cerraba el formulario entero.
- **Causa:** `ImageCropModal` se pinta con `createPortal`, que saca el nodo del DOM del padre pero **no** del árbol de React — los eventos siguen burbujeando por ahí. El portal estaba declarado dentro del `<div onClick={onClose}>` del formulario, así que todo clic del modal disparaba el cierre.
- **Arreglo** en el propio modal (`image-crop-modal.tsx`), no en cada llamador: corta la propagación en su raíz. Cubre de una vez los 4 sitios que lo usan (`exercise-form`, `client-exercise-form`, `payment-upload-form`, `exercise-image-crop-modal`).
- Verificado tras el arreglo: arrastrar, zoom, cambio de formato, "Confirmar recorte" e "Imagen completa" funcionan sin cerrar nada.

**2. Borrado prematuro de imágenes en R2 (bug de pérdida de datos)**
- `uploadExerciseImageAction` borraba la imagen anterior de R2 **en cuanto se subía la nueva**, pero la fila de la base solo se actualiza al pulsar "Guardar". Recortar y luego cancelar dejaba el ejercicio apuntando a un archivo que ya no existía → imagen rota de forma permanente.
- **Arreglo:** el borrado se movió a `updateExerciseAction` / `updateMyExerciseAction`, es decir, después de que la base deje de referenciar la imagen. Se extrajo `deleteR2ImageIfUnused()` como helper único (antes la lógica de "contar referencias y borrar" estaba duplicada en dos sitios y con criterios distintos: `<= 1` en una, `=== 0` en otra).

**3. Migración 023 rescatada del stash (riesgo de pérdida de código)**
- `023_accumulate_membership_on_renewal.sql` estaba **aplicada en producción** y documentada, pero no existía en `main`: vivía solo dentro del `git stash` del modo offline. La `024_` sí versionada depende de ella. Un entorno nuevo reconstruido desde `supabase/migrations/` se habría roto, y dropear el stash habría perdido el código de `apply_membership_purchase` y `approve_payment`.
- Se repuso en el repo con el contenido byte a byte de lo aplicado (verificado con `diff`), más las columnas `payments.client_request_id` / `occurred_at` que venían de la 022 revertida y que la 024 sigue usando. Es idempotente: reejecutarla sobre producción no cambia nada.

**4. Lógica de turnos de check-in unificada (dos copias divergidas)**
- `getCheckInShiftValidation` estaba copiada en `today-status-card.tsx` y `client-checkin-button.tsx`, y las copias **ya habían divergido**: la del botón de la pantalla de Entrada no aplicaba el tope de 2 ingresos por día. Dos pantallas del mismo flujo con reglas distintas.
- Fuente única en `src/lib/check-in-shift.ts`, con la versión correcta (la que sí aplica el tope). `ClientCheckInButton` recibe ahora `sessionsToday`. De paso reutiliza `gymSession()` de `lib/dates` en vez de recalcular el corte de las 14:00.

**5. Catálogo de imágenes 100% en Cloudflare R2**
- Se descubrió que la migración a R2 de la Sesión 16 solo movió las subidas nuevas: **de 119 ejercicios, solo 2 estaban en R2**. 104 seguían enlazados a `raw.githubusercontent.com` (que no es un CDN de imágenes, aplica rate-limit y se cayó durante la propia revisión) y 13 eran JPG de ~450 KB dentro de `/public`.
- Script nuevo versionado `scripts/migrate-exercise-images-to-r2.mjs`: descarga, convierte a WebP (máx. 1600px), sube a R2 y reapunta `media_url`. Idempotente, con `--dry-run` por defecto, backup de las URLs originales y `--rollback`.
- **Resultado: 114 migradas, 12,3 MB → 4,8 MB.** Se borró `public/exercises/` (5,6 MB menos de deploy) y `raw.githubusercontent.com` salió de `remotePatterns`.
- **3 imágenes daban 404 en GitHub** (High_Knees, Hip_Circles, Jumping_Jacks): estaban rotas en producción desde la siembra. Se pusieron a NULL (muestran el icono de respaldo) y se corrigió la migración `025` para que un entorno nuevo no las vuelva a sembrar rotas.

**6. Rendimiento de imágenes**
- Ninguna imagen del sistema pasaba por el optimizador de Next: `remotePatterns` estaba configurado pero todo se pintaba con `<img>` plano, y `next/image` estaba importado sin usar en 4 componentes.
- `ExerciseImageThumbnail`, `ExerciseDetailModal` y el detalle del selector de `class-editor` pasan ahora por `next/image`. Medido: **37 KB → 1,2 KB en AVIF** por miniatura (31×). Con ~120 ejercicios en la lista, es la diferencia entre varios MB y unos pocos cientos de KB.
- `next.config.ts`: `remotePatterns` reducido a solo R2 (se quitaron `{hostname:'*'}` para http y https — se comprobó que **no** abrían el optimizador a cualquier host, un `*` suelto solo casa un segmento, pero eran config muerta que daba la impresión contraria). Se quitó el `Cache-Control` manual sobre `/_next/static`, que era redundante y avisaba en cada arranque de dev.

**7. Otros arreglos y limpieza**
- Los editores de rutinas del admin llamaban `getExercises()` sin filtro de visibilidad → el selector mezclaba los **ejercicios personales de todos los clientes**. Ahora piden `visibility: "gym"` explícitamente (3 páginas).
- `addDays` estaba copiada **4 veces** idéntica → a `lib/dates`. `SelectField` copiada 2 veces idéntica → `components/ui/select-field.tsx` (la variante de `nueva-clase-flow` se dejó aparte a propósito: tiene otro tratamiento visual).
- La lista de columnas del `select` de `exercises`, repetida 4 veces, pasó a la constante `EXERCISE_COLUMNS`.
- Código muerto retirado: `handleAddDirect` sin usar en el selector de ejercicios, estado `imgError` sin usar, e imports de `Image`/`PageHeader` sin usar.

**8. Imágenes de ejercicio fuera del optimizador de Vercel (variantes pre-generadas)**
- Petición del dueño: no depender del cupo de imágenes de Vercel de cara al lanzamiento, porque **en TodoAquiApp ya se agotó y devolvía 402 en producción**.
- Se descartó el camino de TodoAqui (Cloudflare Image Resizing) porque es de pago y exige mover el DNS del dominio. Se descartó también, tras analizarlo, que el dominio propio ayudase con esto: **no baja el consumo de Vercel en absoluto**, son dos ejes independientes.
- Solución: cada imagen vive en R2 como **3 archivos** — original, `-thumb` (96×96) y `-detail` (1024). Se generan al subir y el histórico se cubrió con `scripts/generate-image-variants.mjs` (232/232 generadas).
- **Medido:** lista completa de ejercicios 12,3 MB (GitHub) → 4,83 MB (originales R2) → **0,25 MB** (`-thumb`). Almacenamiento extra 4,6 MB; bucket entero 9,4 MB de 10 GB gratuitos.
- El optimizador se dejó **activo** para los ~8 assets de `/public`: el cupo se cuenta por origen único, y un conjunto fijo de 8 no puede agotar nada. Apagarlo ahí solo serviría el hero de 75 KB sin encoger.
- Fallback verificado en Chrome real (variante → original → icono), para que una imagen sin variantes nunca deje un hueco. El borrado se lleva ahora original y variantes juntos.

**9. `.env.example` versionado**
- El `.gitignore` tenía `.env*` sin excepción y se tragaba la plantilla: clonar el proyecto no daba ninguna pista de qué variables hacen falta. Revisado antes de subirlo — solo marcadores de posición.

**10. El recorte de imagen no funcionaba en el navegador del dueño**
- Reportado como "no me deja subir fotos". Eran **tres fallos encadenados**, y ninguno daba error:
  1. El archivo se rechazaba (formato o tamaño) y el motivo se pintaba **al pie** de un modal con scroll → invisible. Ahora va junto al control de subida, con mensajes que dicen el peso real y detectan HEIC de iPhone. Límite del original subido de 10 a 30 MB (el navegador reescala antes de enviar, así que era hostil sin motivo).
  2. `z-[99999]` no llegaba a su navegador → el modal se pintaba **dentro** del formulario y quedaba tapado.
  3. `h-[40dvh]` tampoco → el área de recorte colapsaba a altura cero: modal "sin imagen".
- **Arreglo:** la geometría esencial del modal (posición, capa, alto) pasa a **estilo en línea**, en `vh` en vez de `dvh`. Verificado con Playwright **bloqueando la hoja de estilos entera**: sigue funcionando.
- ⚠️ **Sin resolver:** por qué a ese navegador le faltan esas reglas. Se comprobó que están en el CSS generado y que el archivo no llega truncado. Ver `LECCIONES_APRENDIDAS.md`.
- La validación estaba duplicada entre el formulario del admin y el del cliente, con el mismo bug del mensaje invisible en ambos → extraída a `validateImageFile`.

**11. Que el navegador no se quede en una versión vieja**
- `deploymentId` (desde `VERCEL_DEPLOYMENT_ID`): si el cliente detecta que su versión no coincide con la del servidor, **recarga solo**. Sin esto, una pestaña abierta durante un deploy sigue con el JavaScript viejo — es lo que provocó el error de hidratación de esta sesión.
- `staleTimes` a 0 en desarrollo: el Router Cache guardaba las pantallas 60s también en local, y al editar un componente servía la versión anterior. En producción se mantienen los 60s.
- ⚠️ Ojo: `staleTimes.static` **no admite 0** (mínimo 30). El build lo acepta sin avisar, pero Next descarta la opción entera y usa los defaults. Solo el arranque del servidor de desarrollo lo reporta.

### 📁 Archivos tocados:
`src/components/ui/image-crop-modal.tsx`, `src/components/ui/exercise-image-thumbnail.tsx`, `src/components/ui/select-field.tsx` (nuevo), `src/lib/check-in-shift.ts` (nuevo), `src/lib/dates/index.ts`, `src/actions/exercises.actions.ts`, `src/services/exercises.service.ts`, `src/components/admin/{exercise-form,exercises-list,class-editor,clases-agenda,activate-plan-modal}.tsx`, `src/components/cliente/{today-status-card,client-exercise-form,exercise-detail-modal}.tsx`, `src/components/asistencia/client-checkin-button.tsx`, `src/actions/generate-routine-draft.action.ts`, `src/app/(admin)/admin/{entrenamiento,clases/[id],rutinas/[id],rutinas/biblioteca/[id]}/page.tsx`, `src/app/(cliente)/cliente/asistencia/page.tsx`, `next.config.ts`, `scripts/migrate-exercise-images-to-r2.mjs` (nuevo), `supabase/migrations/023_accumulate_membership_on_renewal.sql` (repuesto), `supabase/migrations/025_seed_warmup_and_stretching_exercises.sql`, `public/exercises/` (borrado).

### ✅ Verificación:
- `npx tsc --noEmit` limpio. `npx next build` compila.
- Lint: 119 → 110 problemas (49 → 41 avisos). Los 69 errores restantes son todos `any` de los casts `(supabase as any)`.
- Recorte probado de punta a punta en Chrome real.
- Pipeline R2 → optimizador verificado con `curl`: 37 KB WebP → 1,2 KB AVIF, y el host retirado devuelve 400.

### ⏳ Lo que falta:
- Commit y `git push` (pendiente de la clave de autorización).
- **Dominio propio para R2:** se sigue usando la URL de desarrollo `pub-*.r2.dev`, que Cloudflare limita y desaconseja para producción.
- La deuda de `any` en services/actions y `database.types.ts` desactualizado.
- El aviso de Next 16: la convención `middleware` está deprecada a favor de `proxy`.

---

## 📌 Sesión 16 — 2026-08-03 (Modo offline construido y revertido, migración 100% a Cloudflare R2, sistema de recorte de imágenes robusto, catálogo de calentamiento/estiramiento, y optimizaciones de rendimiento)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** 17 commits locales **sin subir** a origin (`git push` pendiente de autorización con la clave). Ver lista completa en la sección de commits más abajo.

### 🎯 Contexto:
Sesión larga con un giro importante a mitad de camino: se construyó un modo offline completo, se decidió revertirlo por riesgo/alcance frente a la fecha de entrega, y se conservó solo lo que resultó ser un arreglo de bug real (no específico del offline). Después se hizo una limpieza a fondo del manejo de imágenes de ejercicios y una siembra de contenido nuevo.

### ✅ Lo que se hizo:

**1. Modo offline — construido, probado, y luego revertido (decisión del dueño)**
- Se construyó de punta a punta: Service Worker escrito a mano (Serwist no es compatible con Turbopack), shell offline en HTML estático, cola de escritura en IndexedDB con idempotencia, endpoint `/api/offline/sync`, y snapshots de lectura en localStorage.
- Se encontraron y corrigieron **2 bugs reales preexistentes** en el camino (no eran del offline, los destapó al estresar la app sin red):
  - El Service Worker inicial interceptaba *todas* las peticiones del mismo origen y hacía la app notablemente más lenta — se acotó a solo assets estáticos inmutables.
  - El middleware llamaba `supabase.auth.getUser()` en cada petición sin manejar el caso "no se pudo verificar por falta de red" — un corte de internet **cerraba la sesión del usuario** en vez de simplemente no poder confirmarla. Encontrado en 3 lugares distintos que hacían la misma llamada sin protección (`app/page.tsx`, `bienvenida/page.tsx`, `cliente/rutinas/nueva/page.tsx`).
- **Decisión de revertir:** el modo offline se salía del pedido original ("que el admin pueda cobrar en efectivo sin señal"), tocaba infraestructura global de alto riesgo (middleware de auth, Service Worker) a días de la entrega, y ya había causado 2 regresiones no triviales. Se prefirió priorizar la revisión y pulido del sistema principal.
- **Reversión:** todo el código del offline (Service Worker, shell, cola, endpoint, snapshots) se guardó en un stash de git (`backup-modo-offline-antes-de-revertir`) y se descartó del árbol de trabajo — nunca llegó a un commit, así que el revert fue limpio y sin rastro en el historial.
- **Se conservaron 2 arreglos de dinero que no eran del offline** (commit `6c0dcc9`, migración `024_simplify_cash_payment_no_offline.sql`, aplicada y verificada en producción):
  - El cobro en efectivo pasó de 2 pasos no atómicos (insertar pago + aprobar aparte, con riesgo de pagos huérfanos o duplicados si se cortaba a la mitad) a un solo RPC transaccional `create_and_approve_cash_payment`.
  - **Renovación acumulativa:** comprar un plan nuevo con días restantes en el actual ahora **suma** los días en vez de perderlos y crear una membresía solapada (bug real que ya existía en producción — ver Lección abajo).
  - `createManualPaymentAction` mantiene exactamente la misma firma pública que antes — el cambio es transparente para la UI, no se tocó ningún componente para conservar esto.

**2. Migración 100% del storage de ejercicios a Cloudflare R2 (commit `c6a3b1b`)**
- Se quitaron los últimos rastros de Supabase Storage en el flujo de ejercicios — todo el almacenamiento de imágenes (ejercicios, comprobantes de pago) queda unificado en R2.

**3. Sistema de recorte de imágenes robusto, adaptado de "TodoAquiApp" (commits `22e7d04`, `a164c8a`, `ec6ef95`, `0475190`)**
- Componente compartido `src/components/ui/image-crop-modal.tsx` (reemplaza la versión anterior específica de ejercicios).
- Se puede volver a recortar/reubicar una foto ya existente al editar un ejercicio, no solo al subir una nueva.
- Pipeline de optimización automática a WebP replicado del proyecto de referencia.
- **Fix de UX:** el modal de recorte abría con demora porque hacía un `fetch` bloqueante contra la imagen (a veces topando con CORS); ahora abre al instante. Se agregó `src/app/api/proxy-image/route.ts` como intermediario para evitar el bloqueo CORS.

**4. Renderizado de imágenes remotas — varios ajustes en cadena (commits `de1207a`, `0a2a7b7`, `94f4389`, `bc3185f`, `1c186c6`)**
- Idas y vueltas en `next.config.ts` (`remotePatterns`, `unoptimized`) hasta estabilizar la configuración de `next/image` para R2 sin mismatches de hidratación.
- Nuevo componente compartido `src/components/ui/exercise-image-thumbnail.tsx` que centraliza la lógica de qué método de renderizado usar según el dominio de la imagen (antes duplicada en 3 lugares).

**5. Catálogo de 18 ejercicios de calentamiento y estiramiento (migración `025_seed_warmup_and_stretching_exercises.sql`, commits `1fdcd36`, `c0ca3cc`, `6bb8433`)**
- 18 ejercicios nuevos en la biblioteca global del gym con instrucciones detalladas.
- 13 imágenes ilustrativas propias en `public/exercises/` (antes se dependía solo de URLs externas a `free-exercise-db`).

**6. Mejoras de UI en "Mis Ejercicios" del cliente (commits `db7b3af`, `4a4f3d7`)**
- Filtros dinámicos por Uso y Músculo.
- Reemplazo de las barras de scroll nativas por flechas laterales minimalistas en los filtros.

**7. Optimizaciones de rendimiento (⚠️ sin commitear todavía — solo en el árbol de trabajo)**
- `middleware.ts`: ya no llama a `supabase.auth.getUser()` (viaje de red) en páginas que no son ni de auth ni protegidas — antes se hacía en *cada* petición sin excepción.
- `routines.service.ts` (`getActiveRoutineForClient`): de 2 consultas secuenciales a 1 sola, usando el orden alfabético de `created_by_role` (`admin` < `client`) para priorizar la rutina asignada por el gym sin una segunda consulta.
- `layout.tsx`: `viewportFit: 'cover'` + `overflow-x-clip` (fix de safe-area/scroll horizontal en móviles).

### 🔎 Notas:
- **17 commits locales sin subir.** El repo está "ahead of origin/main by 17 commits" — nada de esto llegó a producción todavía. Falta autorización explícita con la clave para el `git push`.
- Las 3 modificaciones de rendimiento (punto 7) están sueltas en el árbol de trabajo, sin commitear — falta decidir el mensaje de commit y confirmarlo.
- Pendiente: continuar la revisión general del sistema (bugs/dinero → rendimiento → seguridad → consistencia de UI) que se había planeado antes del giro hacia el offline.

---

## 📌 Sesión 15 — 2026-07-28 (Biblioteca de rutinas públicas para clientes, favoritos de rutinas, y fixes de imágenes en dev)
**Dev:** Claude (AI Agent)
**Branch:** main

### 🎯 Pedido:
Que el admin pueda publicar rutinas de la biblioteca (`training_routines`) para que cualquier cliente las vea y se guarde una copia — sin tablas innecesarias ni romper el sistema de asignación existente.

### ✅ Lo que se hizo:

**1. Biblioteca pública de rutinas (sin tablas nuevas para el core)**
- **Migración `020_training_routines_public_library.sql`:** columna `training_routines.is_public` (default `false`) + 4 políticas RLS de **solo lectura** para clientes (`training_routines`/`_days`/`_blocks`/`_exercises`), condicionadas a `is_public = true AND is_active = true AND gym_id = current_gym_id()`. Las políticas admin (`FOR ALL`) no se tocaron.
- **Backend:** la lógica de copia de `assignTrainingRoutineToClientAction` (ya optimizada en Sesión 10) se extrajo a un helper privado `copyTrainingRoutineToClientRoutine()`, reutilizado tal cual por la nueva `saveTrainingRoutineToMyRoutinesAction(routineId)` (cliente se copia una rutina pública a "Mis rutinas", con `created_by_role: "client"`). La rutina original nunca se modifica — es una copia 100% independiente, igual que cuando asigna el admin.
- **Admin (`training-routine-editor.tsx` + `training-routines-list.tsx`):** toggle "Mostrar en biblioteca de clientes" / "Quitar de la biblioteca de clientes" en el menú de acciones (editor y lista), badge "· Pública" visible, y filtros **"Todas" / "Públicas"** en la lista de la biblioteca (`/admin/entrenamiento?tab=rutinas`).
- **Cliente (`/cliente/rutinas`):** pestañas **"Rutinas públicas"** (primera y por defecto) / **"Mis rutinas"** — la segunda queda intacta, sin cambios de comportamiento. Nueva ruta `/cliente/rutinas/biblioteca/[id]` con vista de solo lectura (reutiliza `DayTabBar`+`BlockCard` en modo `readOnly`, mismos componentes que ya usaba `RoutineDetailView`) y botón fijo "Guardar en mis rutinas".

**2. Favoritos de rutinas para clientes**
- **Migración `021_client_training_routine_favorites.sql`:** tabla nueva `client_training_routine_favorites` (bookmark simple: `client_id`, `routine_id`, `UNIQUE`) — no es una copia, solo marca. RLS: el cliente solo puede favoritar rutinas que sigan siendo públicas y activas en ese momento (misma condición que la lectura), y solo ve/borra sus propios favoritos.
- **UI:** botón de estrella en cada tarjeta de "Rutinas públicas" + filtros **"Todos" / "Favoritos"** dentro de esa pestaña.

**3. Bugfixes de imágenes en desarrollo (no relacionados al feature, aparecieron al probar)**
- **`next/image` rechazaba imágenes de R2 en dev:** el dominio sí estaba bien en `next.config.ts`, pero Next.js/Turbopack no recarga esa configuración en caliente — hacía falta borrar `.next` y reiniciar el servidor por completo. Documentado como lección para no perder tiempo la próxima vez.
- **El navegador seguía mostrando el error incluso tras reiniciar el servidor:** la pestaña ya abierta mantenía una conexión HMR viva con el bundle viejo (que traía la config de imágenes vieja embebida). Solución: cerrar la pestaña y abrir una nueva, no solo Ctrl+Shift+R.

### 🔎 Notas:
- Verificado en cada paso con `tsc --noEmit`, `eslint` (0 hallazgos nuevos) y `next build`.
- **RLS probado de punta a punta con sesiones reales simuladas** (`SET LOCAL ROLE authenticated` + JWT de un cliente real), no solo por inspección: rutina pública visible con sus 8 ejercicios, rutina no-pública invisible, insert de favorito bloqueado sobre rutina no-pública, delete de favorito propio funcionando. Todo el estado de prueba fue revertido antes de terminar — las únicas rutinas públicas que quedaron activas ("Crossfitt 1", "dn") fueron las que el propio usuario activó manualmente probando la función, no datos de prueba.

---

## 📌 Sesión 14 — 2026-07-25 (Cloudflare R2 para imágenes de ejercicios, gestión completa de Ejercicios en admin — ver/borrar/favoritos/creados por mí —, recorte de imagen con vista previa exacta, y varios bugfixes de UX)
**Dev:** Claude (AI Agent)
**Branch:** main

### 🎯 Pedido:
Sesión larga con varios pedidos encadenados: mover el storage de imágenes de ejercicios a Cloudflare R2, poder borrar/ver ejercicios desde el panel admin, agregar favoritos y "creados por mí", permitir recortar la imagen al subirla con vista previa real de cómo la ve el cliente, y arreglar bugs puntuales (números que no se dejaban borrar, splash screen redundante).

### ✅ Lo que se hizo:

**1. Cloudflare R2 como storage de imágenes/videos de ejercicios**
- Bucket `nenesgym-exercises` creado en Cloudflare R2 (cuenta `nenesgym1508@gmail.com`), con URL pública de desarrollo habilitada (`https://pub-5e1d912ef2bd446cb76d60013bb0240b.r2.dev`) y token de API de cuenta (Object Read & Write, sin expiración, scoped solo a ese bucket).
- **`src/lib/r2.ts`** (nuevo): cliente S3-compatible (`@aws-sdk/client-s3`) con `uploadToR2`, `deleteFromR2` y `r2KeyFromPublicUrl`. Variables de entorno nuevas (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `NEXT_PUBLIC_R2_PUBLIC_URL`) documentadas en `.env.example` / `.env.local.example`. **Pendiente:** rotar el token (Access Key/Secret quedaron en texto plano en el chat) y cargar las mismas 5 variables en Vercel (Production) antes del próximo deploy.
- Migradas las 2 imágenes que estaban en Supabase Storage (Crunch, Movilidad) a R2: descarga → sube → verifica 200 OK → actualiza `media_url` en `exercises` → borra el archivo viejo de Supabase. Las ~99 imágenes restantes son URLs externas a `free-exercise-db` en GitHub (nunca estuvieron en Supabase ni R2) — se dejaron igual, migrar no aporta velocidad real, solo tendría sentido si se reemplazan por fotos propias del gym.
- A partir de ahora toda subida nueva desde `ExerciseForm` va a R2, no a Supabase Storage.

**2. Panel admin: gestión completa de la sección "Ejercicios" (`exercises-list.tsx`)**
- **Ver detalle:** la imagen/nombre de cada fila ahora abre `ExerciseDetailModal` (el mismo componente que ya usa el cliente) — imagen completa + descripción, en vez de estar bloqueado a solo editar.
- **Eliminar:** `deleteExerciseAction` — borrado real (no soft-delete). 5 tablas referencian `exercises.id` con `NO ACTION` (sin cascada); si el ejercicio está en uso, Postgres devuelve `23503` y se traduce a "está en uso, desactívalo en su lugar". Si el borrado procede, también limpia el archivo en R2/Supabase (solo si ningún otro ejercicio comparte la misma `media_url`).
- **Favoritos:** el botón de encendido/apagado (activar/desactivar) se reemplazó por una estrella — **es la misma columna `is_active`** por debajo, no una nueva; el admin ya la usaba para separar "los que más uso" del resto, así que solo cambió el ícono/etiqueta. Pestañas "Todos" / "Favoritos" con el mismo estilo visual (`btn-glossy-red`) que usa el panel de clientes.
- **Creados por mí:** tercera pestaña, filtra por `source = 'manual'` (los 2 dados de alta a mano con el botón "Nuevo") vs. los 99 importados del catálogo base (`source = 'free_exercise_db'`).
- **Panel de clientes:** pestaña "Mis ejercicios" renombrada a **"Mis favoritos"** (tab, título de página `/cliente/rutinas/ejercicios`, y textos de estado vacío/descripción) — no se tocó el "Mis ejercicios" del picker del admin en `class-editor.tsx` (contexto distinto).

**3. Recorte de imagen con vista previa exacta al subir un ejercicio**
- **`ExerciseImageCropModal`** (nuevo, `react-easy-crop`) + **`src/lib/crop-image.ts`**: al seleccionar una foto en "Nuevo ejercicio" / "Editar ejercicio", se abre un recorte con el mismo contenedor (`h-56`, `object-cover`) que usa `ExerciseDetailModal` para mostrar la imagen al cliente — así lo que el admin ve al recortar es exactamente lo que verá el cliente en su celular. Aspecto fijo `375/224` (ancho de mobile típico / alto del banner de detalle).
- **Bug real encontrado y corregido:** la imagen no se mostraba nunca (ni en crear ni en editar) por un problema de **React Strict Mode** — la URL del blob (`URL.createObjectURL`) se creaba en el estado inicial pero se revocaba en la limpieza del efecto; la doble invocación de efectos que hace Strict Mode en desarrollo revocaba la URL antes de que la imagen llegara a pintarse. Se corrigió creando y revocando la URL dentro del mismo efecto (ver Lecciones Aprendidas).

**4. Bugfixes puntuales**
- **"Configuración rápida" (bulk config series/reps/descanso) no dejaba borrar los números:** `handleUpdateConfig` forzaba `null → 0` en cada tecla, así que el campo se "rellenaba solo" apenas lo vaciabas. Ahora el valor puede quedar vacío mientras se edita, y solo cae al default al confirmar.
- **Defaults universales 4 series / 12 reps / 60s descanso:** antes solo el flujo "rutina propia del cliente" tenía default (3/12/60); ahora aplica en todos lados (clases, rutinas admin y cliente) desde un solo lugar (`ExercisePicker` en `class-editor.tsx`).
- **Splash `/bienvenida`:** quitado el botón "Continuar como invitado" — apuntaba a la misma ruta que "Iniciar sesión" (`ROUTES.LOGIN`), era un duplicado sin función real.
- **Flujo de asignar rutina existente:** botón "Usar una rutina existente" con estilo rojo glossy (antes solo borde); al elegir una rutina se abre en modo vista previa con **"Regresar"** (borra la asignación temporal y vuelve a la búsqueda con el mismo cliente) y **"Confirmar"**, en vez de solo "Listo".
- **Optimización de `assignTrainingRoutineToClientAction`:** de ~15-18 operaciones secuenciales (loops anidados) a ~6-7 en paralelo (`Promise.all` + inserts en batch con `.in()`), corrigiendo la demora de ~2s al abrir una rutina asignada desde una plantilla.

### 🔎 Notas:
- Verificado en cada paso con `tsc --noEmit`, `eslint` y `next build` (todos en 0 errores nuevos).
- Pendiente de decisión del usuario: rotar el token de R2 antes de subir a producción, y cargar las variables de entorno en Vercel.

---

## 📌 Sesión 13 — 2026-07-24 (Admin: ajustar días/vencimiento de una membresía y cancelarla)
**Dev:** Claude (AI Agent)
**Branch:** main

### 🎯 Pedido:
En el perfil del cliente (admin), poder cancelar un plan, o quitarle/añadirle los días que se desee — sin depender solo de "Expandir plan" (que solo suma).

### ✅ Lo que se hizo:
- **`admin.actions.ts`:** `adjustMembershipAction({membershipId, clientId, totalDays, endDate})` — edita `total_days` y `end_date` de la membresía directamente (validado, protegido por `requireAdmin` + RLS `memberships_admin_all`). `cancelMembershipAction(membershipId, clientId)` — pone `status='cancelled'` (no borra el registro, queda en el historial).
- **`AdjustMembershipModal`** (`components/admin/adjust-membership-modal.tsx`): botón "Ajustar plan" junto a "Expandir plan"/"Rutinas". Editor de días totales (+/− y campo numérico) y fecha de vencimiento, con **vista previa en vivo** de días restantes y el badge de estado resultante (mismas fórmulas que el resto de la app). Confirmación de dos pasos para cancelar.
- **Refactor necesario:** `computeEffectiveStatus` se extrajo de `memberships.service.ts` a `@/lib/membership-status.ts` (función pura, sin `next/headers`) porque el modal es un componente cliente y `next build` rompía al importar del service (arrastraba `@/lib/supabase/server` — mismo bug de límite servidor/cliente de la Sesión 8 Parte D). El service re-exporta la función para no romper a los 4 importadores existentes.
- Verificado con `tsc`, `eslint` y `next build` (exit 0). Datos reales del cliente "Anderson" (20 días, vence 19 ago 2026) confirmados contra la BD para validar el escenario del pedido, sin escribir sobre la membresía real.

---

## 📌 Sesión 12 — 2026-07-24 (Crear contraseña en cuentas que entraron con Google)
**Dev:** Claude (AI Agent)
**Branch:** main

### 🐛 Hueco detectado:
Tras activar Google Sign-In, las cuentas creadas por ese medio **no tienen contraseña**, pero la app solo ofrecía "cambiar contraseña" exigiendo la actual — que no existe. Resultado: era imposible crear una y quedaban atadas a Google. Afectaba tanto al admin (`Más > Mi cuenta`) como al cliente (modal de perfil).

### ✅ Lo que se hizo:
- **Migración `018_current_user_has_password.sql`** (aplicada y verificada en producción): RPC `current_user_has_password()`, `SECURITY DEFINER` + `search_path=''`, otorgada solo a `authenticated` (revocada a `public`/`anon`). Lee `auth.users.encrypted_password` del propio `auth.uid()` y devuelve **solo un booleano**. Verificada simulando sesiones reales: cuenta solo-Google → `false`; cuenta con contraseña → `true`.
- **`auth.actions.ts`:** nuevas `currentUserHasPasswordAction()` y `setPasswordAction(new, confirm)`. Esta última **re-verifica en el servidor** que la cuenta no tenga ya contraseña, para que no se pueda saltar la exigencia de la actual manipulando el frontend. `updatePasswordAction` ahora revalida `ADMIN_MAS`.
- **Admin (`profile-settings-form.tsx` + `mas/page.tsx`):** tarjeta de contraseña que alterna entre *crear* (contraseña + confirmación) y *cambiar* (actual + nueva). El estado llega como prop desde el server component.
- **Cliente (`profile-form.tsx`):** misma lógica; como el form vive en un modal dentro de un client component, consulta el estado al montarse (solo al abrir el modal, sin coste en cada carga del dashboard).
- Validación en vivo de que las contraseñas coincidan y `autoComplete` correcto en ambos formularios.

### 🔎 Notas:
- Verificado con `tsc`, `eslint` y `next build` (exit 0). El aviso de prerender de `/admin/perfil` es preexistente y no fatal.
- Los tipos generados (`database.types.ts`) están desactualizados y no incluyen las RPC nuevas; se usó `(supabase as any).rpc(...)` siguiendo la convención ya presente en `clients.service.ts` / `memberships.service.ts`.

---

## 📌 Sesión 11 — 2026-07-24 (Bugfix crítico: la pasarela de pago con IA rechazaba comprobantes válidos por falso positivo del hash perceptual)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** pendiente de confirmar push (requiere clave "loki").

### 🐛 Bug reportado:
El cliente subía un comprobante **válido** y la pasarela lo rechazaba con "🚫 Comprobante ya registrado", y además le registraba un strike de fraude.

### 🔎 Diagnóstico (confirmado con datos de producción):
- El flujo antifraude de `analizar-comprobante/route.ts` tiene 3 capas: (1) hash exacto SHA-256, (2) referencia repetida, (3) hash perceptual dHash. Las dos primeras están bien; la 3ª era el bug.
- El dHash reduce la imagen a 9×8 px en gris y compara con umbral "≤8 bits sobre 64". Pero los comprobantes de Nequi comparten plantilla → al reducirlos, solo queda la plantilla idéntica. **Verificado en la BD:** dos comprobantes legítimos distintos (referencias/montos/clientes diferentes) colisionaban a distancia Hamming **3** y **8** → marcados como duplicados. Bajar el umbral no bastaba (uno estaba a distancia 3).
- Peor: cada falso positivo metía un strike → a los 2 bloqueo 24h, a los 3 bloqueo permanente. Clientes honestos quedaban bloqueados.

### ✅ Lo que se hizo:
- **Fix (`analizar-comprobante/route.ts`):** el dHash perceptual ahora **solo corre cuando la IA no pudo leer la referencia** (red de seguridad). Si hay referencia, se confía en ella + el hash exacto. Un match perceptual **ya no rechaza ni da strike** — solo baja `aiValido` para mandar el pago a revisión manual. Se separó `imagenRepetida` (exacto, bloqueo+strike) de `imagenSimilar` (perceptual, solo revisión manual). Se corrigió que la query perceptual comparaba también contra pagos ya rechazados.
- **Limpieza de daño colateral (SQL directo en producción):** reseteados a 0 strikes los 3 clientes penalizados por el bug (todos con motivo "Imagen de comprobante repetida", ninguno fraude real): Valentina Rua (estaba 2/3, a un paso del bloqueo permanente), Anderson y Anderson Escobar; y se limpió `comprobante_bloqueado_hasta`.
- Verificado con `tsc` y `eslint` sin errores.

### ⚠️ Pendiente / decisión del dueño:
- **Posible dato mal cargado:** el plan "Mensual (4 días/semana) (16 días)" está en **$7.000** (`price_cents=700000`) mientras el de 5 días está en $70.000. Si el precio real es $70.000, le falta un cero y **cualquier pago correcto se rechazaría por "monto no coincide"**. Falta que el dueño confirme el precio real para ajustarlo.

---

## 📌 Sesión 10 — 2026-07-22 (Google Sign-In activado en Supabase, rediseño de "Usar rutina existente" con vista previa, y optimización de asignación)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** pendientes de confirmar push (requiere clave "loki").

### ✅ Lo que se hizo:

**1. Login con Google activado en Supabase Auth.**
- Se guió al usuario para habilitar el proveedor Google en Supabase Dashboard (proyecto `nqhkfqoroisszycdxwuy` → Authentication → Providers → Google), pegando el Client ID/Secret ya generados en Google Cloud Console. El botón de UI y la ruta `/auth/callback` ya existían en el código (commit `74d57a8`); este paso activa el proveedor del lado de Supabase para que funcione en producción.

**2. Rediseño del flujo "Asignar rutina existente" (Asignaciones → Nueva Rutina).**
- El acceso pasó de un link discreto al pie del formulario a un botón rojo (`btn-glossy-red`) prominente arriba del paso 2 (`nueva-rutina-admin-flow.tsx`).
- El `<select>` de rutinas se reemplazó por buscador + lista (mismo patrón que el selector de cliente); click directo en una rutina la asigna, sin botón "Crear" adicional.
- **Vista previa antes de confirmar:** al seleccionar una rutina se crea la copia para el cliente y se navega a su editor (`/admin/rutinas/[id]?fromExisting=1`), pero la barra inferior muestra **"Regresar" / "Confirmar"** en vez de "Listo" (prop `previewAssignment` en `RoutineEditor`). "Regresar" borra la copia recién creada (`deleteRoutineAction`) y vuelve directo a la lista de rutinas existentes del mismo cliente (`?clientId=X&mode=existing`, nuevo prop `initialFormMode` en `NuevaRutinaAdminFlow`) para elegir otra. "Confirmar" da la asignación por buena.

**3. Eliminación rápida de ejercicios en bloques (rutinas y clases).**
- `ExerciseRow` (compartido por `class-editor.tsx`, `routine-editor.tsx` y `training-routine-editor.tsx` vía `BlockCard`) ahora tiene un botón de basurero junto al chevron de expandir, con `confirm()`, sin necesidad de desplegar la fila primero. Se quitó el botón "Quitar" duplicado que estaba dentro de la vista expandida.

**4. Optimización de rendimiento: asignar una rutina existente tardaba ~2s.**
- `assignTrainingRoutineToClientAction` copiaba día→bloque→ejercicios con un bucle `for` secuencial (un `await` a la vez) — con ~5 bloques eran ~15-18 idas y vueltas seriadas a Postgres.
- Reescrito con *fetches* `.in(...)` e *inserts* en lote (todos los días de una vez, todos los bloques de una vez, todos los ejercicios de una vez), paralelizando con `Promise.all` lo que no depende entre sí. El mapeo id-viejo→id-nuevo se hace por índice de array, confiando en que Postgres devuelve las filas de `RETURNING` en el mismo orden que el `VALUES` insertado.

### 🔎 Notas:
- Verificado con `npx tsc --noEmit` sin errores nuevos en los archivos tocados. No probado aún manualmente en navegador.

### ⏳ Pendiente:
- Commit + push de estos cambios.
- Probar en navegador el flujo de vista previa/confirmar y medir el tiempo real de asignación tras la optimización.

---

## 📌 Sesión 9 — 2026-07-17 (Optimización de rendimiento: navegación instantánea, auth admin sin duplicar, Clientes/Dashboard escalables y caché de catálogos)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** `d3d7bfd` (push a `origin/main`). Incluye también cambios previos que estaban sin commitear en el árbol de trabajo.

### ✅ Lo que se hizo:

**1. Navegación inmediata (fin del "doble clic").**
- Se quitó el header `no-store` global de páginas HTML en `next.config.ts` (desactivaba el prefetch y el Router Cache de Next → cada navegación era un ida-y-vuelta completo) y se añadió `experimental.staleTimes: { dynamic: 30, static: 180 }`.
- Feedback inmediato al tocar la barra inferior, el FAB "Entrada" y los sidebars con `useLinkStatus` (hook nativo Next 16), vía `SidebarNavLink` compartido en `bottom-nav.tsx`.
- 4 `loading.tsx` nuevos (skeletons locales): `cliente/pagos`, `cliente/progreso`, `cliente/asistencia`, `admin/asistencias`.

**2. Auth admin sin consultas duplicadas.**
- Las 12 páginas admin hacían su propio `supabase.auth.getUser()` + `profiles.select("role")` sin deduplicar con el layout. Centralizado en `requireAdminSession()` (`src/lib/auth/session.ts`) que reutiliza `getAuthenticatedSession()` cacheado con React `cache()`. Ahorro: 1 getUser de red + 1 query `profiles` por navegación admin.

**3. Clientes: búsqueda + filtros + paginación en Postgres (escala).**
- Antes se descargaban hasta 500 clientes y se filtraba en el navegador. Ahora `admin/clientes` es dirigida por `searchParams` (`?q=&status=&page=`), buscador con debounce 350ms + `useTransition`. Servicio `searchAdminClients()` → RPC `admin_search_clients` (ilike + filtro de estado date-based + LIMIT/OFFSET + `count(*) over()`). Fallback con gracia a carga completa+JS si la RPC no existiera.
- **Migración `admin_search_clients` aplicada y verificada en producción** (proyecto `nqhkfqoroisszycdxwuy`). `SECURITY INVOKER` + `search_path=public`. Archivo: `migrations/admin_search_clients.sql`.

**4. Dashboard admin: ya no descarga todos los clientes.**
- Contador "Clientes" → `countClients()` (total vía la RPC, sin traer filas). Buscador rápido (`ClientSearchBox`) consulta al servidor con debounce 300ms + descarte de respuestas viejas (`searchClientsQuickAction`).

**5. Caché de catálogos que se refresca al editar.**
- Planes (`getAvailablePlans`/`getAdminPlans`, tag `plans`) y config del gym (`getGymSettings`, tag `gym`) ya estaban cacheados; sus ediciones no refrescaban. Ahora `savePlanAction`, `setPlanActiveAction` y `updateGymSettingsAction` llaman `updateTag(...)` → el cambio del admin aparece en la próxima apertura.

### 🔎 Notas:
- No existe carrusel/scroll JS en la app; optimizaciones de ese tipo (de otro proyecto) no aplicaban.
- Validado: TypeScript, ESLint (sin errores nuevos) y build de producción. Advisors de Supabase sin advertencias nuevas por la RPC.
- Volumen real: 4 clientes (3 tipo cliente; 1 admin con fila cliente se excluye igual que el query original). La paginación es preparación para el crecimiento.

### ⏳ Pendiente:
- Optativo: alargar/quitar los temporizadores de caché (300/600s) de planes/gym para que sea estrictamente "solo al editar" (ya cubierto por `updateTag`; los timers son solo red de seguridad).

---

## 📌 Sesión 8 — 2026-07-12 (Rediseño completo del módulo Entrenamiento: Rutinas/Asignaciones/Clases, biblioteca reutilizable, y revisión general de seguridad/rendimiento)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**Parte A — Simplificación del flujo "Crear rutina" del admin.**
- `nueva-rutina-admin-flow.tsx` pasó de 3 pasos (cliente → método con 3 tarjetas grandes → formulario) a 2 pasos (cliente → mismo formulario simple que usa el cliente). Plantilla/clase existente quedó como link secundario discreto ("¿Prefieres partir de una rutina o clase existente?") que reemplaza el formulario en vez de una pantalla propia.
- `createRoutineAction` (admin) ahora escala N días según `days_per_week` igual que `createClientRoutineAction`, corrigiendo que siempre creaba un solo "Día 1".
- Modal "Editar Datos" del editor de rutina unificado: el campo Objetivo usa `ChipSelect` + vocabulario simple en ambas variantes (`admin` y `client-own`), eliminando el `<select>` técnico heredado de Clases para admin.

**Parte B — Rediseño arquitectónico: modelo Rutina → Asignación → Clase.**
- **Migración de datos** (`011_training_routines.sql`, aplicada contra producción con confirmación explícita del usuario): renombre `routine_templates`→`training_routines` (+ 3 tablas hijas y columnas FK homologadas al patrón de `client_routine_*`), columnas de trazabilidad `source_routine_id`/`source_routine_day_id` en `daily_classes`, ampliación del CHECK `client_routines.source_type` con `'training_routine'`, y migración de los 2 `class_templates` existentes hacia `training_routines` de 1 día (verificado con SQL directo: datos y ejercicios preservados).
- **`/admin/entrenamiento`** pasó de hub de 3 tarjetas a un shell con 3 tabs persistentes (Rutinas / Asignaciones / Clases vía `?tab=`), con `EntrenamientoTabs`.
- **Tab Rutinas (biblioteca):** `training-routines.actions.ts`/`.service.ts` (backend nuevo), `TrainingRoutineEditor` (Día→Bloque→Ejercicio + menú Asignar a cliente/Programar en clase/Duplicar/Archivar/Eliminar), `TrainingRoutinesList` (buscador + contadores de asignaciones/clases programadas + `ActionMenu` con soporte de mantener-pulsado vía `ContextMenu` de base-ui). Rutas `/admin/rutinas/biblioteca` y `/admin/rutinas/biblioteca/[id]`.
- **`RoutineBasicForm`** extraído como componente compartido (nombre/días/objetivo/opciones avanzadas), usado por cliente, asignación admin y biblioteca — una sola fuente de verdad para el formulario.
- **Tab Asignaciones:** `RoutinesList` reutilizado, con filtro nuevo "Sin rutina" (`getClientsWithoutRoutine`) y accesos "Ver perfil"/"Asignar otra rutina" sin re-preguntar el cliente (`?clientId=` en `/admin/rutinas/nueva`).
- **Tab Clases:** agenda vertical de 14 días (`ClasesAgenda`, reemplaza las secciones fijas Hoy/Mañana/Esta semana) con soporte para **varias rutinas programadas el mismo día** (`getDailyClasses` por rango en vez de una sola por fecha). Flujo `nueva-clase-flow.tsx` reescrito: buscar/elegir rutina existente → elegir día si es multi-día → hora/notas → `scheduleTrainingRoutineAsClassAction`; "Crear rutina nueva" y "Generar automáticamente" quedaron como opciones secundarias.
- **Generador:** `generate-routine-draft.action.ts` reemplaza a `generate-class.action.ts` — ahora crea un **borrador de rutina** en la biblioteca (no una clase directa), que se revisa en el editor normal antes de asignar/programar.
- **Limpieza:** eliminado el sistema viejo de "Plantillas" (clase y rutina) completo — componentes, actions, rutas `/admin/clases/plantillas` y `/admin/rutinas/plantillas` — sin links muertos en nav.
- Verificado con `npx tsc --noEmit` y `npx next build` (32 rutas) limpios en cada fase.

**Parte C — Ajustes post-entrega guiados por uso real.**
- Corrección: `getAdminRoutines`/`getClientsWithoutRoutine` filtraban por error rutinas `created_by_role='client'` en la vista de Asignaciones del admin — ahora solo `created_by_role='admin'`.
- Nueva sección `/admin/clientes/[id]/rutinas` (página aparte, no inline en el perfil): rutinas asignadas por el admin + rutinas creadas por el cliente con botón "Guardar en biblioteca" (`saveAsTrainingRoutineAction`) para reutilizarlas. Acceso vía botón "Rutinas" junto a "Auto"/"Activar plan" en el perfil.
- Dashboard (`/admin/dashboard`): buscador de clientes con resultados desplegables (`ClientSearchBox`), botón "Registrar pago" (→ `/admin/clientes`, ya que no existe flujo de pago sin cliente seleccionado), y "Pagos por aprobar" convertido en `PendingPaymentsPreview` con aprobación de un clic + expandir detalles (método de pago, comprobante, análisis IA) reutilizando `PendingPaymentCard`.
- `ClientsList` extraído a componente cliente con buscador por nombre/email en `/admin/clientes`.

**Parte D — Bug crítico de límite servidor/cliente (Next.js App Router).**
- **Síntoma:** `Build Error` — "You're importing a module that depends on 'next/headers' ... in the Pages Router" al tocar `/admin/clientes`.
- **Causa:** `clients-list.tsx` (`"use client"`) importaba `computeEffectiveStatus` desde `memberships.service.ts`, que en su cabecera importa `createClient` de `@/lib/supabase/server` (usa `next/headers`). Cualquier import de ese archivo —aunque sea una función pura— arrastra código server-only al bundle del cliente.
- **Solución:** mover el cálculo de `effectiveStatus`/`remainingDays` al Server Component (`clientes/page.tsx`), pasando solo los valores ya calculados como props planas. `tsc` no detecta esta clase de error (es un límite de bundler, no de tipos) — solo `next build` lo confirma.

**Parte E — Revisión general de seguridad y rendimiento del sistema admin.**
- **Bug real encontrado:** `scheduleTrainingRoutineAsClassAction` podía violar el CHECK de `daily_classes.objective` si la rutina tenía objetivo en vocabulario cliente (ej. `"ganar_musculo"`), ya que esa columna solo acepta vocabulario técnico de clases. Se agregó una tabla de traducción (`CLIENT_GOAL_TO_CLASS_OBJECTIVE`), verificada contra el CHECK real de la tabla vía SQL.
- **Bug:** la hora elegida al programar una clase se descartaba silenciosamente (`daily_classes` no tiene columna de hora) — ahora se preserva anteponiéndola a las notas.
- **Bug de UX:** en `PendingPaymentsPreview`, `useTransition` (booleano) deshabilitaba todos los botones "Aprobar" a la vez al procesar uno solo — corregido con un `approvingId` específico.
- **Seguridad:** guard `requireAdmin` centralizado (`src/lib/auth/require-admin.ts`), aplicado como defensa en profundidad a las 8 acciones de `training_routines` (crear/editar/borrar/duplicar/asignar/programar/guardar), reemplazando la duplicación de la misma lógica inline en `admin.actions.ts`.
- **Rendimiento:** `ClasesAgenda` pasó de 14 consultas (una por día) a 1 sola con rango de fechas; `getDailyClassWithBlocks` eliminó su N+1 (una consulta por bloque) con un solo select anidado.
- **Limpieza:** borrados 2 scripts temporales de benchmark (`.tmp-test-*.mjs`) que quedaron en la raíz del repo.
- **Análisis con la skill `junta-directiva`** sobre los 5 hallazgos de los advisors de Supabase (`rls_auto_enable` ejecutable por anon, bucket `exercises` con listado público, protección de contraseñas filtradas desactivada, 2 tablas con RLS sin policy): veredicto **no aplicar ninguno** — verificado que `rls_auto_enable` no es explotable por diseño de Postgres (requiere contexto de event trigger), el bucket tiene 0 archivos y es público por diseño, y el registro usa `admin.createUser` (omite la validación de contraseñas de todos modos). Acta completa en `skills/junta-directiva/memory/2026-07-12-advisors-seguridad-db.md`.

### 📊 Resumen de Impacto:
- ✅ Modelo de datos consolidado: una sola tabla de biblioteca (`training_routines`) reemplaza dos sistemas de "plantillas" duplicados.
- ✅ Flujo de creación de rutina igual de simple para admin y cliente.
- ✅ Admin puede asignar, programar y reutilizar rutinas desde un solo lugar, incluyendo las que crean los propios clientes.
- ✅ Agenda de clases soporta múltiples rutinas por día.
- ✅ 3 bugs reales corregidos (objetivo inválido al programar, hora perdida, botones de aprobar mal deshabilitados) antes de que impactaran producción.
- ✅ Rendimiento de la agenda de clases mejorado (14 queries → 1).
- ✅ Decisión de seguridad de infraestructura documentada y justificada (no se tocó producción sin necesidad real).

### 🔧 Archivos modificados (principales):
```
supabase/migrations/011_training_routines.sql          - migración de datos (nueva)
src/actions/training-routines.actions.ts                - backend biblioteca (nuevo)
src/services/training-routines.service.ts               - backend biblioteca (nuevo)
src/actions/generate-routine-draft.action.ts            - generador → borrador de rutina (nuevo, reemplaza generate-class.action.ts)
src/lib/auth/require-admin.ts                            - guard de admin centralizado (nuevo)
src/components/admin/training-routine-editor.tsx         - editor de rutina biblioteca (nuevo)
src/components/admin/training-routines-list.tsx          - listado biblioteca (nuevo)
src/components/admin/entrenamiento-tabs.tsx               - tabs del shell (nuevo)
src/components/admin/clases-agenda.tsx                    - agenda 14 días (nuevo)
src/components/admin/nueva-rutina-biblioteca-flow.tsx     - crear rutina biblioteca (nuevo)
src/components/admin/client-routines-section.tsx          - sección rutinas del cliente (nuevo)
src/components/admin/clients-list.tsx                      - buscador de clientes (nuevo)
src/components/admin/client-search-box.tsx                 - buscador dashboard (nuevo)
src/components/admin/pending-payments-preview.tsx          - aprobar pagos desde inicio (nuevo)
src/components/routine/routine-basic-form.tsx              - formulario compartido (nuevo)
src/app/(admin)/admin/entrenamiento/page.tsx               - shell de 3 tabs
src/app/(admin)/admin/rutinas/nueva/page.tsx               - soporte ?clientId=
src/app/(admin)/admin/clientes/[id]/rutinas/page.tsx       - página nueva
src/app/(admin)/admin/clases/page.tsx                      - agenda en vez de Hoy/Mañana
src/app/(admin)/admin/dashboard/page.tsx                   - buscador + registrar pago + aprobar pagos
src/actions/routines.actions.ts                            - createRoutineAction escala N días
src/actions/admin.actions.ts                                - usa requireAdmin compartido
src/services/routines.service.ts                            - filtro created_by_role='admin'
src/services/classes.service.ts                             - getDailyClasses por rango, sin N+1
src/components/admin/routine-editor.tsx                     - Objetivo unificado, accesos cliente
src/components/admin/class-editor.tsx                       - guardar en biblioteca (no plantilla)
src/components/ui/action-menu.tsx                            - soporte ContextMenu (mantener pulsado)

Eliminados: routine-templates.actions.ts, routine-templates.service.ts,
routine-template-editor.tsx, routine-templates-list.tsx, templates.actions.ts,
templates.service.ts, templates-list.tsx, template-editor.tsx,
generate-class.action.ts, admin/clases/plantillas/*, admin/rutinas/plantillas/*,
.tmp-test-compare.mjs, .tmp-test-nested-query.mjs
```

---

## 📌 Sesión 7 — 2026-07-10 (MVP: Bloques simplificados, edición inline de títulos, clasificación automática de ejercicios por uso, vista simplificada para clientes)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**Parte A — Simplificación de bloques por defecto.**
- Cambio en `STANDARD_BLOCK_TITLES` en `routines.actions.ts` y `routine-templates.actions.ts`: al crear rutina nueva o plantilla, solo se generan 2 bloques (Calentamiento + Trabajo principal), sin Complementarios ni Estiramiento.
- **Razón:** Reducir complejidad inicial para usuario MVP.

**Parte B — Edición inline de títulos de bloques (sin `window.prompt()`).**
- Reemplazo de `window.prompt()` por input inline en `routine-editor.tsx` y `routine-template-editor.tsx` (no soportado en Next.js/Turbopack).
- Componente `BlockCard` ahora soporta `editingTitle`, `editTitleValue`, `onChangeTitleValue`, `onSaveTitle`, `onCancelTitle`.
- Añadido ícono de lápiz (Pencil) junto al nombre del bloque para indicar que es editable.
- **Archivos:** `class-editor.tsx` (component), `routine-editor.tsx` y `routine-template-editor.tsx` (UI).

**Parte C — Clasificación automática de 99 ejercicios por uso.**
**Problema:** Filtro "Uso" (Calentamiento/Principal/Complementario/Estiramiento) devolvía 0 resultados porque `usage_tags` estaba vacío en todos los ejercicios.

**Solución:**
1. Migración `010_backfill_exercise_usage_tags.sql` con reglas basadas en `exercise_type`:
   - `cardio` → `['calentamiento', 'complementario']`
   - `fuerza` → `['trabajo_principal', 'complementario']`
   - `movilidad` → `['calentamiento', 'estiramiento']`
   - `tecnica` → `['trabajo_principal']`
   - `estiramiento` → `['estiramiento']`
   - Sin tipo → fallback `['trabajo_principal']`
   - **Resultado:** 100% de ejercicios clasificados (99 total: 6 cardio, 91 fuerza, 2 técnica).

2. Nueva función `getEffectiveUsageTags()` en `types/exercise.ts`:
   - Fallback defensivo: si `usage_tags` está vacío, deriva automáticamente desde `exercise_type`.
   - Garantiza que ejercicios nuevos (creados sin completar tags) nunca se ocultan.
   - Usado en filtro del `ExercisePicker`.

**Parte D — Vista simplificada para clientes (UX reduction).**
**Problema:** Cliente se confunde con término "Complementario" (muy técnico).

**Solución:**
- Nueva prop `simplifiedUsage` en `ExercisePicker` (clase-editor.tsx).
- Cuando activa (`simplifiedUsage=true`):
  - Filtro "Uso" solo muestra: **Todos / Calentamiento / Principal / Estiramiento** (sin Complementario).
  - Ejercicios con tag `complementario` aparecen bajo filtro "Principal" (junto a `trabajo_principal`).
- Panel admin/profe conserva filtro completo (ve "Complementario" para organizar clases).
- Activación: `routine-editor.tsx` pasa `simplifiedUsage={variant === "client-own"}`.
- **Base de datos sin cambios:** conserva los 4 tags normales.

**Parte E — Empty state mejorado en filtro "Uso".**
- Cuando el filtro de Uso no tiene resultados: "No tienes ejercicios de este tipo todavía."
- Botón "Explorar todos" limpia el filtro y cambia a scope "all".
- Mantiene botón "+ Crear ejercicio nuevo" visible.

### 📊 Resumen de Impacto:
- ✅ Filtro "Uso" funcional: buscar Calentamiento/Principal/Estiramiento devuelve resultados.
- ✅ UX simplificada para cliente: menos opciones, menos términos técnicos.
- ✅ Admin/profe sin cambios: ve todo control completo.
- ✅ Escalable: nuevos ejercicios se clasifican automáticamente por `exercise_type`.

### 🔧 Archivos modificados:
```
src/types/exercise.ts
  - USAGE_TAG_FALLBACK_BY_TYPE (mapeo exercise_type → usage_tags)
  - getEffectiveUsageTags()

src/components/admin/class-editor.tsx
  - BlockCard: ícono de lápiz junto a título
  - ExercisePickerProps: prop simplifiedUsage
  - SIMPLIFIED_USAGE_OPTIONS (sin Complementario)
  - Lógica: "Principal" incluye "complementario" cuando simplifiedUsage=true
  - Empty state mejorado para filtro "Uso"

src/components/admin/routine-editor.tsx
  - State: blockTitleEdit, blockTitleValue
  - Reemplazar prompt() con input inline
  - ExercisePicker: simplifiedUsage={variant === "client-own"}

src/components/admin/routine-template-editor.tsx
  - Mismo cambio que routine-editor.tsx

src/actions/routines.actions.ts
  - STANDARD_BLOCK_TITLES: solo ['Calentamiento', 'Trabajo principal']

src/actions/routine-templates.actions.ts
  - STANDARD_BLOCK_TITLES: solo ['Calentamiento', 'Trabajo principal']

supabase/migrations/010_backfill_exercise_usage_tags.sql
  - Backfill de 99 ejercicios con clasificación automática
```

### ⏳ Pendiente:
- [ ] Traducción de "complementario" → otro término si se decide mostrar a clientes en futuro.
- [ ] Testing: verificar filtro "Uso" en otros pickers (template-editor, class-editor).
- [ ] QA: probar flujo completo cliente (crear rutina → filtrar ejercicio).

---

## 📌 Sesión 6 — 2026-07-09 (Rendimiento de Rutinas, paridad de bloques, biblioteca personal de ejercicios y rediseño del picker "Añadir ejercicio")
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**Parte A — Rendimiento del módulo Rutinas (N+1 queries).**
El usuario reportó que `/cliente/rutinas` y el detalle de una rutina cargaban lento y sin fluidez. Causa raíz: `getRoutineWithDays` (`routines.service.ts`) y `getRoutineTemplateWithDays` (`routine-templates.service.ts`) resolvían días → bloques → ejercicios con `for` anidados, haciendo un `await` secuencial por cada bloque y por cada ejercicio — para una rutina de 4 días x 4 bloques eran ~10 round-trips seguidos a Supabase (medido en producción: 2-3s). Se reemplazaron por una única consulta con `select` anidado (`client_routine_days -> blocks:client_routine_blocks -> exercises:client_routine_exercises`) usando `.order(col, {referencedTable})` en cada nivel, bajando a ~0.4-0.7s (medido con script de comparación antes/después contra el proyecto real, luego descartado). Sin cambios de esquema.
- **Detectado pero no corregido (fuera de alcance de esta sesión):** `src/middleware.ts` llama `supabase.auth.getUser()` en cada request (red hacia el servidor de Auth), y `getCurrentClientData()` vuelve a llamarlo dentro de cada página server — dos round-trips de auth por navegación. Es probablemente la siguiente palanca de rendimiento más grande; queda pendiente para una sesión futura.

**Parte B — Rutinas del cliente: paridad de bloques con el admin.**
Bug: al añadir un día nuevo (`addRoutineDayAction` / `addRoutineTemplateDayAction`), el servidor sí creaba los 4 bloques estándar (Calentamiento/Trabajo principal/Complementarios/Estiramiento) pero el estado local de React seguía mostrando el día con `blocks: []` hasta refrescar la página. Fix: las acciones ahora devuelven los bloques creados (`.select("id, title, position")`) y `routine-editor.tsx` / `routine-template-editor.tsx` los usan al construir el día optimista en el estado.
Además, por pedido explícito del usuario, se **eliminó la vista "aplanada" simplificada** que tenían las rutinas propias del cliente (`variant="client-own"` en `RoutineEditor`) — ahora usa exactamente la misma UI de bloques que el admin (crear/renombrar/reordenar bloques, `+` por bloque). `createClientRoutineAction` (`routines.actions.ts`) pasó de scaffoldear un único bloque "Ejercicios" a los 4 bloques estándar por día, igual que el flujo admin.

**Parte C — Biblioteca personal de ejercicios del cliente (feature nueva).**
Objetivo: que el cliente pueda elegir qué ejercicios de la biblioteca global usar, y crear ejercicios propios y privados, sin duplicar los 99 registros existentes ni exponer los privados de un cliente a otro.
- **Migración `supabase/migrations/008_client_exercise_library.sql`** (aplicada vía MCP): agrega a `exercises` las columnas `visibility` (`gym`/`client`), `owner_client_id` (FK a `clients`) y `created_by_role`, con constraint de consistencia (`visibility='gym' ⟺ owner_client_id IS NULL`). Nueva tabla `client_exercise_library` (`client_id, exercise_id, is_active, is_favorite`, `UNIQUE(client_id, exercise_id)`). La policy `select_exercises_authenticated` (creada en la migración 005) se **reemplazó** porque daba lectura sin restricción a cualquier autenticado del gym — con ejercicios privados eso habría filtrado la biblioteca de un cliente a otro; la nueva versión exige `visibility='gym'` o ser el dueño. Nuevas policies de INSERT/UPDATE/DELETE para que un cliente solo pueda escribir sus propios ejercicios, y policies equivalentes para `client_exercise_library`.
- **`src/services/exercises.service.ts`**: `getExercises` gana filtro opcional `visibility`; nuevas `getMyCreatedExercises`, `getMyLibrary`, `getMyExerciseIds`.
- **`src/actions/exercises.actions.ts`**: nuevas `createMyExerciseAction`, `updateMyExerciseAction`, `deleteMyExerciseAction` (soft-delete vía `is_active=false`, mismo patrón que `toggleExerciseAction` del admin — nunca se borra físicamente porque `client_routine_exercises.exercise_id` no tiene `ON DELETE CASCADE`), `addToMyLibraryAction`, `removeFromMyLibraryAction`. `uploadExerciseImageAction` se amplió de admin-only a admin+client (el bucket de Storage ya permitía subir a cualquier autenticado; solo la acción lo bloqueaba).
- **Nuevos componentes cliente:** `client-exercises-manager.tsx` (pantalla `/cliente/rutinas/ejercicios`, 3 tabs: Mis ejercicios / Explorar todos / Creados por mí) y `client-exercise-form.tsx` (crear/editar ejercicio propio: nombre, músculo, equipo, descripción, imagen por archivo o URL manual — deliberadamente más chico que el `ExerciseForm` del admin, no un flag de modo sobre el mismo).
- **`ExercisePicker`** (`class-editor.tsx`): nuevo prop opcional `myExerciseIds` que activa un toggle "Mis ejercicios / Explorar todos" dentro del modal — 100% aditivo, los otros 3 usos del componente (Clases, Plantillas de clase, Plantillas de rutina) no lo pasan y no cambian. `RoutineEditor`: `onCreateNew` del picker dejó de estar condicionado a `variant === "admin"` — ahora también el cliente puede crear un ejercicio propio desde dentro del editor de su rutina (abre `ClientExerciseForm` en vez de `ExerciseForm`), revirtiendo intencionalmente el bloqueo del Bug 4 documentado en `planes/plan-fixes-modulo-rutinas.md`, ahora resuelto de raíz con permisos propios.
- **Regla de negocio acordada con el usuario (vía pregunta explícita):** si un cliente añade a mano desde "Explorar todos" un ejercicio que el admin tiene inactivo, sigue apareciendo en "Mis ejercicios" — la elección explícita del cliente siempre gana sobre el estado del admin.

**Parte D — Ajustes de comportamiento por defecto de la biblioteca (varias iteraciones con el usuario).**
- "Explorar todos" (tanto en `/cliente/rutinas/ejercicios` como dentro del picker "Añadir ejercicio" de una rutina) muestra el catálogo completo del gym — activos e inactivos, presentes y futuros (`getExercises({ includeInactive: true })`; el picker dentro de la rutina usaba antes `getExercises()` sin este flag y solo mostraba los ~20 activos, corregido en `src/app/(cliente)/cliente/rutinas/[id]/page.tsx`).
- "Mis ejercicios" usa un modelo **default + override**: por defecto son los que el admin tiene activos ahora mismo; una fila explícita en `client_exercise_library` (añadir o quitar) siempre gana sobre ese default, sin importar lo que el admin haga después. `getMyLibrary`/`getMyExerciseIds` implementan esto con `overrides.get(id) ?? exercise.is_active`.
- El botón "✓ Añadido" en "Explorar todos" ahora es clicleable (antes era un `<span>` estático): al tocarlo (o pasar el mouse en desktop, que lo cambia a "✕ Quitar" en rojo) quita el ejercicio de la biblioteca sin tener que ir a la pestaña "Mis ejercicios".
- Texto explicativo corto debajo de los tabs, distinto por pestaña (`TAB_DESCRIPTIONS` en `client-exercises-manager.tsx`).

**Parte E — Simplificación de "Nueva Rutina" para MVP.**
Pedido explícito: que cualquier cliente pueda crear una rutina básica en menos de 1 minuto. En `nueva-rutina-flow.tsx`: quedan visibles solo Nombre, días por semana, Objetivo y el botón "Crear rutina"; "Opciones avanzadas" se redujo a Nivel (con "General" preseleccionado, antes vacío) y Notas — se **eliminó** el campo Descripción del flujo de creación (sigue existiendo en el modal "Editar datos" del editor, fuera de este alcance). Etiqueta de objetivo actualizada: "Bajar de peso" → "Bajar grasa" (`CLIENT_ROUTINE_GOAL_LABELS` en `types/routine.ts`, cambio de texto únicamente, no toca el valor `bajar_peso` guardado en base de datos).

**Parte F — Rediseño del picker "Añadir ejercicio" (`ExercisePicker`).**
- **Tap targets separados:** tocar la imagen, el nombre o el ícono de info abre un detalle; tocar "+" añade directo sin abrir nada — antes ambos (nombre y "+") ejecutaban la misma acción de añadir, y la imagen no hacía nada.
- **Nuevo detalle del ejercicio** (`ExerciseDetailSheet`, bottom sheet apilado sobre el picker): imagen grande, nombre, chips de músculo/equipo/tipo, descripción (`instructions`) y botón "Añadir a la rutina". Reemplaza el expandir-en-línea que solo mostraba texto.
- **Filtros:** se agregó "Uso" (Calentamiento/Principal/Complementario/Estiramiento) como filtro primario nuevo, y "Músculo" pasó de mostrar todos los grupos presentes en los datos a una lista curada y fija (Pecho/Espalda/Pierna/Glúteo/Cardio) para no saturar el modal. Se ocultó la scrollbar blanca visible en la fila de chips (`FilterRow` no tenía las clases de scrollbar oculta que sí usa el resto del modal). "Filtros" secundario sigue con Equipo y Tipo sin cambios.
- **Migración `supabase/migrations/009_exercise_usage_tags.sql`** (aplicada vía MCP): nueva columna `usage_tags TEXT[]` en `exercises` (un ejercicio puede tener varias etiquetas, ej. bicicleta estática = calentamiento + cardio), con constraint `<@ ARRAY[...]` limitando los valores válidos. Se agregó el selector de chips múltiples correspondiente tanto en `ExerciseForm` (admin) como en `ClientExerciseForm` — sin esto el filtro "Uso" no tendría nada que mostrar. **No se retro-etiquetaron los 99 ejercicios existentes** — quedan con `usage_tags: []` hasta que se editen manualmente o se pida un script de backfill.

**Verificación (todas las partes):** `npx tsc --noEmit` limpio después de cada cambio (no se corrió `npm run build` para no interferir con el servidor `npm run dev` que el usuario tenía abierto en vivo probando cada iteración). Verificado también contra la base de datos real vía Supabase MCP (`list_tables`, `execute_sql`, `get_advisors` sin alertas nuevas tras las migraciones 008 y 009).

### ⏳ Pendiente:
- Doble llamada a `auth.getUser()` por request (middleware + `getCurrentClientData()`) — ver nota de Parte A, no se tocó esta sesión.
- QA de aislamiento RLS de `client_exercise_library` y de los ejercicios privados con dos cuentas de cliente reales (mismo patrón que el checklist S1 pendiente del módulo Rutinas original).
- Backfill de `usage_tags` en los 99 ejercicios existentes, si se decide que vale la pena antes de que el admin los vaya etiquetando manualmente.
- Confirmar visualmente en el navegador (el usuario ya venía probando en vivo durante la sesión, pero no hubo una pasada final end-to-end después del último cambio — el rediseño del picker con detalle + filtros "Uso"/"Músculo").

---

## 📌 Sesión 5 — 2026-07-08 (Estatura pre-rellenada en nueva medición de Progreso)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

En `/cliente/progreso`, el modal "Nueva medición" pedía Estatura vacía cada vez, aunque no cambia día a día (a diferencia del peso). Ahora se pre-rellena con la estatura del registro más reciente del cliente cuando se abre el formulario para una medición nueva (no aplica cuando se está editando la medición de hoy, que ya usa sus propios valores).

- **`src/app/(cliente)/cliente/progreso/page.tsx`**: pasa `latestHeightCm={latest?.height_cm}` a `ProgressForm` (`latest` ya era `records[0]`, el registro más reciente, ordenado por `measured_date desc` en `getClientProgress`).
- **`src/components/cliente/progress-form.tsx`**: nueva prop `latestHeightCm`; se usa como `defaultValues.height_cm` solo cuando no hay `todayRecord` (medición nueva, no edición).

**Verificación:** `npm run build` — compilación y chequeo de TypeScript exitosos.

---

## 📌 Sesión 4 — 2026-07-08 (Detalle expandible de ejercicios con imagen + descripción, y objetivo "Otro" con texto libre)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**Parte A — Detalle expandible de ejercicios dentro de una rutina.**

Antes, al tocar un ejercicio dentro de una rutina de solo lectura (asignada por el profe) no pasaba nada — el tap estaba deshabilitado (`disabled={readOnly}`). En modo edición sí expandía, pero solo mostraba los campos editables (series/reps/descanso), sin imagen ni descripción.

- **`ExerciseRow`** (`src/components/admin/class-editor.tsx`, compartido por Clases y Rutinas): ahora expande en el mismo lugar (sin modal ni pantalla nueva) tanto en modo lectura como en modo edición. Al expandir siempre se muestra: imagen grande (`media_url`, con placeholder de ícono si no hay imagen) y la Descripción (`instructions`). La grilla editable de Series/Reps/Descanso/Peso/Nota solo aparece cuando `!readOnly` — sin cambios de comportamiento para el editor del admin más allá de sumarle la imagen/descripción.
- **Verificado, sin cambios necesarios:** las queries (`routines.service.ts`, `routine-templates.service.ts`) y los tipos (`RoutineExercise` en `types/routine.ts`) ya traían `media_url`, `instructions`, `muscle_group`, `secondary_muscle_groups`, `equipment`, `exercise_type` desde antes.
- **Descripciones de los 99 ejercicios de la biblioteca:** se revisó el estado real en producción — las 99 filas ya tienen `instructions` con contenido (ninguna vacía), en un tono simple, claro y sin jerga médica ni lenguaje de "cuerpo ideal" (ej. *"Acuéstate boca arriba... Mantén el abdomen contraído durante todo el movimiento."*), que ya cumple lo pedido. **No se reescribió nada** — reescribir 99 descripciones que ya cumplen el estándar hubiera sido trabajo redundante con riesgo de bajar la calidad actual.

**Parte B — Objetivo "Otro" con texto libre.**

El dueño del gym pidió que el cliente pueda escribir su propio objetivo si ninguno de los 5 chips le queda.

- **Decisión de modelo de datos** (ver hilo de aprobación): se descartó dejar `goal` completamente libre (el sistema bloqueó automáticamente ese primer intento por ser un cambio de validación irreversible en producción sin confirmación explícita). En su lugar: `goal` sigue siendo una lista controlada (útil para filtros/estadísticas futuras) con un valor nuevo `'otro'`, y el texto real que escribe el cliente se guarda en una columna nueva y separada `custom_goal` (nullable, no vacío si existe, máximo 60 caracteres — validado tanto en la base de datos como en la action).
- **Migración `007_add_custom_goal_column.sql`** (aplicada en producción): agrega `'otro'` al `CHECK` de `goal` y la columna `custom_goal` con su propio `CHECK`, en `client_routines` y `routine_templates`.
- **`src/types/routine.ts`**: `'otro'` agregado a `ClientRoutineGoal`/`CLIENT_ROUTINE_GOAL_LABELS`; `custom_goal` agregado a `ClientRoutine`; nueva función `formatRoutineGoal(goal, customGoal)` que muestra el texto personalizado cuando `goal === 'otro'`, y si no, la etiqueta traducida normal — reemplaza los `ROUTINE_GOAL_LABELS[...] ?? ...` repetidos en 6 archivos.
- **`nueva-rutina-flow.tsx`** y **`routine-editor.tsx`** ("Editar datos", solo `variant === "client-own"`): chip "Otro" que revela un input de texto (máx. 60 caracteres) cuando se selecciona; el botón de guardar queda deshabilitado si se elige "Otro" sin escribir texto.
- **`routines.actions.ts`**: `custom_goal` se propaga en `createClientRoutineAction`, `updateRoutineMetaAction`, `duplicateRoutineAction`, `createRoutineFromTemplateAction` y `saveRoutineAsTemplateAction` (para que no se pierda al duplicar una rutina o convertirla en plantilla).
- **`src/types/database.types.ts`**: regenerado desde Supabase (vía MCP) para incluir `custom_goal` — el primer build falló con `Type 'string | null' is not assignable to type 'never'` porque los tipos locales no conocían la columna nueva, síntoma ya documentado en `LECCIONES_APRENDIDAS.md` (Lección #3).

**Verificación:** `npm run build` — compilación y chequeo de TypeScript exitosos, 30 rutas generadas sin errores (dos corridas: una falló por tipos desactualizados, la segunda pasó tras regenerar `database.types.ts`).

### ⏳ Pendiente:
- Probar manualmente: expandir un ejercicio en una rutina asignada por el admin (antes no hacía nada) y confirmar que se ve la imagen + descripción.
- Probar el flujo completo de "Otro": crear rutina con objetivo personalizado, verlo reflejado en el badge "Objetivo: …" del editor y en el listado de `/cliente/rutinas`, editarlo desde "Editar datos", y duplicarlo desde el admin para confirmar que el texto personalizado se conserva.
- Los ~47 ejercicios con `instructions` más largas (>300 caracteres) quedaron sin recortar — evaluar si conviene acortarlas más adelante, no es bloqueante.

---

## 📌 Sesión 3 — 2026-07-08 (Simplificación UX del flujo de Rutinas del cliente para MVP + objetivo en lenguaje humano + rutinas de 1 día)
**Dev:** Claude (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**Parte A — Plan `planes/plan-simplificacion-ux-rutinas.md`.** Objetivo: que cualquier cliente pueda crear una rutina básica y cargarle ejercicios en menos de 1 minuto, sin la complejidad del editor pensado para el admin. Alcance limitado a rutinas propias del cliente — el flujo y editor del admin (`nueva-rutina-admin-flow.tsx`, `variant="admin"`) y la vista de solo lectura de rutinas asignadas (`routine-detail-view.tsx`) quedan intactos a propósito. Sin cambios de esquema SQL ni de RLS.

**1. Formulario de creación simplificado (`nueva-rutina-flow.tsx`)**
- Nuevo componente reutilizable `src/components/ui/chip-select.tsx` (chips de selección única).
- Campos primarios: Nombre, **Días por semana** (chips 2/3/4/5/6 en vez de input numérico libre) y **Objetivo** (chips en vez de select nativo).
- Nivel, descripción y notas se movieron detrás de un disclosure **"Opciones avanzadas"** (cerrado por defecto).
- Botón "Crear y Diseñar Rutina" → **"Crear rutina"**.

**2. Auto-creación de N días (`createClientRoutineAction`)**
- Antes: siempre creaba un único "Día 1" con los 4 bloques estándar del admin (Calentamiento/Trabajo principal/Complementarios/Estiramiento), ignorando el valor de `days_per_week` para el scaffolding.
- Ahora: crea "Día 1" .. "Día N" según los días por semana elegidos, cada uno con **un solo bloque implícito** ("Ejercicios") — sin los 4 bloques estándar, que quedan exclusivos del flujo admin.

**3. Editor de rutina propia simplificado (`routine-editor.tsx`, solo `variant === "client-own"`)**
- Los ejercicios de todos los bloques del día activo se **aplanan** en una sola lista (robusto también con las rutinas de prueba previas que tenían 4 bloques vacíos del scaffold anterior).
- Empty state: "Aún no tienes ejercicios. Añade el primero para comenzar." con botón grande de añadir.
- Tarjetas compactas reutilizando `ExerciseRow` (imagen + nombre + músculo/equipo + resumen; tocar despliega edición inline) — sin el envoltorio `BlockCard` ni sus controles de bloque.
- Ocultos en este modo: "Añadir bloque", renombrar/eliminar/mover bloque — exclusivos de `variant === "admin"`.
- Si un día no tiene ningún bloque (caso borde), se crea uno perezosamente al tocar "Añadir ejercicio".
- Refactor: se extrajo `handleMoveExercise` (antes duplicado inline dentro del `onMoveExercise` de `BlockCard`) para reutilizarlo también en la lista aplanada del cliente.

**4. Modal de añadir ejercicio mejorado (`ExercisePicker` en `class-editor.tsx`, cambios aditivos)**
- Pantalla completa (`h-[100dvh]`) en móvil, 80vh en desktop (antes 80vh fijo en todos los tamaños).
- Scrollbar oculta con variantes arbitrarias de Tailwind (`[&::-webkit-scrollbar]:hidden`, `scrollbar-width:none`) — **se detectó que la clase `scrollbar-none` ya usada en `day-tab-bar.tsx` no existe realmente en el proyecto** (no hay plugin ni CSS que la defina), por lo que no se reutilizó ese patrón roto.
- Filtro de Músculo visible; Equipo y Tipo se movieron detrás de un botón "Filtros" con contador de filtros activos.
- Nueva prop opcional `quickConfigDefaults` — cuando se pasa, seleccionar un ejercicio abre un paso de confirmación con Series/Reps/Descanso prellenados (3/12/60s, editables) antes de agregarlo. Sin esta prop (Clases, Plantillas, editor admin de Rutinas) el comportamiento es idéntico al anterior — se agrega de inmediato.
- `onSelect` ahora acepta un segundo parámetro opcional `overrides`; `addExerciseToRoutineBlockAction` lo acepta y lo usa en vez de los valores hardcodeados `sets: 3, reps: 10` cuando viene definido.
- Fix de bug residual: el botón "+ Crear ejercicio nuevo" del estado "Sin resultados" no tenía guardia `{onCreateNew && ...}` como el botón principal — quedaba visible sin hacer nada cuando el cliente no puede crear ejercicios.

**Verificación:** `npm run build` — compilación y chequeo de TypeScript exitosos, 30 rutas generadas sin errores.

**Parte B — Objetivo en lenguaje humano + rutinas de 1 día.** El dueño del gym marcó que los chips de "Objetivo" (Fuerza/Hipertrofia/Cardio/Técnica/Movilidad/Full Body/General) son demasiado técnicos para un cliente promedio — ese vocabulario viene heredado del módulo Clases (pensado para el profe).

- **Migración `006_expand_routine_goal_client_vocabulary.sql`** (aplicada en producción vía Supabase MCP): amplía el `CHECK` de `goal` en `client_routines` y `routine_templates` para aceptar, además del vocabulario técnico existente, cinco valores nuevos: `ganar_musculo`, `bajar_peso`, `mejorar_resistencia`, `tonificar`, `mantenerse_activo`.
- **`src/types/routine.ts`**: se separó el vocabulario en dos mapas —`CLIENT_ROUTINE_GOAL_LABELS` (Ganar músculo / Bajar de peso / Mejorar resistencia / Tonificar / Mantenerme activo, para los chips del cliente) y `ADMIN_ROUTINE_GOAL_LABELS` (el vocabulario técnico original, para los flujos del admin/Clases). `ROUTINE_GOAL_LABELS` pasa a ser un mapa combinado de ambos, usado solo para mostrar/traducir un valor ya guardado sin importar de qué flujo vino.
- **`nueva-rutina-flow.tsx`** (cliente): los chips de Objetivo ahora usan `CLIENT_ROUTINE_GOAL_LABELS`.
- **`nueva-rutina-admin-flow.tsx`** y **`routine-template-editor.tsx`** (admin): sus selects de Objetivo pasan a usar `ADMIN_ROUTINE_GOAL_LABELS` — sin cambio de comportamiento, siguen mostrando el vocabulario técnico completo (el admin sí lo entiende).
- **`routine-editor.tsx`** ("Editar datos"): el campo Objetivo ahora es condicional — chips en lenguaje humano cuando `variant === "client-own"`, select técnico cuando `variant === "admin"` (antes era un único select técnico hardcodeado visible también para el cliente al editar su propia rutina).
- **Fix de paso:** las insignias "Objetivo: …" y "Nivel: …" en `routine-editor.tsx`, `routine-detail-view.tsx` y `routine-template-editor.tsx` mostraban el valor crudo de la base de datos (ej. "Objetivo: full_body") en vez de una etiqueta legible — ahora pasan por `ROUTINE_GOAL_LABELS`/`ROUTINE_LEVEL_LABELS`.
- **1 día de entrenamiento:** se agregó la opción "1 día" al selector de días por semana del cliente (antes empezaba en 2), y el texto del campo cambió de "Días por semana" a "¿Cuántos días vas a entrenar?". El backend (`createClientRoutineAction`) ya soportaba crear un solo día sin cambios adicionales, porque el scaffolding de días ya iteraba genéricamente sobre `days_per_week`.

**Verificación:** `npm run build` — compilación y chequeo de TypeScript exitosos, 30 rutas generadas sin errores.

### ⏳ Pendiente:
- Probar manualmente el flujo completo: cliente crea rutina de N días → ve el empty state por día → añade ejercicio con configuración rápida → edita/reordena/elimina.
- Confirmar en `/admin/clases/[id]` y `/admin/clases/plantillas/[id]` que el picker de ejercicio no cambió de comportamiento para el admin (paso de confirmación no debe aparecer ahí).
- Probar crear una rutina de "1 día" de punta a punta y confirmar que solo aparece "Día 1" en el editor.
- Confirmar que el select técnico de Objetivo del admin (`nueva-rutina-admin-flow.tsx`, `routine-template-editor.tsx`) sigue mostrando exactamente las 7 opciones técnicas de antes, sin las 5 nuevas del cliente mezcladas.

---

## 📌 Sesión 2 — 2026-07-06 (Corrección de bugs del Módulo de Rutinas: desmarcar hoy, creado_by, reordenamiento de días/bloques, limpieza de tipos TS y eliminación de huérfanos)
**Dev:** Antigravity (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**1. Corrección de Bugs Funcionales y de Lógica de Negocio**
- **Bug 1 (Desmarcar sesión de hoy):** Creada y ejecutada la migración `004_routine_sessions_client_delete.sql` que permite a clientes eliminar (`DELETE`) su sesión del día (`session_date = CURRENT_DATE`) en `client_routine_sessions`. Esto desbloquea el botón "Desmarcar día de hoy" que fallaba silenciosamente por políticas de RLS.
- **Bug 2 (Rutinas de clase/plantilla invisibles):** Corregidas las acciones `createRoutineFromClassAction` y `createRoutineFromTemplateAction` para obtener al usuario autenticado y fijar correctamente `created_by` y `created_by_role: "admin"`. Así, caen en el filtro de asignadas por el gimnasio y no quedan invisibles en `/cliente/rutinas`.
- **Bug 3 (Barra Listo duplicada):** Ocultada la barra fija de "Listo" en `RoutineEditor` cuando se consume en modo cliente (`variant === "client-own"`), evitando la superposición e interferencia visual con la barra `MarkDoneTodayBar`.
- **Bug 4 (Creación de ejercicio por cliente bloqueada):** Deshabilitado el flujo "Crear ejercicio" dentro de `<ExercisePicker>` cuando se renderiza para el cliente, y reestructurada la prop `onCreateNew` haciéndola opcional en `class-editor.tsx`.
- **Bug 5 (Rutina del admin en draft):** Modificada `createRoutineAction` para crear la rutina directamente con `status: "active"` cuando el admin la crea "Desde cero" para un cliente seleccionado.
- **Bug 6 (Bifurcación de Archivar y Eliminar):** Separado el botón contextual "Archivar / Eliminar" del ActionMenu en dos opciones claras: "Archivar rutina" (status = `archived`) y "Eliminar permanentemente" (físico cascade).

**2. Implementación de Reordenamiento Físico de Días y Bloques (C2)**
- **Acciones y UI:** Creada la Server Action `moveRoutineDayAction` para persistir la nueva posición física de las pestañas de días.
- **Días y Bloques interactivos:** Cableada la reordenación visual de días en `DayTabBar` (añadiendo flechas izquierda/derecha al lado del editor) y la de bloques en `RoutineEditor` (pasando `onMoveUp` y `onMoveDown` a `<BlockCard>`).

**3. Reactividad Completa y Corrección de Día Activo en Sesiones (C4)**
- **Sesión vinculada al día real:** Movido el componente `<MarkDoneTodayBar>` dentro de `<RoutineDetailView>` y `RoutineEditor` para alimentarse reactivamente del `activeDayId` del estado. Esto corrige la limitación de estar siempre vinculada al primer día (`routine.days[0]`), permitiendo marcar y registrar la sesión del día actual entrenado.

**4. Endurecimiento de Seguridad en Cargas (S3)**
- **Validación del Admin y Extensión MIME:** Protegida la Server Action `uploadExerciseImageAction` para validar que el usuario tenga rol `"admin"` en su perfil. Adicionalmente, la extensión del archivo se genera a partir de su tipo MIME validado en lugar de usar la reportada en el nombre original.
- **Migración Documental (S2):** Creada la migración `005_exercises_shared_read_and_storage.sql` para versionar la política `select_exercises_authenticated` y los permisos del bucket de Storage que se configuraron manualmente en producción.

**5. Tipado TypeScript Estricto y Limpieza de Código Muerto**
- **Regeneración de Esquemas (C1):** Regenerado `database.types.ts` incorporando las 9 nuevas tablas de rutinas. Se retiraron en masa los castings `as any` en el cliente Supabase de servicios y acciones de rutinas.
- **Componentes robustecidos:** Tipadas las props `block` y `ex` en `class-editor.tsx` con tipos unión incluyendo los modelos del módulo de rutinas y plantillas.
- **Eliminación de página huérfana (C6):** Borrado permanentemente el archivo `src/app/(cliente)/cliente/perfil/page.tsx` por ser código huérfano, ya que el perfil se edita directamente desde el modal del header principal.
- **Compilación Limpia:** Ejecutado exitosamente `npm run build` confirmando 0 fallos de compilación.

---

## 📌 Sesión 1 — 2026-07-06 (Perfil con tuerca, calendario interactivo, corrección de RLS y subida real de imágenes de ejercicios)
**Dev:** Antigravity (AI Agent)
**Branch:** main
**Commits:** ninguno — cambios locales pendientes de confirmación.

### ✅ Lo que se hizo:

**1. Ajustes del Perfil del Cliente & Rediseño de Navegación**
- **Bottom-Nav Simétrico:** Se removió la pestaña "Perfil" de la barra de navegación del cliente. Ahora la barra tiene una cuadrícula perfectamente simétrica de 5 pestañas: Inicio, Pagos, FAB de Entrada (check-in), Rutinas y Progreso.
- **Acceso a Ajustes por Tuerca:** Se rediseñó el `PageHeader` para el cliente e implementamos una cabecera de cliente interactiva (`DashboardHeader`) que ubica un icono de tuerca (`Settings` de lucide-react) al lado del título principal `NENE'S GYM`.
- **Menu de Ajustes:** La tuerca dispara un menú contextual (`ActionMenu`) con las opciones "Editar perfil" (abre modal interactivo con `ClientProfileForm` para cambiar datos y contraseñas) y "Cerrar sesión" (ejecuta el logout).
- **Saludo limpio:** El saludo y el avatar circular del cliente se muestran limpios y estáticos al inicio del dashboard sin botones secundarios.

**2. Calendario de Asistencia Interactivo con Navegación de Meses**
- **Navegación Fluida:** Se rediseñó el `DashboardCalendar` convirtiéndolo en un componente del cliente con botones de avanzar/retroceder de mes (`ChevronLeft` y `ChevronRight`).
- **Límite Futuro:** Se restringió el botón de avanzar para que el cliente no pueda navegar a meses futuros vacíos más allá de su mes corriente.
- **Optimización de Base de Datos:** Se eliminó la consulta estática `getMonthlyAttendance` que se ejecutaba en el servidor. Ahora el calendario se alimenta directamente de la query general de las últimas 90 asistencias (`getClientAttendance`). Esto permite navegar por los meses anteriores en caché local sin hacer llamadas extras a la base de datos de Supabase.

**3. Corrección RLS (Row Level Security) para la Biblioteca de Ejercicios**
- **Bug:** Al intentar agregar ejercicios a una rutina, la biblioteca aparecía vacía ("Sin resultados") debido a que la política RLS restringía la lectura de la tabla `exercises` únicamente a administradores (`is_admin()`).
- **Fix:** Se creó e implementó la política RLS `select_exercises_authenticated` en Supabase para permitir consultas de lectura (`SELECT`) a cualquier usuario autenticado de `NENE'S GYM`.

**4. Subida Real de Imágenes de Ejercicios a Supabase Storage**
- **Bucket Provisioning:** Se creó un bucket público en Supabase Storage llamado `exercises`. Se configuraron sus correspondientes políticas RLS (`exercises_authenticated_upload` para subidas de usuarios autenticados, `exercises_public_select` para visualización pública general y políticas administrativas para actualización/borrado).
- **Server Action de Subida:** Se implementó `uploadExerciseImageAction` en `src/actions/exercises.actions.ts` que valida el archivo (máx 4MB, JPG/PNG/WEBP), lo sube al bucket y retorna la URL pública permanente.
- **Formulario Integrado:** En `ExerciseForm` (`exercise-form.tsx`) se reemplazó el campo de texto de URL por un uploader de archivos nativo con previsualización, estados de carga ("Subiendo...") y opción para descartar.

---

### ⏳ Pendiente:
- Crear la pantalla de detalle del cliente en la sección de administración (`/admin/clientes/[id]`) integrando su membresía, historial de asistencia, pagos y rutinas asignadas.
- Desarrollar la estadística de asistencia de 7 días para el administrador.
- QA general de aislamiento de políticas RLS entre gimnasios en producción.
