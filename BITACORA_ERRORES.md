# Bitácora de Errores - Nenes Gym

Registro de lecciones de valor técnico, retos arquitectónicos y soluciones complejas resueltos durante el ciclo de vida del sistema.

---

## [2026-07-18] - Fallo del Escáner QR en PC/Laptops por Inexistencia de Cámara Trasera (facingMode: environment)

### Contexto del Error
Al intentar activar el escáner QR en ordenadores de escritorio o laptops, el lector fallaba de inmediato arrojando una excepción en consola (`TypeError` o error de dispositivo) y mostrando el mensaje rojo *"No se pudo acceder a la cámara"*.

### Análisis Técnico y Lección
El lector QR estaba configurado con `{ facingMode: "environment" }` de manera estricta para forzar el uso de la cámara trasera en dispositivos móviles (que es el caso de uso principal). 

Sin embargo, los ordenadores de escritorio y portátiles comunes no poseen una cámara trasera (environment), sino únicamente una cámara frontal o webcam (`user`). Cuando se solicita un `facingMode` restrictivo que no existe en el sistema, la API WebRTC / `getUserMedia` falla y el SDK de `html5-qrcode` arroja un error que detiene el flujo de la cámara.

**Lección general:** En interfaces web que requieran captura multimedia (video/audio), no se debe asumir que el dispositivo final contará con múltiples cámaras. Siempre se debe diseñar una cadena de promesas tolerant a fallos (fallback) que intente con la opción óptima (`environment`), y en caso de error, disminuya la restricción a la cámara predeterminada o frontal (`user`).

### Solución Aplicada
1. Se modificó el método `startScanner` en `qr-scanner.tsx` para envolver la llamada inicial en un bloque `try-catch`.
2. Si falla el inicio con `{ facingMode: "environment" }`, el bloque `catch` reintenta automáticamente la inicialización usando `{ facingMode: "user" }`.
3. Se agregaron validaciones para detectar de manera amigable si el navegador se encuentra en un contexto HTTP inseguro (donde la API de cámara está deshabilitada por diseño del navegador) e instruir adecuadamente al usuario.

---

## [2026-07-18] - Caída en Producción (Crash de Next.js) por Lectura de Cookies dentro de unstable_cache

### Contexto del Error
Tras subir a producción optimizaciones de rendimiento basadas en `unstable_cache`, la pantalla de configuración del administrador (`/admin/mas`) arrojaba un error crítico en tiempo de ejecución ("Algo salió mal") y no lograba renderizar, bloqueando por completo la interfaz de administración.

### Análisis Técnico y Lección
Para encapsular el caché en consultas a tablas con políticas de RLS, usamos `createClient()` (cliente de servidor de Supabase) dentro de las funciones callbacks de `unstable_cache`. 

Sin embargo, `createClient()` lee dinámicamente las cookies y cabeceras de la petición usando hooks internos de Next.js (`next/headers`). Next.js **prohíbe estrictamente** cualquier dependencia de cabeceras o cookies dinámicas dentro de funciones de caché de servidor (`unstable_cache`), ya que el motor de renderizado asume que la función de caché es estática/desacoplada del usuario individual en la compilación inicial. Al ejecutarse en producción, esto dispara un error crítico en tiempo de ejecución (`DYNAMIC_SERVER_USAGE` o excepciones similares).

**Lección general:** Todas las llamadas a bases de datos dentro de `unstable_cache` deben realizarse con clientes completamente desacoplados de cookies o cabeceras del usuario (como `createAdminClient()`). La seguridad y el aislamiento de datos (multi-tenant) se deben garantizar inyectando explícitamente variables/filtros estáticos (como `GYM_ID` o `client_id`) en las condiciones `.eq()` de SQL, en lugar de confiar en políticas de RLS implícitas del cliente HTTP.

