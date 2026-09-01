# 🧠 Lecciones Aprendidas — NENE'S GYM

Este documento almacena la memoria de errores y gotchas resueltos en el proyecto, sirviendo de guía para evitar repetir fallas técnicas o lógicas en sesiones de desarrollo futuras.

---

## 📌 Lecciones Recientes (Sesión 19 - 2026-09-01)

### 1. PostgREST corta en 1.000 filas y NO avisa
Cualquier consulta sin `.limit()` se trunca en 1.000 filas: sin error, sin cabecera,
sin nada. Comprobado pidiendo 100.000 asistencias — devolvió exactamente 1.000.
Al crecer el gimnasio, un listado empezaría a mentir sin que nadie lo notara.
**Regla:** toda consulta lleva `.limit()` explícito, aunque hoy devuelva 3 filas.

### 2. ILIKE interpreta lo que teclea el usuario
`'%' || p_search || '%'` con el término sin escapar: buscar `%` devolvía **los 402
socios**, y `50%` daba 5 resultados en vez de 1. Hay que escapar la barra invertida,
`%` y `_`, **en ese orden** (la barra primero, o se duplican las que meten los otros
dos).

### 3. La búsqueda sin `unaccent` es inservible en Colombia
`Munoz` no encontraba a `Muñóz`. El admin teclea sin tildes casi siempre, así que
para él el socio "no existe". Hay que aplicar `unaccent()` a los **dos** lados: al
término y a la columna. Coste aceptado: impide usar índice de texto. Con 402 socios
da igual; medido en 223 ms de los cuales ~180 son red.

### 4. Con Next en streaming, `redirect()` responde 200, no 307
En una página `force-dynamic`, las cabeceras salen antes de que se resuelva el
`redirect()`, así que la redirección viaja **dentro del cuerpo**. Igual con
`notFound()`. Una prueba que exija 307 o 404 da falsos negativos: hay que comprobar
que no se filtre contenido, no el código de estado.

### 5. En desarrollo, casi todas las páginas contienen el texto de la 404
`This page could not be found` aparece en el bundle de páginas que funcionan
perfectamente — `/login` incluido. Usarlo como detector de error marca todo como
roto (me pasó: 39 falsos fallos). Lo mismo con `digest`. La señal fiable es el estado
HTTP más contenido propio de la pantalla.

### 6. React parte los nodos de texto en el payload
Buscar `"Pagos pendientes"` en el HTML falla aunque la pantalla lo muestre: el
payload lo trocea en `"Pagos"` y `"pendientes"`. Los marcadores de prueba hay que
verificarlos uno a uno antes de darlos por buenos.

### 7. Un `index.ts` dentro de una carpeta homónima es inalcanzable
Existían `src/lib/utils.ts` y `src/lib/utils/index.ts`. TypeScript resuelve el
**archivo** antes que la carpeta, así que el segundo no lo importaba nadie y editarlo
no habría tenido ningún efecto. Trampa silenciosa; borrado.

### 8. Medir con `service_role` da números falsos
Se salta las políticas RLS, que es justo donde se esconde el coste. Para medir de
verdad hay que abrir sesión real y usar la clave anon. `generateLink` +
`verifyOtp` da una sesión sin conocer la contraseña — también sirve para construir
la cookie de `@supabase/ssr` y probar páginas enteras.

### 9. La latencia de red domina: mide el sobrecoste, no el total
Una consulta trivial de 4 filas tarda ~180 ms. Sin restar esa base, todo "parece
lento" y se acaba optimizando lo que no toca.

### 10. Avisar del duplicado al final es tirar el trabajo del admin
La comprobación de WhatsApp repetido vivía solo en el `submit`: el admin rellenaba
nombre, teléfono, correo, plan y método de pago para que le saltara el error al final.
Las validaciones que dependen de la base deben correr **en cuanto el dato está
completo**. La del servidor se queda igualmente: entre teclear y guardar pueden pasar
minutos y otro puede haber dado de alta al mismo socio.

### 11. Descontar días de un plan: restar a los dos números, no retroceder la fecha
Retroceder `start_date` parece lo natural, pero el consumo se cuenta por días
**hábiles** (`eligible_days_elapsed`): retroceder 5 días de calendario puede descontar
solo 3 si cayó domingo. Restando a `total_days` y a `duration_days`, lo que el admin
teclea es exactamente lo que se descuenta.

### 12. Cuidado con `+1`: no es solo EE.UU.
Rep. Dominicana usa 809, 829 **y** 849 dentro del +1. Listarla con un prefijo fijo
(`1809`) hace que dos tercios de sus números salgan mal. Todo el plan de numeración
norteamericano va en una sola entrada.

### 13. Un teléfono "válido en total" puede ser inválido en su país
La regla era "entre 10 y 15 dígitos contando el indicativo". Con ella entró en la base
un socio con **11 dígitos colombianos**, y su enlace de WhatsApp apunta a un número
inexistente. Nadie se entera hasta que el mensaje no llega. La longitud hay que
validarla **por país**.

### 14. `react-hooks/set-state-in-effect` casi siempre señala un bug real
Llamar a `setState` en el cuerpo de un efecto no solo dispara renders en cascada.
Al reescribirlo como estado **derivado** —guardando para qué valor es la respuesta—
desapareció además una condición de carrera: una respuesta lenta podía pintarse sobre
un número que el admin ya había cambiado.

---

## 📌 Lecciones Recientes (Sesión 18 - 2026-08-21)

### Lección: "no tiene invitación aceptada" NO significa "no tiene cuenta"
*   **El agujero más grave que ha tenido este proyecto**, y nació de una inferencia que parecía inocente: deducir el estado de acceso de un socio a partir de la tabla de invitaciones.
*   Un socio que se registra **él mismo** nunca pasa por una invitación. Su fila en `client_invitations` no existe. Con esa inferencia, la ficha lo mostraba como *"Sin activar"* y le ofrecía al admin un botón para invitarlo — a alguien que ya tenía su cuenta. Ese enlace, en las manos equivocadas, se llevaba su historial completo; y por el camino de correo+contraseña, su cuenta de login entera (`updateUserById` sobre una cuenta viva).
*   **La regla:** un estado que describe *"esta cuenta no se usa"* tiene que leerse de donde vive esa verdad —`auth.users.last_sign_in_at` y las identidades—, **nunca de la ausencia de un registro** en una tabla de proceso. La ausencia de una fila no es evidencia de nada: solo significa que ese proceso no ocurrió.
*   **El correo marcador tampoco vale como señal.** Significa "sin correo propio", no "sin acceso": el admin puede dar de alta a un socio con su correo real y esa cuenta también es inerte. Confundir las dos cosas habría dejado el agujero medio abierto.
*   **Cómo se encontró:** una revisión adversarial con revisores independientes por dimensión (SQL, seguridad, flujos, React) y una segunda pasada que intentaba **refutar** cada hallazgo. De los hallazgos brutos, la mayoría se refutaron; los dos que sobrevivieron eran este. Las guardas que sí funcionaban (`ACCOUNT_HAS_DATA`, `ALREADY_LINKED`, `IS_ADMIN`) daban una falsa sensación de cobertura: protegían la ficha *del aceptante*, nunca la *del destino*.

### Lección: un Server Action que rechaza deja el botón muerto para siempre
*   `LoadingButton` hace `disabled={pending || disabled}`. Los handlers ponían `setStatus("loading")` y solo volvían a `"error"` en la rama `!result.ok`. Pero un Server Action que falla —red caída, 500— **rechaza la promesa**: el `await` lanza, el estado se queda en `"loading"` y el botón no vuelve nunca hasta recargar la página.
*   Ni los error boundaries lo recogen: el rechazo ocurre dentro de un `onClick` que descarta la promesa, así que queda como *unhandled rejection*.
*   **Regla:** todo `await` de una server action que gobierne un estado de carga va envuelto en `try/catch`, con el `catch` devolviendo el control al usuario y un mensaje accionable. Aplicado en `new-client-modal`, `activate-plan-modal` e `invitation-actions`.

