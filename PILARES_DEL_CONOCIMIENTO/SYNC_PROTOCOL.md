# 🔄 Protocolo de Sincronización de Contexto (SYNC_PROTOCOL)

Este documento es una **instrucción maestra** para cualquier Agente de IA que trabaje en este proyecto. Debe ejecutarse obligatoriamente al final de cada sesión o cuando el usuario solicite "sincronizar".

---

## 📋 El Objetivo
Garantizar que la "Memoria Organizacional" del proyecto esté siempre actualizada y distribuida correctamente entre los 4 pilares de contexto, evitando errores por falta de información en sesiones futuras.

---

## 🛠️ Los 4 Pilares de Contexto

### 1. `PROJECT_CONTEXT.md` (El Presente Técnico)
*   **Qué actualizar:** Nuevas reglas de negocio, cambios en la arquitectura, nuevas tablas en la DB, restricciones de seguridad o flujos críticos (ej. cómo se generan los IDs).
*   **Prioridad:** Evitar que la IA rompa lo que ya funciona.

### 2. `LECCIONES_APRENDIDAS.md` (La Memoria de Errores)
*   **Qué actualizar:** Bugs difíciles de resolver, "gotchas" de librerías, soluciones a problemas de performance, o lógica de negocio que resultó confusa.
*   **Prioridad:** No cometer el mismo error dos veces.

### 3. `CHANGELOG.md` (El Registro de Trabajo)
*   **Qué actualizar:** Un resumen cronológico de la sesión actual: qué se hizo, qué archivos se tocaron y qué falta por hacer.
*   **Prioridad:** Mantener el orden del progreso.

### 4. `ROADMAP_VISION.md` (El Futuro Estratégico)
*   **Qué actualizar:** Nuevas ideas mencionadas por el usuario, planes de expansión, bocetos de automatización o cambios en el enfoque del negocio.
*   **Prioridad:** Alinear los desarrollos técnicos con la visión a largo plazo.

---

## 🚀 Instrucción de Execution (Para la IA)

Cuando se solicite una sincronización, sigue estos pasos:

1.  **Analiza la Sesión:** Revisa todo el historial de la conversación actual.
2.  **Distribuye la Información:**
    *   ¿Hubo un bug raro? → **Lecciones**.
    *   ¿El usuario propuso algo para el futuro? → **Roadmap**.
    *   ¿Cambiamos una regla de cómo funciona el sistema? → **Context**.
    *   ¿Qué tareas completamos? → **Changelog**.
3.  **Actualiza los Archivos:** Realiza ediciones precisas en los 4 archivos `.md`.
4.  **Informa al Usuario:** Confirma que el conocimiento ha sido blindado y resume brevemente qué se movió a dónde.

---
**IMPORTANTE:** Si no estás seguro de dónde va una pieza de información, prefiere documentarla en el `CHANGELOG` y preguntar al usuario. ¡El contexto es la base del éxito!
