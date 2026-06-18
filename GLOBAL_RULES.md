# 🌍 NORTHLAV – GLOBAL RULES
(Software Factory Standard v2.2)

Estas reglas aplican a todos los proyectos, workspaces, agentes y workflows sin excepción.

---

1️⃣ REGLAS DE NEGOCIO (PRIORIDAD ALTA)
- Todo proyecto debe resolver un problema real del negocio, no solo ser técnicamente correcto.
- El MVP siempre es la primera meta. Nada se sobre-construye.
- *Transición de MVP a Producción:* Una vez que el proyecto ha superado la etapa de validación (MVP), la prioridad absoluta cambia hacia la fase de Producción de Alto Rendimiento. En esta etapa, el enfoque técnico y estratégico se centra en convertir el producto en una máquina de generación de dinero (monetización activa, Stripe, automatización de embudos y prospección activa).
- Si hay dudas de alcance → preguntar antes de ejecutar.
- La velocidad es clave, pero nunca sacrificando claridad ni mantenibilidad.

2️⃣ REGLAS DE CALIDAD DE CÓDIGO
- Código limpio, modular y legible.
- Nombres claros (no abreviaciones confusas).
- No duplicar lógica.
- Cada feature debe poder mantenerse por otro desarrollador.
- Sin console.log de desarrollo en producción.
- Sin código comentado innecesario.

3️⃣ ARQUITECTURA
- Arquitectura simple primero, escalable después.
- Separación clara de: lógica, UI, datos.
- Nada de soluciones "hack" sin justificar.
- Estructura de carpetas estándar (ver skill 4-constructor).

4️⃣ TESTING Y VALIDACIÓN
- Todo proyecto debe incluir tests mínimos funcionales.
- Las features críticas siempre se prueban.
- Si algo no se puede testear, se debe documentar el porqué.
- El Auditor (skill 5) ejecuta verificación formal antes de producción.

5️⃣ UI / UX (OBLIGATORIO)
- El producto debe ser: usable, claro, coherente.
- UX > estética innecesaria.
- Pensar siempre en el usuario final, no solo en el developer.
- Mobile first: todo se diseña para 375px primero.
- Accesibilidad mínima: alt tags, contraste, headings lógicos, navegación por teclado.

6️⃣ SEO (OBLIGATORIO EN TODO PROYECTO WEB)
- Componente SEO dinámico obligatorio en todo proyecto web.
- Schemas JSON-LD mínimos: Organization, WebSite, BreadcrumbList.
- Sitemap.xml y robots.txt desde el día 1.
- Meta tags (title, description, OG, Twitter) en cada página.
- Noscript con contenido real (no vacío).
- Prerender script para SPAs (React/Vite).
- Datos del negocio consistentes en todos los archivos y schemas.
- Ver skill 6-seo para checklist completo.

7️⃣ DEPENDENCIAS Y TECNOLOGÍAS
- La IA tiene libertad total para decidir el stack según:
  - Complejidad del proyecto.
  - Requisitos del cliente.
  - Velocidad de entrega.
  - Mantenibilidad.
- Puede usar múltiples frameworks, librerías y herramientas.
- Documentar el stack brevemente en el proyecto.
- Objetivo: velocidad, calidad y resultado final.

8️⃣ SEGURIDAD Y DATOS
- No exponer datos sensibles (API keys, tokens, contraseñas).
- Variables de entorno correctamente gestionadas (.env en .gitignore).
- rel="noopener noreferrer" en links externos con target="_blank".
- Pensar en seguridad desde el MVP, no al final.
- Headers de seguridad en producción (X-Content-Type-Options, X-Frame-Options).
- *Prohibición de Git Push:* Queda estrictamente prohibido realizar cualquier comando de subida (git push) a repositorios remotos sin la autorización explícita por escrito del usuario. La palabra clave secreta para otorgar este permiso y habilitar el push en el chat es *"loki"*.

9️⃣ DOCUMENTACIÓN Y MEMORIA HISTÓRICA (NUEVAS REGLAS v2.2)
- *Documentación de Proyecto Obligatoria:* Todo proyecto debe contar con documentación de contexto técnica y comercial actualizada (README.md, PROJECT_CONTEXT.md y diagramas de flujo de datos). Un proyecto sin documentación legible se considera incompleto.
- *Bitácora de Errores Activa:* Es obligatorio documentar en BITACORA_ERRORES.md los problemas de alto valor, retos arquitectónicos y soluciones complejas resueltos al final de cada sesión de desarrollo. No se registran errores superficiales o sintácticos, sino lecciones de valor técnico para el futuro del sistema.
- *Rotación y Versionado del CHANGELOG:* Para mantener la eficiencia de tokens y evitar la lentitud o pérdida de atención de la IA por sobrecarga de contexto, el archivo CHANGELOG.md activo debe reiniciarse cada 50 sesiones registradas. En lugar de eliminarse, el historial se debe respaldar en un archivo histórico numerado de forma secuencial (ej. CHANGELOG_V1.md / changelog.V1.1 o subsecuentes). El CHANGELOG.md activo conservará únicamente la última sesión como punto de partida y tendrá un enlace claro al histórico al principio.

🔟 IDIOMA, FORMATO Y ACCESO EXTERNO
- Todo output en español, claro, resumido y accionable.
- Evitar texto innecesario o explicaciones excesivamente largas.
- La IA NO tiene permiso para acceder a navegador, web externa, APIs o investigación externa por defecto.
- Cualquier uso de browser o búsqueda requiere pedir permiso explícito previamente.
- Sin permiso explícito, se asume acceso prohibido.

---

🏭 PIPELINE DE LA FÁBRICA (10 Skills)