### Solución Aplicada
1. Se reemplazó el cliente de cookies `createClient()` por el cliente de servicio administrativo `createAdminClient()` en todas las funciones envueltas en `unstable_cache` (`getGymSettings`, `getTrainingRoutines`, `getAdminRoutines`, `getClientsWithoutRoutine`, `getDailyClasses`, `getWeekMuscleBalance`, `getAvailablePlans`, `getPendingPayments`, `getAllPayments`).
2. Se mantuvieron las cláusulas estrictas de validación de inquilino (`.eq("gym_id", GYM_ID)`) para asegurar que un gimnasio no tenga acceso a los datos de otro en el backend.
3. Se verificó localmente la compilación de producción ejecutando `next build`, resultando en un proceso exitoso y estable.

---

## [2026-07-17] - Consultas anónimas bloqueadas silenciosamente por RLS en Supabase (Planes)

### Contexto del Error
Al intentar listar los planes creados por el gimnasio en el panel del administrador, la pantalla mostraba de forma persistente "Aún no hay planes creados" a pesar de que los planes sí se estaban insertando correctamente en la base de datos de Supabase.

### Análisis Técnico y Lección
Para evitar bugs de cacheado al renderizar la página, el servicio `getAdminPlans()` hacía la petición usando un cliente de Supabase seguro para caché (`getCacheSafeClient`). Este cliente se crea sin cookies del navegador, comportándose como un usuario anónimo (unauthenticated). 

Sin embargo, las políticas de Row-Level Security (RLS) de la tabla `plans` restringen las lecturas únicamente a usuarios autenticados del gimnasio correspondiente. Supabase, al procesar una petición que viola políticas de lectura (SELECT), no arroja un error 400 o una excepción, sino que por diseño del motor Postgres **devuelve un conjunto de datos vacío `[]` de forma silenciosa**. 

**Lección general:** En peticiones donde el caché esté inhabilitado o no sea estático, no se debe usar un cliente anónimo si las tablas están protegidas por RLS. Se debe usar el cliente de servidor autenticado (`createClient` de `@/lib/supabase/server`) que lee y propaga las cookies de sesión del usuario logueado en la cabecera de la petición a Supabase.

### Solución Aplicada
1. Se reemplazó el cliente anónimo en `getAdminPlans` y `getGymSettings` por el cliente del servidor `createClient()`.
2. Se desactivó el uso de `unstable_cache` en estos puntos para asegurar que la revalidación fuera directa y evitar que las peticiones se quedaran congeladas con datos antiguos durante el desarrollo en caliente.

---

## [2026-07-17] - Fallo en la serialización de objetos File en Next.js Server Actions al subir archivos a Storage

### Contexto del Error
Al intentar crear un nuevo ejercicio en la biblioteca y subir una imagen (de hasta 4MB), la carga fallaba y no se obtenía URL pública ni respuesta exitosa de Supabase Storage.

### Análisis Técnico y Lección
Next.js Server Actions procesa los datos del formulario binarios enviando un objeto `File` nativo de la API Web. Sin embargo, en el entorno de backend de Node.js donde corren estas acciones del servidor, pasar este objeto `File` directamente a `supabase.storage.from(...).upload(path, file)` puede causar problemas de serialización en el multipart body builder interno de Supabase JS SDK, provocando cargas incompletas (0 bytes) o fallos de conexión por formato de datos no compatible.

**Lección general:** En el backend de Node.js (incluyendo API Routes y Server Actions), la forma universalmente segura y compatible de subir archivos a buckets de almacenamiento es leerlos y transmitirlos como flujos de datos (`Buffer` o `ArrayBuffer`), no como el objeto `File` del frontend de navegador.

### Solución Aplicada
1. Se modificó `uploadExerciseImageAction` en `exercises.actions.ts` para leer el archivo binario: `const buffer = Buffer.from(await file.arrayBuffer())`.
2. Se pasó el `buffer` resultante a la función de subida en lugar del objeto `file` crudo.
3. Se aplicó preventivamente el mismo fix en la acción de subida de comprobantes de membresía del cliente (`payments.actions.ts`) para evitar fallos futuros en dispositivos móviles.

---

## [2026-07-13] - Diagnóstico de Rendimiento Basado en Código vs. Estado Real de la Base de Datos

### Contexto
Durante una auditoría de rendimiento, un análisis estático del código (grep de `.eq()`/`.order()`/`.gte()` en `src/services/*.service.ts`) identificó como "hallazgo de alto impacto" la supuesta falta de índices compuestos en `attendance(client_id, check_in_date)`, `memberships(client_id, status, end_date)` y `payments(client_id, created_at)`. Se preparó y **se estuvo a punto de aplicar** una migración `CREATE INDEX` en la base de producción de Supabase basada únicamente en ese análisis del código.