### Lección: la idempotencia del pago no salva del duplicado que de verdad duele
*   **El caso:** `payments.client_request_id` con su UNIQUE y su `on conflict do nothing` llevaban meses montados en la base **sin que ningún llamador pasara el parámetro**. Al conectarlo parecía que el problema estaba resuelto. No lo estaba.
*   **Lo que no cubría:** el admin pulsa "Registrar", la red va lenta, reintenta. El correo marcador se generaba con un sufijo **aleatorio**, así que el segundo intento producía otro correo, `createUser` no colisionaba y salían **dos socios**, cada uno con su membresía cobrada. Dos `clientId` distintos → el `client_request_id` no ve nada.
*   **Regla:** la clave de idempotencia tiene que sembrar **todo** lo que se crea en la operación, no solo el último paso. Aquí el mismo uuid siembra el correo marcador *y* el pago.
*   **Y el peligro simétrico, que es peor:** si ese id se reutilizara entre cobros distintos, una **renovación** devolvería `ALREADY_APPLIED` y **no se cobraría**. Un bug de dinero al revés, silencioso, que nadie reporta. De ahí la regla escrita en el código: *un requestId = una intención de cobro; se regenera al abrir el modal y tras cada éxito.*
*   **Corolario de orden:** la sonda que detecta "esto es mi propio reintento" tiene que ir **antes** de los chequeos de duplicado, o el chequeo encuentra lo que acabas de crear y te bloquea a ti mismo.

### Lección: una cookie HttpOnly no sobrevive al WebView de WhatsApp
*   **El caso:** para conservar qué invitación se está aceptando durante el OAuth, lo "correcto de manual" es una cookie HttpOnly de corta duración. Y aquí habría fallado en el escenario **más común de todos**.
*   **Por qué:** el socio abre el enlace desde WhatsApp Android → se carga en el WebView de WhatsApp → Google OAuth salta al **navegador del sistema**, que es otro contexto y **no tiene esa cookie**. Resultado: OAuth completa, se crea un usuario nuevo, la invitación no se acepta, y el socio aterriza en un dashboard vacío creyendo que ya entró.
*   **La solución no es una capa, son tres:** (1) el token en el `redirectTo` como `?inv=`, que sí cruza de navegador; (2) la cookie como respaldo por si el query se recorta; (3) **reabrir el enlace ya autenticado**, que repara el caso aunque fallen las dos primeras. La tercera es la que convierte el sistema en auto-reparable.
*   **Regla general:** al diseñar un flujo que se va a abrir desde un chat, asumir siempre que el navegador **cambia a mitad de camino**.

### Lección: `setState` dentro de un `useEffect` no es solo un warning de rendimiento
*   El lint del proyecto (`react-hooks/set-state-in-effect`) rechazó generar la invitación en un efecto al montar el componente. Tentador saltárselo con un `eslint-disable`.
*   **Pero aquí la regla tenía razón por un motivo de negocio, no de rendimiento:** generar una invitación **revoca la anterior**. Un efecto mal atado (o un doble montaje en StrictMode) quemaría enlaces ya enviados por WhatsApp.
*   **Regla:** las acciones con efectos secundarios irreversibles se disparan desde un **evento**, nunca desde un render. Se movió la generación al flujo del padre y el componente pasó a recibir el enlace por props.

### Lección: un archivo `"use server"` no puede exportar helpers síncronos — y por eso se duplica código sin querer
*   **Síntoma:** al necesitar traducir los errores de Supabase Auth en `admin.actions.ts`, la función `traducirErrorAuth` ya existía… dentro de `auth.actions.ts`, que empieza con `"use server"`. Importarla desde ahí **no es una opción**: Next exige que todo lo exportado por un módulo `"use server"` sea una server action `async`.
*   **La trampa:** lo cómodo es copiar las 20 líneas de la tabla de mensajes al segundo archivo. A partir de ahí los dos textos divergen y nadie lo nota, porque no rompe nada — solo empeora poco a poco los mensajes que ve el usuario.
*   **Regla:** cualquier helper puro que quiera vivir cerca de las actions va en `src/lib/`, no dentro del archivo `"use server"`. Se hizo así con `src/lib/auth/auth-errors.ts`.

### Lección: el trigger de `auth.users` crea el perfil y el cliente, pero NO copia el teléfono
*   Nadie en el repo inserta en `profiles` ni en `clients` — `registerAction` solo llama a `admin.auth.admin.createUser()` y las filas aparecen igual. **Hay un trigger en `auth.users` creado desde el dashboard de Supabase que nunca se versionó** en `supabase/migrations/`.
*   **Verificado en producción** (Sesión 18, creando y borrando un socio de prueba): el trigger crea `profiles` con `gym_id` y `role='client'` correctos, y crea la fila de `clients`. **El `phone` de `user_metadata` se queda en `null`.**
*   **Consecuencia práctica:** una action que dé de alta clientes **no puede insertar a ciegas** (chocaría con la fila del trigger) **ni asumir que los datos están completos** (el teléfono no llega). El patrón correcto es `upsert` sobre `profiles` + `select`-antes-de-`insert` sobre `clients`: idempotente y funciona con y sin trigger.
*   **Bonus verificado:** `auth.admin.deleteUser()` limpia `profiles` y `clients` en cascada, sin dejar filas huérfanas.

### Lección: `create or replace function` no puede cambiar el `returns table`
*   Al intentar añadir una columna a lo que devuelve `admin_search_clients`, el `create or replace` falla con *"cannot change return type of existing function"*. Hay que `drop function if exists ...(text, text, date, int, int)` **antes**, con la firma completa de parámetros. Sigue siendo relevante: ampliar esa RPC (buscar por celular) está en el roadmap.
*   **Corolario para el cliente TS:** mientras la migración no esté aplicada, la RPC vieja no devuelve la columna nueva y el campo llega `undefined`. Conviene mapearlo con `?? null` para que la UI degrade sola en vez de romperse — el código puede desplegarse antes que la migración.
*   Contexto: se aprendió implementando la cédula como identificador (Sesión 18), que **se retiró después** a petición del usuario. La lección sobre la RPC sigue siendo válida.

### Lección: TypeScript tipa `ctx.error` de `requireAdmin()` como `string | undefined`
*   **Síntoma:** el patrón que usan todas las actions del archivo, `if ("error" in ctx) return { error: ctx.error }`, compila sin problema… hasta que se le pone un **tipo de retorno explícito** a la función. Ahí salta `TS2322: Type 'string | undefined' is not assignable to type 'string'`.
*   **Causa:** `requireAdmin()` no declara tipo de retorno; TS lo infiere como unión de tres objetos literales y **normaliza** la unión añadiendo `error?: undefined` al miembro de éxito. `"error" in ctx` entonces no descarta ese miembro. Las demás actions se libran solo porque tampoco declaran su retorno.
*   **Fix local (no tocar `requireAdmin`, lo usan muchas actions):** `return { error: ctx.error ?? "Sin permisos" }`, con comentario de por qué el `??` no es defensa vacía.

---

## 📌 Lecciones Recientes (Sesión 17 - 2026-08-03)

### Lección: la geometría esencial de un overlay no puede depender de una clase de CSS
*   **Síntoma:** al crear un ejercicio, elegir una foto "no hacía nada". Ni error, ni modal. Después, ya con el modal visible, se abría **sin imagen**: cabecera, botones de formato y zoom, pero nada entre medias.
*   **Eran dos capas del mismo fallo**, las dos por lo mismo:
    1. `z-[99999]` no llegaba → el modal se pintaba como un bloque en flujo **dentro** del formulario y quedaba tapado por él.
    2. `h-[40dvh]` no llegaba → el contenedor del recorte colapsaba a altura cero, y como `react-easy-crop` posiciona su lienzo en absoluto dentro, no quedaba nada visible.
