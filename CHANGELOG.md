# Changelog - Nenes Gym

Todos los cambios notables en este proyecto serán documentados en este archivo.

---

## [1.0.0] - 2026-07-11

### Añadido
- **Página de Entrenamiento (Admin Hub)**: Nueva página `/admin/entrenamiento` que consolida el acceso a Clases, Rutinas y Biblioteca de Ejercicios.
- **Componente RoutinesList**: Listado unificado con filtros por chips de estado, buscador en tiempo real por nombre de rutina/cliente, y layout responsivo móvil.

### Modificado
- **Navegación Inferior (Bottom Nav)**: Fusión de las pestañas "Clases" y "Rutinas" en una única pestaña "Entrenamiento" con coincidencia inteligente de rutas activas mediante `matchPrefixes`.
- **Flujo de Creación de Rutina (Admin)**: Formulario paso a paso que obliga a seleccionar primero el cliente, y ofrece selección de método visual (En blanco, Plantilla, Clase) con chips interactivos idénticos a los del cliente.
- **Menú Contextual del Editor**: Adaptación del menú `...` para mostrar acciones dinámicas basadas en el estado de la rutina (Pausar, Finalizar, Reactivar, Archivar).
- **Acción del Servidor**: Ampliación de `createRoutineAction` para soportar el almacenamiento de `custom_goal` cuando el objetivo seleccionado es "otro".