### Análisis Técnico y Lección
Antes de ejecutar la migración, se consultó `pg_indexes` directamente contra el proyecto de Supabase (`mcp__Supabase__execute_sql`) y se descubrió que **los tres índices compuestos ya existían** (creados en migraciones previas, invisibles a un grep del código de aplicación porque solo viven en el schema de la base de datos, no en `src/`). Además, un conteo de filas mostró volumen casi nulo (`attendance`: 0, `memberships`: 5, `payments`: 7) — a esa escala ningún índice cambia el tiempo de respuesta de forma medible.

**Regla general:** el código de la aplicación (`src/services/*.ts`) solo muestra qué *columnas* se consultan, nunca qué índices ya existen — esos viven en el schema remoto y son invisibles a `grep`/lectura de archivos. Cualquier recomendación de "falta un índice" basada solo en patrones de consulta en el código es una **hipótesis**, no un hecho, y debe verificarse contra `pg_indexes` (o `EXPLAIN ANALYZE`) antes de tocar la base de producción — igual de importante que el volumen real de filas, porque una migración "seudo-inofensiva" (aditiva, reversible) igual tiene costo de escritura permanente si termina siendo innecesaria.

### Solución Aplicada
1. `select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' and tablename in (...)` antes de escribir cualquier `CREATE INDEX`.
2. Conteo de filas por tabla (`select count(*) from ...`) para confirmar si el volumen justifica la optimización.
3. Al confirmar que ya había cobertura adecuada y volumen insignificante, se descartó la migración y se documentó la corrección en vez de aplicarla "porque ya estaba escrita".

### Cómo Detectarlo a Futuro
- Antes de proponer o aplicar cualquier migración de índices: `mcp__Supabase__execute_sql` contra `pg_indexes` primero, nunca asumir desde el código de aplicación.
- Un diagnóstico de rendimiento basado solo en lectura de código (sin tocar la base ni medir volumen real) debe presentarse como *hipótesis a verificar*, no como hallazgo confirmado.

---

## [2026-07-12] - Código Server-Only Filtrado a un Client Component vía Import Transitivo

### Contexto del Error
Al construir `clients-list.tsx` (`"use client"`) para el buscador de `/admin/clientes`, se importó `computeEffectiveStatus` desde `src/services/memberships.service.ts` — una función pura de cálculo de fechas, sin ninguna dependencia de Supabase en su cuerpo. Al correr `next build`:
```text
You're importing a module that depends on "next/headers". This API is only
available in Server Components in the App Router, but you are using it in
the Pages Router.
  ./src/lib/supabase/server.ts:2:1
```
`npx tsc --noEmit` no detectó nada — la compilación de tipos pasó limpia en todo momento. El error solo aparece con el bundler de Next.js (`next build` / `next dev`), porque es un problema de **límite de módulos**, no de tipos.

### Análisis Técnico y Lección
`memberships.service.ts` importa `createClient` de `@/lib/supabase/server` (que usa `next/headers`) en su **cabecera**, junto a otras funciones que sí hacen queries a Supabase. Cuando un Client Component importa **cualquier símbolo** de ese archivo — incluso una función pura sin uso de `createClient` — el bundler igual incluye el módulo completo (con su import de `next/headers`) en el bundle del cliente, porque JavaScript/ESM no permite "tree-shakear" el import de nivel de módulo sin analizar si el símbolo importado lo usa.

**Regla general:** en Next.js App Router, un archivo de servicio que mezcla queries a Supabase (server-only) con funciones puras de utilidad **no es seguro de importar desde un Client Component**, sin importar qué símbolo específico se use. El acoplamiento es a nivel de archivo, no de función.

### Solución Aplicada
1. Mover el cálculo que dependía de `computeEffectiveStatus` al Server Component (`admin/clientes/page.tsx`), que ya tenía permiso de importar el servicio.
2. Pasar únicamente los **valores ya calculados** (`effectiveStatus`, `remainingDays`, etc.) como props planas al Client Component, en vez de pasarle la función o los datos crudos para que la recalcule.
3. `ClientsList` (client) quedó sin ningún import de `memberships.service.ts` — solo recibe datos, es puramente presentacional.