*   **Por qué costó tanto encontrarlo:** ninguna de las dos produce un error. El navegador simplemente ignora una regla que no tiene y sigue. El resultado se lee como "el botón está roto" o "la foto no carga", que apuntan a sitios completamente distintos del real. Y no se reproducía en otro navegador con el **mismo servidor y el mismo código**.
*   **Lo que lo destapó:** un panel de diagnóstico temporal dentro del propio formulario, que tras abrir el recorte inspeccionaba el DOM real y reportaba tamaño, `z-index` y qué elemento estaba encima del centro de la pantalla. Tres líneas bastaron:
    ```
    7. modal montado 453×772     ← ventana de 481px: debería ocuparla entera
    8. z=auto                    ← debería ser 99999
    9. encima del centro: <div class="space-y-1.5">   ← el propio formulario
    ```
    Cuando un fallo no se reproduce en tu máquina, **llevar el diagnóstico a la máquina del usuario** es más rápido que seguir formulando hipótesis. Y sacarlo a la pantalla evita depender de que abra la consola.
*   **Regla a futuro:** en un componente que se pinta con `createPortal` y **debe** quedar por encima, `position`, `inset`, `zIndex` y el alto del área útil van en **estilo en línea**. No pueden faltar ni perder una guerra de especificidad. El resto del estilo (colores, bordes, espaciado) puede seguir en clases: si falta se ve feo, pero no se rompe.
*   **De paso:** usar `vh` en vez de `dvh` en ese estilo, y acompañarlo de `minHeight`/`maxHeight`. `dvh` tiene peor soporte y, si el navegador no lo entiende, la declaración se descarta entera y vuelves al mismo colapso.
*   ⚠️ **Causa de fondo sin resolver.** Se verificó que las cuatro clases (`z-[99999]`, `h-[40dvh]`, `h-[45dvh]`, `max-h-[95dvh]`) **sí están** en el CSS generado, y que el archivo no llega truncado (`max-w-md` está *después* de `z-[99999]` en el fichero y sí se aplica en ese mismo navegador). Es decir: el cliente aplica unas reglas y otras no del mismo archivo. Si aparecen más rarezas visuales en otras pantallas, empezar por aquí.

### Lección: pre-generar tamaños sale gratis; redimensionar al vuelo se paga siempre
*   **Contexto:** el dueño quiso salir del optimizador de imágenes de Vercel antes del lanzamiento, porque en **TodoAquiApp ya se le agotó el cupo y empezó a recibir 402 en producción**. Experiencia propia, no teoría.
*   **Las tres formas de servir una miniatura, y su coste real:**
    1. **Optimizador de Vercel** — cero configuración, pero cobra por transformación única y tiene tope. Es el que reventó en TodoAqui.
    2. **Cloudflare Image Resizing** — lo que usa TodoAqui hoy. Requiere plan de pago **y** un dominio propio conectado al bucket.
    3. **Pre-generar al subir** — el trabajo se hace una vez, las variantes quedan como archivos estáticos. Gratis, y no depende de ningún proveedor.
*   **Trampa que casi cuesta una migración de DNS entera:** se llegó a planificar mover `nenesgym.com` de Hostinger a Cloudflare *para bajar el consumo de Vercel*. **No lo habría bajado en absoluto.** El dominio propio quita el rate-limit de `r2.dev` y añade caché de borde; quién redimensiona es un eje **independiente**. Confundir los dos ejes lleva a hacer un trabajo grande y arriesgado que no toca el problema.
*   **Solución adoptada (opción 3):** 3 archivos por imagen en R2 (original, `-thumb` 96px, `-detail` 1024px). Lista completa de ejercicios: **12,3 MB → 0,25 MB**. Almacenamiento extra: 4,6 MB sobre 10 GB gratuitos.
*   **Regla a futuro:** para un catálogo que casi no cambia, pre-generar gana a redimensionar al vuelo en coste, en dependencias y en simplicidad. Redimensionar al vuelo solo se justifica cuando los tamaños no se conocen de antemano o el volumen de originales hace inviable generarlos todos.
*   **Lo que hay que recordar al mantenerlo:** las variantes se borran junto al original (si no quedan huérfanas), la tabla de presets está **duplicada** entre `src/lib/images.ts` y `scripts/generate-image-variants.mjs` (el `.mjs` no puede importar TS), y siempre debe haber fallback variante → original → icono, porque una imagen subida antes del cambio no tiene variantes.

### Lección: el cupo de imágenes se cuenta por origen único, no por visita
*   **Por qué importa:** cambia por completo el cálculo de riesgo. 500 clientes viendo las mismas 116 fotos **no** generan 58.000 transformaciones: generan 116, una vez, y luego se sirven de caché.
*   **Dónde sí duele:** cuando los orígenes crecen sin parar. TodoAqui tiene logo, portada, galería y anuncios por cada negocio, y negocios nuevos cada semana — ahí el contador no deja de subir. Un catálogo de ejercicios fijo no se le parece.
*   **Cómo se aplicó:** por eso se sacó del optimizador **solo** lo que crece (las imágenes de ejercicio) y se dejó dentro lo que es un conjunto fijo (los ~8 assets de `/public`). Apagarlo también para esos habría servido el hero de 75 KB sin encoger, a cambio de nada.
*   **Regla a futuro:** antes de rediseñar por un límite, comprobar **qué unidad mide ese límite**. Aquí la diferencia entre "por petición" y "por origen único" separa un problema real de uno imaginario.

### Lección: `createPortal` saca el nodo del DOM, pero **no** del árbol de eventos de React
*   **Síntoma:** el botón "Recortar" del formulario de ejercicio "no abría la imagen". En realidad sí abría — pero al primer clic dentro del modal (arrastrar el encuadre, cambiar el formato, confirmar) desaparecía todo.
*   **Causa:** `ImageCropModal` se pinta con `createPortal(..., document.body)`. Eso lo saca del DOM del padre, y por eso el z-index y el `overflow` funcionan bien — pero React sigue propagando los eventos sintéticos por el **árbol de componentes**, no por el DOM. El portal estaba declarado dentro del `<div onClick={onClose}>` que cierra el formulario, así que cada clic del modal disparaba ese cierre.
*   **Solución:** cortar la propagación en la raíz del propio modal (`onClick`/`onMouseDown`/`onPointerDown`/`onTouchStart`), no en cada llamador. Así queda arreglado para los 4 sitios que lo usan y no se puede volver a romper al añadir un quinto.
*   **Regla a futuro:** todo componente que se pinte con `createPortal` y pueda montarse dentro de un overlay "clic fuera para cerrar" debe detener la propagación en su raíz. No asumir que el portal aísla los eventos.
*   **Cómo se diagnosticó:** con una página de repro aislada (`/dev-crop-test`, borrada después) y Chrome real vía Playwright. Leer el código no bastaba: el modal *parecía* correcto y la imagen *sí* cargaba. Para bugs de "no funciona el clic", reproducir en navegador antes de teorizar.

### Lección: no borrar un archivo del storage hasta que la base deje de apuntarle
*   **Síntoma (latente, no reportado):** recortar la foto de un ejercicio y luego pulsar "Cancelar" dejaba la imagen rota para siempre.
*   **Causa:** `uploadExerciseImageAction` borraba la imagen anterior de R2 en cuanto subía la nueva. Pero `media_url` solo se actualiza al **guardar** el formulario. Entre subir y guardar, la fila seguía apuntando a un archivo ya borrado — y si el usuario cancelaba, se quedaba así.
*   **Solución:** el borrado se hace en `updateExerciseAction` / `updateMyExerciseAction`, comparando la `media_url` anterior con la nueva, es decir **después** de que la base deje de referenciarla.
*   **Regla a futuro:** en storage externo, el orden correcto es siempre *actualizar la base primero, borrar el archivo después*. El coste de un archivo huérfano (unos KB) es infinitamente menor que el de un registro apuntando al vacío.
*   **Nota:** la lógica de "¿lo usa alguien más antes de borrar?" estaba duplicada en dos sitios y con criterios distintos (`count <= 1` en uno, `count === 0` en otro). Ahora es un solo helper, `deleteR2ImageIfUnused()`.

