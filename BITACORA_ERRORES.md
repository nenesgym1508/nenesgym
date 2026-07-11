# Bitácora de Errores - Nenes Gym

Registro de lecciones de valor técnico, retos arquitectónicos y soluciones complejas resueltos durante el ciclo de vida del sistema.

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