### Cómo Detectarlo a Futuro
- `tsc --noEmit` **no sirve** para esta clase de error — solo `next build` (o `next dev` al visitar la ruta) lo revela.
- Antes de importar algo en un archivo `"use client"`, verificar qué más importa ese módulo en su cabecera, no solo si el símbolo puntual es "puro".
- Preferir que los Server Components precalculen y pasen datos planos, en vez de que los Client Components importen funciones de servicios con acceso a DB.

---

## [2026-07-11] - Error de Tipos Autogenerados en Rutas de Next.js (Fase de Consolidación de Navegación)

### Contexto del Error
Al reestructurar e introducir la nueva ruta `/admin/entrenamiento` y modificar la constante de rutas en `src/constants/routes.ts`, se ejecutó una verificación estática de TypeScript mediante `tsc --noEmit`. La compilación falló con errores de sintaxis y tipos dentro de la carpeta temporal `.next`:
```text
.next/dev/types/routes.d.ts(105,6): error TS1109: Expression expected.
.next/dev/types/routes.d.ts(106,4): error TS1109: Expression expected.
.next/dev/types/routes.d.ts(112,1): error TS1160: Unterminated template literal.
```

Al intentar limpiar y volver a compilar TypeScript, los tipos del validador de rutas seguían fallando debido a la falta del archivo de rutas compilado en `.next/dev/types/routes.js`:
```text
.next/dev/types/validator.ts(5,79): error TS2307: Cannot find module './routes.js' or its corresponding type declarations.
```

### Análisis Técnico y Lección
Next.js autogenera definiciones de tipo dinámicas para las rutas declarativas en la carpeta `.next/dev` durante la ejecución en desarrollo (`next dev`) o construcción (`next build`). Cuando se modifican rutas, si hay procesos cacheados o archivos temporales desactualizados, `tsc` compila contra los archivos `.d.ts` viejos o parcialmente escritos, produciendo errores sintácticos falsos positivos dentro de la carpeta `.next` que impiden la compilación de TypeScript a nivel global en el repositorio.

### Solución Aplicada
1. Eliminar de forma recursiva y forzada la carpeta temporal `.next`:
   ```powershell
   Remove-Item -Recurse -Force .next
   ```
2. Ejecutar un build limpio de producción (`next build`), lo que regenera de forma segura el validador, las rutas y las definiciones de tipos con el estado actual y real del código en la carpeta `src/constants/routes.ts`:
   ```powershell
   npx.cmd next build
   ```
3. Esto restablece la sincronización de tipos y permite que la compilación de TypeScript finalice exitosamente.

---

## Error: Next.js Cache Invalidation no refresca la UI usando updateTag

### Sntoma
Al crear, editar o cambiar el estado de un plan, as como al actualizar configuraciones del gimnasio, los cambios se guardaban correctamente en la base de datos (Supabase), pero la interfaz de usuario segua mostrando datos antiguos (ej: "An no hay planes creados").

### Anlisis Tcnico y Leccin
En la versin 1.5.0 se introdujo la invalidacin mediante `updateTag(tag)` para intentar forzar la lectura del cach modificado. Sin embargo, los datos estaban cacheados utilizando `unstable_cache` de Next.js, el cual est estrictamente ligado a la funcin de revalidacin tradicional `revalidateTag(tag)`. La llamada a `updateTag` (introducida experimentalmente en Next 16) no elimina limpiamente las entradas almacenadas por `unstable_cache`, provocando que la UI siga sirviendo respuestas stale (viejas).

### Solucin Aplicada
1. Se modificaron los Server Actions (`savePlanAction`, `setPlanActiveAction`, `updateGymSettingsAction`) en `src/actions/admin.actions.ts` para que importen y utilicen `revalidateTag` en lugar de `updateTag.
2. Ahora las cachs vinculadas a `unstable_cache` se purgan correctamente en Vercel/Next.js, refrescando la interfaz en la siguiente navegacin inmediatamente.