### Lección: una migración aplicada en producción que solo vive en un `git stash` es código perdido
*   **Síntoma:** `023_accumulate_membership_on_renewal.sql` estaba aplicada en producción y documentada en `PROJECT_CONTEXT.md`, pero no existía en `main`. La `024_`, que sí estaba versionada, dependía de las funciones que crea la 023.
*   **Causa:** durante la reversión del modo offline se hizo `git add -A && git stash push`. Eso barrió también archivos que **no** eran del offline y que ya se habían aplicado a la base. Como nunca llegaron a un commit, desaparecieron del repo sin dejar rastro en el historial.
*   **Consecuencias que tenía:** un entorno nuevo reconstruido desde `supabase/migrations/` se habría roto; y `git stash drop` habría perdido definitivamente el código de `apply_membership_purchase` y `approve_payment` — lógica de dinero.
*   **Regla a futuro:** una migración **aplicada** a producción se commitea *antes* de cualquier operación masiva de limpieza. Y al revertir con `git stash push -A`, revisar el listado de archivos barridos uno por uno: `git stash show --name-only`.
*   **Cómo detectarlo:** `ls supabase/migrations/` y buscar huecos en la numeración. Un salto (022, 023 ausentes; 024 presente) es señal de alarma, no de que "esas no hicieron falta".

### Lección: lógica de negocio duplicada no se queda igual — diverge
*   **Síntoma:** `getCheckInShiftValidation` estaba copiada en `today-status-card.tsx` y `client-checkin-button.tsx`. Las copias **ya no eran iguales**: la del botón de la pantalla de Entrada no aplicaba el tope de 2 ingresos por día. Dos pantallas que gobiernan el mismo flujo daban respuestas distintas.
*   **Causa:** se copió para ir rápido, se mejoró una de las dos y nadie tocó la otra. No hay ningún mecanismo que avise de esto: ambas compilan, ambas pasan el lint.
*   **Solución:** fuente única en `src/lib/check-in-shift.ts`, conservando la versión correcta. De paso se descubrió que `lib/dates` **ya tenía** `gymSession()` con el corte de las 14:00 — que las dos copias reimplementaban a mano. Tercera duplicación de la misma regla.
*   **Regla a futuro:** antes de escribir un helper de fecha, turno o estado de membresía, mirar primero `src/lib/dates/` y `src/lib/membership-status.ts`. Y si una regla de negocio se va a usar en dos componentes, nace en `src/lib/`, no dentro de uno de ellos.
*   **Cómo auditarlo:** `grep -rhoE "^(function|const) [A-Za-z_]+" src/components/ | sort | uniq -c | sort -rn | awk '$1>1'` — lista las declaraciones repetidas. Así aparecieron también `addDays` (4 copias idénticas) y `SelectField` (2).

### Lección: configurar `remotePatterns` no sirve de nada si nadie usa `next/image`
*   **Síntoma:** la lista de ejercicios cargaba varios MB de imágenes para pintar miniaturas de 40 px.
*   **Causa:** `next.config.ts` tenía los `remotePatterns` bien puestos, pero **todo** el sistema pintaba con `<img>` plano. `next/image` incluso estaba importado sin usar en 4 componentes — se intentó en algún momento y quedó a medias. El optimizador nunca llegó a ejecutarse.
*   **Medición:** una foto del catálogo son 37 KB en WebP; por `/_next/image?w=64` son **1,2 KB en AVIF**. 31× menos, por miniatura, con ~120 filas en pantalla.
*   **Regla a futuro:** el aviso de ESLint `@next/next/no-img-element` no es cosmético — cada uno es ancho de banda real. Solo justifican `<img>` los casos donde el host no está en `remotePatterns` (p. ej. una `blob:` URL local de un recorte en curso).
*   **Trampa aparte:** `{hostname: '*'}` en `remotePatterns` **no** abre el optimizador a cualquier host (un `*` suelto solo casa un segmento; se comprobó con un host externo → 400). Pero lo parece, y eso invita a asumir que hay un agujero donde no lo hay, o a confiarse. Mejor listar solo los orígenes reales.

### Lección: `raw.githubusercontent.com` no es un CDN de imágenes
*   **Síntoma:** durante esta misma revisión, una descarga de imágenes del catálogo dio timeout de conexión. En producción eso son fotos rotas para el cliente final.
*   **Causa:** 104 de 119 ejercicios apuntaban a `raw.githubusercontent.com`. GitHub no ofrece ese host como CDN, aplica rate-limit por IP y no garantiza disponibilidad ni permanencia de las rutas. De hecho **3 de esas URLs ya daban 404** — imágenes rotas en producción desde la siembra, sin que nadie lo notara.
*   **Solución:** `scripts/migrate-exercise-images-to-r2.mjs` — descarga, convierte a WebP y sube todo a R2. 12,3 MB → 4,8 MB. Las 3 rotas quedaron a NULL (icono de respaldo, mejor que una imagen rota) y se corrigió la migración `025` para no volver a sembrarlas.
*   **Regla a futuro:** una URL de terceros en `media_url` es deuda, no un atajo. Al sembrar catálogo desde una fuente externa, copiarlo a nuestro storage en la misma migración — y **verificar que cada URL responde 200** antes de darla por buena.

---

## 📌 Lecciones Recientes (Sesión 16 - 2026-08-03)

### Lección: `supabase.auth.getUser()` sin manejar el fallo de red puede cerrar la sesión del usuario
*   **Síntoma:** al construir el modo offline se descubrió que, si Supabase no responde (sin internet), el usuario terminaba en la pantalla de login aunque su sesión siguiera siendo válida — el sistema lo trataba igual que "no hay sesión".
*   **Causa:** `getUser()` hace una llamada de red. El código no distinguía "confirmé que no hay usuario" de "no pude confirmar nada porque no hay red" — ambos casos caían en la misma rama (redirigir a login). Se encontró la misma llamada sin proteger en **3 lugares distintos** que no pasaban por el helper compartido (`app/page.tsx`, `bienvenida/page.tsx`, `cliente/rutinas/nueva/page.tsx`), además del propio `middleware.ts`.
*   **Cómo se distinguen los dos casos:** un fallo de red da `AuthRetryableFetchError` con `status: 0` (o la llamada directamente lanza excepción); una sesión realmente ausente/inválida da `AuthSessionMissingError` con `status: 400`. Solo el primer caso debe tratarse como "no se pudo verificar", no como "no hay sesión".
*   **Regla a futuro:** cualquier verificación de sesión en una página o layout debe pasar por `getAuthenticatedSession()` (`src/lib/auth/session.ts`), nunca llamar `supabase.auth.getUser()` directo — así el manejo de este caso queda en un solo lugar. (El modo offline en sí se revirtió esta sesión, pero esta lección sobre el bug de fondo sigue siendo válida y vale la pena tenerla presente si se vuelve a tocar `middleware.ts` o el flujo de auth.)

### Lección: un Service Worker sin acotar puede hacer la app más lenta, no más rápida
*   **Síntoma:** al agregar un Service Worker para el modo offline, toda la app se sintió notablemente más lenta — no solo sin conexión, también con internet normal.
*   **Causa:** el `fetch` handler interceptaba **todas** las peticiones del mismo origen con `event.respondWith(fetch(...))`, incluidas las de navegación interna (RSC) y las de recarga en caliente en desarrollo — eso rompe el streaming de las respuestas y agrega una capa de más en cada petición sin necesidad.
*   **Solución:** acotar el Service Worker a interceptar *solo* lo que de verdad se beneficia de caché (assets estáticos ya inmutables por contrato) y dejar pasar todo lo demás sin `respondWith`.
*   **Regla a futuro:** un Service Worker "de más" es peor que no tener ninguno. Si se vuelve a considerar uno, empezar con el alcance más angosto posible y medir antes/después.

