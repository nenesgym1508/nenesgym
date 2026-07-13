# Bitácora de Errores - Nenes Gym

Registro de lecciones de valor técnico, retos arquitectónicos y soluciones complejas resueltos durante el ciclo de vida del sistema.

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