### Lección: la renovación de un plan creaba una membresía nueva en paralelo en vez de sumar los días restantes
*   **Síntoma:** al revisar la base de producción se encontraron clientes con **9 membresías** (varias arrancando el mismo día) — cada vez que renovaban, se creaba una fila nueva en `memberships` en vez de extender la vigente. Los días que el cliente ya había pagado y no había usado simplemente quedaban huérfanos en una membresía vieja que el check-in ya no miraba.
*   **Causa:** el RPC de aprobación de pago siempre hacía `INSERT INTO memberships` con `start_date = hoy`, sin buscar primero si ya había una membresía activa/en gracia a la que sumarle los días.
*   **Trampa al corregirlo:** `days_per_week` (5 o 6) se **deduce** de `total_days` (`≤20 → 5, si no → 6`). Si al acumular días el total cruza ese umbral y se reintentara contar los días ya transcurridos con el `start_date` original, el ritmo nuevo se aplicaría **retroactivamente** y el cliente perdería días ya pagados. La solución reinicia `start_date` a la fecha de la renovación y arrastra el saldo de días restantes calculado con el ritmo de la membresía **anterior** — así el ritmo nuevo solo cuenta hacia adelante.
*   **Solución:** función `apply_membership_purchase()` (migración `023`, conservada en la `024`) — busca la membresía vigente (`active`/`grace`) más lejana en `end_date`, y si existe, la **actualiza** sumando el saldo restante + los días nuevos, en vez de insertar una fila aparte.
*   **Nota:** las membresías solapadas que ya existían en producción **no se consolidaron** (decisión explícita) — la primera renovación de cada cliente afectado las arregla sola en adelante.

## 📌 Lecciones Recientes (Sesión 15 - 2026-07-28)

### Lección: cambiar `next.config.ts` no alcanza con reiniciar el servidor — hay que borrar `.next` también
*   **Síntoma:** al abrir una rutina con una imagen de R2, error en consola: `Invalid src prop ... hostname "pub-....r2.dev" is not configured under images in your next.config.js` — pero el dominio **sí estaba** en `next.config.ts`.
*   **Causa:** Next.js/Turbopack lee `next.config.ts` una sola vez al arrancar (`next dev`) y además cachea la configuración compilada de imágenes dentro de `.next/dev`. Un `npm run dev` normal (sin borrar `.next`) después de editar `next.config.ts` puede seguir sirviendo la config vieja.
*   **Solución:** tras cualquier cambio en `next.config.ts`, matar el proceso, borrar `.next` (`rm -rf .next`) y recién ahí `npm run dev`. Un reinicio simple del proceso no basta.
*   **Capa 2 — la pestaña del navegador también hay que cerrarla, no solo recargar:** incluso con el servidor reiniciado y con la config correcta, el mismo error siguió apareciendo porque la pestaña ya abierta mantenía viva la conexión HMR/Fast Refresh con el bundle cliente viejo (que traía la config de imágenes anterior embebida). Ctrl+Shift+R en la misma pestaña no fue suficiente — hubo que **cerrar la pestaña y abrir una nueva**. Regla a futuro: después de tocar `next.config.ts`, avisar al usuario que cierre la pestaña vieja, no solo que recargue.

### Lección: patrón para agregar una relación "favorito" cliente↔recurso-del-gimnasio cuando el recurso no es propiedad del cliente
*   **Contexto:** `client_exercise_library.is_favorite` funciona porque esa tabla ya es una fila-por-cliente-por-ejercicio. Para rutinas de la biblioteca (`training_routines`, gym-wide, sin fila por cliente) no hay dónde colgar un booleano de favorito sin crear una tabla.
*   **Solución aplicada:** tabla de bookmark dedicada y minimalista (`client_training_routine_favorites`: solo `client_id`, `routine_id`, `UNIQUE`), no una copia de la rutina. La política de INSERT exige que la rutina siga siendo `is_public=true AND is_active=true` en el momento de insertar (misma condición que la RLS de lectura) — así un cliente no puede "favoritar" un id que ni siquiera puede ver.
*   **Regla a futuro:** antes de agregar una tabla nueva por una relación cliente↔recurso, primero verificar si el recurso ya tiene una fila-por-cliente existente (ahí basta una columna); si el recurso es gym-wide/compartido, sí hace falta una tabla de bookmark aparte — no forzar la columna en la tabla del recurso compartido.

## 📌 Lecciones Recientes (Sesión 14 - 2026-07-25)

### Lección: `URL.createObjectURL` + revocar en la limpieza del efecto = imagen invisible bajo React Strict Mode
*   **Síntoma:** el modal de recorte de imagen (`ExerciseImageCropModal`, con `react-easy-crop`) mostraba el marco/grilla del recorte pero **nunca la foto**, tanto en crear como en editar ejercicio.
*   **Causa real (no era CSS):** el código creaba la URL del blob en el estado inicial (`useState(() => URL.createObjectURL(file))`) y la revocaba en la limpieza de un `useEffect` sin cuerpo (`useEffect(() => () => URL.revokeObjectURL(imageSrc), [imageSrc])`). En **desarrollo**, React Strict Mode invoca cada efecto dos veces (monta → limpia → vuelve a montar) para detectar código no idempotente. Como la creación de la URL vivía *fuera* del efecto pero la limpieza *sí* corría en esa doble invocación, la URL quedaba revocada antes de que la imagen llegara a pintarse — y como el componente no se remonta de verdad (Strict Mode reutiliza la misma instancia/estado), el `<img src>` seguía apuntando a esa misma URL ya revocada para siempre.
*   **Pista falsa que se investigó primero:** se sospechó que `react-easy-crop` v6 requería importar un CSS externo (`react-easy-crop/react-easy-crop.css`), porque el paquete expone ese archivo. Se agregó el import, no arregló nada. Al leer el código fuente compilado (`node_modules/react-easy-crop/index.js`) se confirmó que la librería **inyecta sus propios estilos automáticamente en `componentDidMount`** salvo que se pase `disableAutomaticStylesInjection={true}` — el import era redundante, no la causa. Se revirtió.
*   **Solución:** crear la URL **dentro** del mismo efecto que la revoca, guardándola en estado vía `setImageSrc` en vez de en el inicializador perezoso de `useState`. Así, en la segunda pasada de Strict Mode se genera una URL **nueva**, y la que quedó montada nunca fue revocada.
*   **Regla a futuro:** cualquier recurso con lifecycle manual (`URL.createObjectURL`, suscripciones, timers) debe crearse **y** limpiarse dentro del mismo `useEffect`, nunca crearse en el render/estado inicial con la limpieza aparte — es exactamente el patrón que Strict Mode está diseñado para romper en desarrollo. `next build` no detecta esto porque Strict Mode de doble-invocación es **solo de desarrollo**; hay que probarlo con `npm run dev` real, no solo con el build de producción.

### Lección: forzar un valor por defecto en cada tecla rompe la posibilidad de borrar un input numérico
*   **Síntoma:** en "Configuración rápida" (bulk config de series/reps/descanso al agregar ejercicios a una rutina/clase), no se podía borrar el número de un campo — se "rellenaba solo" con 0 apenas se vaciaba.
*   **Causa:** el input (`NumField`) sí manejaba bien el vacío (`value ?? ""`, `onChange` pasaba `null`), pero el handler del padre (`handleUpdateConfig`) hacía `[field]: val ?? 0` — convertía el `null` a `0` en **cada tecla**, no solo al final. El input se re-renderizaba al instante con `0`, dando la sensación de estar bloqueado.
*   **Solución:** guardar el valor tal cual mientras se edita (puede quedar `null`/vacío), y aplicar el default (o `0`) recién al confirmar/enviar, no en cada `onChange`.
*   **Regla a futuro:** cuando un campo numérico controlado "no deja borrarse", sospechar primero de un default/coerción aplicado en el `onChange` del padre, no del input en sí.

## 📌 Lecciones Recientes (Sesión 13 - 2026-07-24)

### Lección: el límite servidor/cliente (Sesión 8 Parte D) vuelve a aparecer con cualquier import transitivo nuevo
*   **Síntoma:** `next build` (Turbopack) → "You're importing a module that depends on next/headers ... in the Pages Router", apuntando a `lib/supabase/server.ts`. `tsc` no vio nada raro — pasó limpio.
*   **Causa:** El nuevo modal `AdjustMembershipModal` (`"use client"`) importaba `computeEffectiveStatus` desde `memberships.service.ts`. Ese archivo importa `createClient` de `@/lib/supabase/server` en su primera línea — así que **cualquier** import de ese service, aunque sea de una función 100% pura, arrastra código server-only al bundle del cliente. Exactamente el mismo patrón que la Lección de Sesión 8 Parte D, con un archivo distinto.
*   **Solución:** se extrajo `computeEffectiveStatus` a `@/lib/membership-status.ts` (sin ningún import de servidor) y `memberships.service.ts` la re-exporta para no romper a los 4 importadores server-side existentes. El componente cliente importa directo de `@/lib/membership-status`.
*   **Regla a futuro:** antes de importar cualquier función "pura" de un archivo en `src/services/*.ts` desde un componente `"use client"`, revisar los imports de la cabecera de ese archivo. Si importa `@/lib/supabase/server` (o cualquier otra cosa server-only), **no importar de ahí** — mover la función a `src/lib/` o duplicarla. `tsc` no detecta esta clase de error, **solo `next build` lo confirma** (ya anotado en Sesión 8, se repite aquí porque volvió a pasar).

## 📌 Lecciones Recientes (Sesión 12 - 2026-07-24)

### Lección: para saber si un usuario tiene contraseña, leer `encrypted_password`, no los providers
*   **Contexto:** Tras activar Google Sign-In, las cuentas nuevas entran sin contraseña y quedaban sin forma de crear una (el formulario solo ofrecía "cambiar contraseña", que exige la actual — inexistente).
*   **Trampa:** La tentación es inferirlo desde `user.identities` (si incluye el provider `email` → tiene contraseña). En los datos actuales la correlación es exacta (`google`→sin password; `email` y `email,google`→con password), **pero no es fuente de verdad**: depende de si GoTrue agrega la identidad `email` al llamar `updateUser({password})` en una cuenta OAuth, algo que no está garantizado entre versiones. Si no la agrega, tras crear la contraseña el formulario seguiría en modo "crear" y permitiría cambiarla sin pedir la actual.
*   **Solución:** RPC `current_user_has_password()` (`SECURITY DEFINER`) que lee `auth.users.encrypted_password` del propio `auth.uid()` y devuelve solo un booleano. `auth.users` no es accesible por PostgREST ni por el admin API (que tampoco expone el hash), así que la RPC es la única vía limpia desde la app.
*   **Defensa en profundidad:** `setPasswordAction` (alta sin contraseña actual) **re-verifica con la misma RPC** que la cuenta no tenga ya contraseña. Sin esa guarda, manipular el frontend permitiría cambiar la contraseña sin conocer la anterior.

### Lección: tras crear una RPC hay que regenerar `database.types.ts` (no parchear con `as any`)
*   **Síntoma:** `supabase.rpc("current_user_has_password")` → TS2345, el literal no es asignable a la unión de RPCs conocidas.
*   **Causa:** `database.types.ts` es **autogenerado** y no se actualiza solo. Se habían acumulado 3 RPCs sin tipar (`admin_search_clients`, `process_client_check_in`, `current_user_has_password`) porque nunca se regeneró tras sus migraciones.
*   **Parche que se usaba (ya eliminado):** `(supabase as any).rpc(...)`. El problema es que `as any` no apaga solo el nombre — apaga **también los argumentos y el valor de retorno**: un `p_serch` mal escrito o un cambio en lo que devuelve la función pasaban sin aviso hasta runtime.
*   **Solución definitiva (aplicada):** regenerar los tipos y quitar los 5 casts. `tsc` quedó en 0 errores: las **tablas ya estaban sincronizadas**, solo faltaban las funciones (el archivo creció apenas 20 líneas).
*   **Regla a futuro:** después de aplicar una migración que cree/modifique una RPC o una columna, **regenerar los tipos** en el mismo cambio. No hay script en `package.json`; se hace con el CLI de Supabase o con la herramienta MCP `generate_typescript_types`.
*   **Gotcha 1 — args con DEFAULT:** los tipos generados marcan opcional (`p_search?: string`) todo argumento con `DEFAULT` en SQL, así que **no acepta `null`**. Para "sin filtro" hay que omitir la clave o pasar `undefined` (se elimina del JSON y aplica el `DEFAULT NULL`). Verificado que da resultados idénticos a pasar `null` explícito.
*   **Gotcha 2 — RPC que devuelve `json`:** se tipa como `Json` (unión con arrays y primitivas), así que `data as MiInterface` falla con TS2352. Hay que pasar por `data as unknown as MiInterface`.

### Nota: los `as any` sobre TABLAS son otra cosa
Quedan ~38 casts `as any` sobre operaciones de tabla (sobre todo en `api/analizar-comprobante/route.ts`, `exercises.actions.ts` y `exercises.service.ts`). **No** vienen de tipos desactualizados —se verificó que esas tablas y columnas ya estaban tipadas correctamente—, sino del prototipado rápido (ver Lección #3 de la Sesión 2). Limpiarlos es una tarea aparte y opcional.

## 📌 Lecciones Recientes (Sesión 11 - 2026-07-24)

### Lección: el hash perceptual (dHash) da falsos positivos en comprobantes que comparten plantilla
*   **Síntoma:** La pasarela de pago con IA rechazaba comprobantes **válidos** con "🚫 Comprobante ya registrado", y encima le metía un strike de fraude al cliente (a los 2 strikes → bloqueo 24h, a los 3 → bloqueo permanente). Clientes honestos quedaban bloqueados.
*   **Causa:** La 3ª capa antifraude (`analizar-comprobante/route.ts`) usaba un dHash (imagen reducida a 9×8 px en gris) con umbral de similitud "≤8 bits sobre 64". Pero **todos los comprobantes de una misma billetera (Nequi) comparten plantilla** (mismo header verde, layout, avatar). Al reducirlos a 72 px, el nombre/monto/referencia desaparecen y solo queda la plantilla — idéntica. Verificado en producción: dos comprobantes **legítimos distintos** (referencias, montos y clientes diferentes) colisionaban a distancia Hamming **3** y **8**, ambos ≤8 → marcados como duplicados. Bajar el umbral no alcanzaba (uno estaba a distancia 3).
*   **Solución:** El dHash perceptual ahora **solo corre como red de seguridad cuando la IA no pudo leer la referencia** (`!datos.referenciaDetectada`). Si hay referencia, la unicidad la garantizan el hash exacto SHA-256 (misma imagen) + la referencia repetida (misma transacción), que son los verdaderos IDs de una transacción. Además, un match perceptual **ya no rechaza ni da strike**: solo baja `aiValido` para mandar el pago a revisión manual del admin. Regla a futuro: no usar hashes perceptuales de baja resolución como bloqueo duro sobre documentos que comparten plantilla.

### Lección: distinguir "duplicado exacto" de "similitud perceptual" antes de castigar
*   **Contexto:** El sistema mezclaba ambas señales en una sola variable `imagenRepetida`, así que una simple similitud perceptual disparaba el mismo strike que una imagen idéntica byte a byte.
*   **Solución:** Separar `imagenRepetida` (hash exacto → bloqueo + strike, es fraude real) de `imagenSimilar` (perceptual → solo revisión manual, sin strike). Solo penalizar con strike las señales de alta confianza (hash exacto, referencia repetida).

## 📌 Lecciones Recientes (Sesión 10 - 2026-07-22)

### Lección: Copiar una estructura anidada (día→bloque→ejercicio) con un `for` secuencial es lento
*   **Síntoma:** Asignar una rutina de la biblioteca a un cliente tardaba ~2 segundos en abrir el editor.
*   **Causa:** `assignTrainingRoutineToClientAction` hacía `insert`+`select` por cada día, y dentro `insert`+`select`+`insert` por cada bloque, todo con `await` secuencial (N+1 clásico) — con pocos bloques ya son 15+ idas y vueltas a Postgres en fila.
*   **Solución:** Traer todos los bloques/ejercicios de golpe con `.in(routineDayId/blockId, [...])`, insertar días/bloques/ejercicios en lote (un solo `insert([...])` por nivel) y correr en paralelo lo que no depende entre sí (`Promise.all`). El mapeo id-viejo→id-nuevo se resuelve por índice de array, apoyándose en que Postgres devuelve `RETURNING` en el mismo orden que el `VALUES` insertado.

## 📌 Lecciones Recientes (Sesión 9 - 2026-07-17)

### Lección: `no-store` global en HTML mata el prefetch de Next (sensación de "doble clic")
*   **Síntoma:** La navegación se sentía lenta y a veces había que tocar dos veces los botones de la barra.
*   **Causa:** `next.config.ts` mandaba `Cache-Control: no-store` a todas las páginas HTML. Eso desactiva el prefetch de `<Link>` y el Router Cache del cliente → cada navegación es un ida-y-vuelta completo al servidor, sin feedback inmediato.
*   **Solución:** Quitar el `no-store` global (mantener assets inmutables) + `experimental.staleTimes: { dynamic: 30, static: 180 }`. Como las páginas son `force-dynamic` y las mutaciones usan `revalidatePath`, sigue mostrando datos frescos. Complemento: `useLinkStatus` para feedback al instante y `loading.tsx` por ruta.

### Lección: Next 16 cambió la firma de `revalidateTag` — usar `updateTag` para "leer tus propios cambios"
*   **Síntoma:** `revalidateTag("plans")` con un solo argumento da error TS2554 "Expected 2 arguments".
*   **Causa:** En Next 16 `revalidateTag(tag, profile)` pide un 2º argumento (perfil, ej. `'max'`) y usa semántica stale-while-revalidate (muestra lo viejo un instante y refresca por detrás).
*   **Solución:** Para que el admin vea su cambio de inmediato al reabrir, usar **`updateTag(tag)`** (1 argumento, expiración inmediata). Solo funciona dentro de Server Actions (no en Route Handlers). Internamente usa el mismo `revalidate()` que invalida los tags de `unstable_cache`, así que es compatible con el caché ya existente (`plans`, `gym`).

### Lección: Auth duplicada por página en el panel admin
*   **Síntoma:** Cada navegación admin era más lenta de lo esperado.
*   **Causa:** 12 páginas admin repetían `supabase.auth.getUser()` (llamada de red) + `profiles.select("role")` para el guard, sin deduplicar con el `getAuthenticatedSession()` que el layout ya ejecuta (React `cache()` solo deduplica si se llama al MISMO helper).
*   **Solución:** Guard centralizado `requireAdminSession()` en `src/lib/auth/session.ts` que reutiliza `getAuthenticatedSession()`. Regla a futuro: en páginas admin NO llamar `getUser()` directo; usar `requireAdminSession()`.

### Lección: filtrar por "estado de membresía" en SQL sin duplicar la lógica de calendario
*   **Contexto:** El estado efectivo (activo/gracia/agotado) se calcula en JS con `eligibleDaysElapsed` (cuenta días hábiles). Replicar eso en SQL es frágil.
*   **Solución adoptada:** La RPC `admin_search_clients` filtra "activo" de forma **date-based** (`status <> 'cancelled' AND hoy <= end_date + grace_days`); el badge exacto de cada tarjeta se sigue calculando en JS. En un caso borde (agotado por días transcurridos) el filtro y el badge pueden diferir — es intencional para no duplicar la lógica.

---

## 📌 Lecciones Recientes (Sesión 2 - 2026-07-06)

### Lección #1: RLS de DELETE Silencioso en Supabase
*   **Síntoma:** Al presionar "Desmarcar día de hoy", la barra del cliente cambiaba su estado visual a desmarcado, pero al refrescar la página el día seguía marcado como completado. No se reportaba ningún error de consola.
*   **Causa:** La tabla `client_routine_sessions` carecía de política `DELETE` para usuarios no administradores. Supabase bloquea la operación silenciosamente (afecta a 0 filas) en lugar de retornar un error de restricción de RLS, lo que provocaba falsos positivos en el frontend.
*   **Solución:** Crear una política de borrado acotada temporalmente a la fecha actual para mantener el control y auditoría del historial de días pasados:
    ```sql
    CREATE POLICY "client_delete_own_sessions_today" ON client_routine_sessions FOR DELETE
      USING (
        session_date = CURRENT_DATE
        AND EXISTS (
          SELECT 1 FROM clients
          WHERE clients.id = client_routine_sessions.client_id
            AND clients.profile_id = auth.uid()
        )
      );
    ```

### Lección #2: Payload de Actualización y Tratamiento de Campos Vacíos (null vs undefined)
*   **Síntoma:** Al borrar una nota o descripción guardada previamente en una rutina, la base de datos conservaba el texto antiguo y no lo vaciaba, a pesar de que el formulario se enviaba y guardaba sin errores visuales.
*   **Causa:** El mapeo del frontend utilizaba `value || undefined`. En Supabase JS, las propiedades con valor `undefined` se omiten del payload de la consulta de actualización (`UPDATE`), evitando que el campo se limpie en PostgreSQL.
*   **Solución:** Mapear los campos de texto vacíos a `null` explícito (`value || null`) y ajustar las interfaces correspondientes de TypeScript para permitir tipos anulables (`string | null`), garantizando el vaciado real de los campos en base de datos.

### Lección #3: Transición de Prototipado Rápido a Tipado Estricto en Componentes Compartidos
*   **Síntoma:** Resolver el casting temporal de base de datos a `any` (`(await createClient()) as any`) eliminaba warnings pero debilitaba el tipado. Al revertirlo tras regenerar los esquemas de Supabase, surgieron errores de compatibilidad en componentes de UI genéricos (como `BlockCard` y `ExerciseRow`) que eran consumidos por múltiples módulos.
*   **Solución:** En lugar de des-tipar a `any` o duplicar componentes, utilizar **tipos unión** en las props importando las firmas correspondientes de cada módulo (`ClassBlock | RoutineBlock | RoutineTemplateBlock`), permitiendo la reutilización del 100% de la lógica visual sin comprometer la compilación estricta de TypeScript.

---

## 📌 Historial de Lecciones y Errores (Sesiones Anteriores)

### Lección #4: Bloqueo de RLS en Tablas Compartidas (Biblioteca de Ejercicios)
*   **Síntoma:** El selector de ejercicios para añadir a una rutina del cliente cargaba vacío ("Sin resultados") a pesar de que la base de datos tenía 99 registros.
*   **Causa:** La política de Row Level Security (RLS) en la tabla `exercises` solo permitía operaciones (`ALL`) a usuarios con rol administrador (`is_admin()`). La sesión del cliente, al no ser admin, era bloqueada por el motor de base de datos en las peticiones del componente.
*   **Solución:** Crear una política de selección (`SELECT`) específica para usuarios autenticados que pertenezcan al mismo gimnasio:
    ```sql
    CREATE POLICY "select_exercises_authenticated" ON exercises FOR SELECT
      TO authenticated
      USING (gym_id = (SELECT current_gym_id()));
    ```

### Lección #5: Optimización de Consultas Cruzadas y Caché de Fechas en el Calendario
*   **Síntoma:** Al hacer interactivo el calendario del cliente (permitiendo navegar por meses anteriores), requerir consultas mensuales estáticas desde el servidor aumentaba la latencia y complejidad de código.
*   **Solución:** Se eliminó la query mensual estática y se reutilizó la consulta de asistencias generales (límite 90 días). Al mapear estas 90 asistencias locales al calendario, este puede renderizar cualquier mes en caché local instantáneamente sin realizar viajes adicionales al servidor de Supabase.

### Lección #6: Manejo de Tipos de Supabase TS Desactualizados
*   **Síntoma:** Al agregar nuevas tablas (como `client_routines`) vía migraciones locales, TypeScript falla al compilar debido a que los tipos autogenerados locales (`database.types.ts`) no tienen las nuevas estructuras.
*   **Solución:** Para mantener un desarrollo ágil y no regenerar los esquemas locales continuamente durante la iteración rápida, castear el cliente de Supabase temporalmente a `any` (`(await createClient()) as any`) en las actions y servicios, tipando los callbacks y variables de forma manual y explícita.

### Lección #7: Bucket de Storage Público vs Privado para Assets
*   **Síntoma:** Para mostrar imágenes asociadas a ejercicios en las rutinas de los clientes, usar un bucket privado obligaba a firmar URLs temporalmente, lo cual sumaba llamadas extras y tiempos de expiración molestos.
*   **Solución:** Crear el bucket `exercises` como público (`public: true`). De este modo, la imagen se almacena con seguridad de subida (solo usuarios autenticados vía RLS) pero se sirve directamente de forma estática con `getPublicUrl` sin firmas temporales.

### Lección #8: Migración de Zod APIs (ERR-001)
*   **Gotcha:** En Zod v4, el parámetro `invalid_type_error` fue removido. Para pasar mensajes personalizados ante incompatibilidades de tipos, se debe pasar el parámetro general `message` dentro de las opciones de validación (ej. `z.number({ message: "..." })`).

### Lección #9: Compatibilidad del Tipo Jsonb en Supabase con TypeScript (ERR-002)
*   **Gotcha:** El tipo `Json` autogenerado por Supabase no se puede asignar directamente a tipos estrictos como `Record<string, unknown>`. Se debe usar `unknown` o realizar un casting explícito para evitar fallas de tipado en compilación estricta de TypeScript.

### Lección #10: Limitaciones de Server Components con Librerías del Lado del Cliente (ERR-003)
*   **Gotcha:** Librerías que acceden a APIs del navegador (como `html5-qrcode` para la cámara) causan fallos si se renderizan de lado del servidor. No basta con usar `dynamic` con `ssr: false` dentro de un Server Component.
*   **Solución:** Crear un wrapper exclusivo del cliente (`'use client'`) que cargue la librería dinámicamente con `ssr: false`, e importar este wrapper desde la página del servidor.

### Lección #11: Conflicto de Rutas Paralelas en Turbopack (ERR-004)
*   **Gotcha:** Los Route Groups de Next.js (como `(admin)` y `(cliente)`) no crean segmentos de URL física. Si en ambos grupos tienes una carpeta `dashboard/page.tsx`, Turbopack los registrará bajo el mismo path `/dashboard` y lanzará un error de colisión de rutas. Las páginas deben tener subcarpetas exclusivas (ej. `/cliente/dashboard` y `/admin/dashboard`).

### Lección #12: Localización de Errores de Supabase Auth (ERR-005)
*   **Gotcha:** Las respuestas de error de autenticación de Supabase (como "Invalid login credentials") vienen por defecto en inglés. Se debe implementar una función helper de traducción (`traducirErrorAuth`) que intercepte y asocie los textos comunes a traducciones personalizadas en español.

### Lección #13: Saltarse la Confirmación de Correo en Registro Directo (ERR-006)
*   **Gotcha:** Por defecto, Supabase requiere confirmación de email al registrarse. Si deseas que el usuario ingrese de forma inmediata, se debe usar la API administrativa de autenticación `admin.auth.admin.createUser({ email_confirm: true })`.

### Lección #14: Limpieza e Integridad de Consultas de Clientes por Rol (ERR-007)
*   **Gotcha:** Si el administrador del sistema comparte la tabla `profiles` pero tiene un rol de `admin`, las consultas de clientes generales pueden listar al administrador como cliente si no se filtra explícitamente mediante un join inner con `profile.role = 'client'`.

### Lección #15: Permiso de Ejecución a authenticated para Funciones RPC (ERR-008)
*   **Gotcha:** Funciones de PostgreSQL marcadas con `SECURITY DEFINER` (como `approve_payment`) no son ejecutables por usuarios autenticados por defecto. Es necesario otorgar privilegios de ejecución de forma explícita en las migraciones:
    ```sql
    GRANT EXECUTE ON FUNCTION public.approve_payment TO authenticated;
    ```

### Lección #16: Seguridad RLS en Operaciones de Escritura del Admin (ERR-009)
*   **Gotcha:** Acciones del lado del servidor ejecutadas por administradores pueden fallar si utilizan el cliente Supabase con el RLS del usuario actual y la tabla restringe los updates. En acciones de configuración administrativa global, es preferible utilizar el cliente de servicio (`createAdminClient()`) para saltarse el RLS.

### Lección #17: Soporte y API Keys en el Análisis de Gemini (ERR-010)
*   **Gotcha:** El modelo `gemini-2.0-flash` fue descontinuado por Google. Asegurarse siempre de utilizar la versión estable más reciente (como `gemini-2.5-flash`) y validar que la variable `GEMINI_API_KEY` esté configurada correctamente tanto en el entorno local como en la nube (Vercel).

### Lección #18: Cabeceras de Políticas de Permisos en PWA (ERR-011)
*   **Gotcha:** Configurar `Permissions-Policy: camera=()` en cabeceras HTTP del servidor (como `vercel.json`) desactiva el acceso a la cámara para cualquier script en todo el sitio, provocando errores `NotAllowedError` al escanear códigos QR en iOS/Android. Se debe usar `camera=(self)` para habilitarla en el dominio de la app.

### Lección #19: Lógica Monetaria Centavos vs Pesos en APIs de Pago (ERR-012)
*   **Gotcha:** Trabajar montos monetarios mezclando centavos (monto * 100) y pesos planos en diferentes puntos del código provoca discrepancias numéricas y fallos de coincidencia falsos. Define siempre un estándar (ej. guardar en centavos en DB pero formatear con divisiones locales en UI) y normaliza los valores antes de compararlos en las validaciones de IA.

---

## 📌 Lecciones Recientes (Sesión 6 - 2026-07-09)

### Lección #20: N+1 Queries en Relaciones Anidadas (Rutinas/Plantillas)
*   **Síntoma:** `/cliente/rutinas` y el detalle de una rutina cargaban en 2-3 segundos, sin fluidez, incluso con pocos datos (4 días x 4 bloques).
*   **Causa:** `getRoutineWithDays`/`getRoutineTemplateWithDays` resolvían días → bloques → ejercicios con `for` anidados, haciendo un `await` secuencial por cada bloque y por cada ejercicio (~10 round-trips a Supabase para una sola rutina).
*   **Solución:** Reemplazar el loop por una única consulta con `select` anidado de PostgREST (`dias.select("*, blocks:tabla_bloques(*, exercises:tabla_ejercicios(*, exercise:exercises(...)))")`), usando `.order(columna, { referencedTable: "alias" })` para ordenar cada nivel anidado. Medido antes/después contra el proyecto real: de 2-3s a 0.4-0.7s. Aplica a cualquier jerarquía padre→hijo→nieto que hoy se resuelva con loops de `await` secuenciales.

### Lección #21: Modelo "Default + Override" para Preferencias Personales sobre Datos Compartidos
*   **Síntoma:** Al construir la biblioteca personal de ejercicios del cliente, la primera versión ("opt-in": vacía hasta que el cliente agrega uno por uno) obligaba a poblarla manualmente incluso para los ejercicios que el gym ya tiene activos — mala UX por defecto.
*   **Solución:** En vez de que la ausencia de una fila en la tabla puente (`client_exercise_library`) signifique "no incluido", se interpreta como "usar el default" (`overrides.get(id) ?? exercise.is_active`). Una fila explícita (`is_active: true/false`) representa una decisión consciente del usuario que **siempre gana** sobre el estado del recurso compartido, incluso si ese estado cambia después (ej. el admin desactiva un ejercicio que el cliente ya había agregado a mano — sigue apareciéndole). Este patrón evita tener que hacer un backfill masivo de filas al momento de lanzar la feature y se mantiene correcto automáticamente si el recurso compartido crece.

### Lección #22: Lint Local (`npx eslint`) No Predice Fallos de `next build`
*   **Gotcha:** El proyecto usa `(supabase as any)` deliberadamente (ver Lección #6) en varios archivos nuevos, lo cual dispara errores `@typescript-eslint/no-explicit-any` al correr `npx eslint` directo sobre esos archivos — pero `npm run build` (que este proyecto sí ejecuta limpio, según sesiones previas) no falla por esto. No asumir que un error reportado por `eslint` en modo standalone bloquea el build de Next.js; verificar con `npm run build` (o al menos `npx tsc --noEmit`, que es el chequeo que realmente importa para la compilación) antes de "arreglar" warnings de lint que son ruido conocido y aceptado en este proyecto.
