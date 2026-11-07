# Gestión Táctil de Tareas y Archivo de Notas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar la gestión táctil completa de tareas (edición mediante modal nativo, eliminación con confirmación/deshacer, animación de tachado al completar) y el sistema completo de archivo, creación, edición y búsqueda en tiempo real de notas e ideas extraídas por la IA.

**Architecture:** PWA basada en Vanilla JavaScript modular (`app.js`, `storage-service.js`) con HTML5 `<dialog>` nativo accesible para modales de edición sin dependencias externas. Estilos móviles ergonómicos en CSS moderno. Sincronización transparente con Supabase y persistencia Local-First.

**Tech Stack:** HTML5 Semantic Dialogs, CSS3 (CSS Variables, Flexbox/Grid, Touch Ergonomics), Vanilla JS ES6 Modules, Supabase Client, Service Worker v5.

**Spec:** [docs/superpowers/plans/2026-11-07-task-and-notes-management.md](file:///home/lmzegarra/Descargas/APLICACIONES/VOZ_A_TAREAS_PWA/docs/superpowers/plans/2026-11-07-task-and-notes-management.md) y [Matriz de Requisitos](file:///home/lmzegarra/.gemini/antigravity-cli/brain/529e0302-f655-4360-b62e-32566b2b56f6/notion-benchmark-and-requirements.md) (RF-01, RF-03).

## Global Constraints
- No agregar librerías pesadas (mantener tamaño de bundle < 50KB en frontend).
- Modales deben usar `<dialog>` nativo de HTML5 con accesibilidad por teclado (Escape para cerrar, focus trap).
- Mantener sincronía 1:1 entre los archivos raíz (`index.html`, `app.js`, `style.css`, `sw.js`) y `public/`.
- Cada tarea debe mantener `created_at`, `updated_at`, `id`, `title`, `priority`, `category`, `due_date`, `completed`.
- Las notas deben mantener `id`, `content`, `created_at`, `updated_at`.

---

## Tasks

### Task 1: Configurar scripts de prueba y ampliar tests unitarios de almacenamiento
- [ ] Agregar script `"test": "node tests/storage.test.js && node tests/ai-service.test.js"` en `package.json`.
- [ ] Ampliar `tests/storage.test.js` para verificar actualización de tareas (`updateTask`), edición de notas (`updateNote`), y filtrado de notas por texto de búsqueda.
- [ ] Ejecutar `npm test` y verificar que los tests pasen.

### Task 2: Modales nativos HTML5 y barra de búsqueda en `index.html`
- [ ] Agregar `<dialog id="dialogTaskModal">` en `index.html` (formulario con: título, selector de categoría con emojis, selector de prioridad con colores, selector de fecha nativo `input[type="date"]`, y botones Cancelar y Guardar).
- [ ] Agregar `<dialog id="dialogNoteModal">` en `index.html` (formulario con: `<textarea>` multilínea y botones Cancelar y Guardar).
- [ ] En la sección `#viewNotes`, agregar barra de búsqueda en tiempo real (`<input id="inputSearchNotes" type="search" placeholder="🔍 Buscar en ideas y notas...">`) y botón `+ Nueva Nota`.
- [ ] Sincronizar cambios a `public/index.html`.

### Task 3: Estilos CSS para modales táctiles, animación de tachado y buscador
- [ ] Añadir estilos para `.task-card.completed` con animación suave de tachado y opacidad reducida.
- [ ] Añadir estilos para botones de acción rápida en las tarjetas (`.btn-edit-task`, `.btn-edit-note`, `.btn-delete`).
- [ ] Añadir estilos para los nuevos diálogos modales (`#dialogTaskModal`, `#dialogNoteModal`) con esquinas redondeadas, fondo backdrop con blur y botones ergonómicos táctiles (mínimo 44px de altura).
- [ ] Añadir estilos para el buscador de notas (`.notes-search-bar`) y vista vacía de búsqueda.
- [ ] Sincronizar cambios a `public/style.css`.

### Task 4: Lógica interactiva en `app.js` y `storage-service.js`
- [ ] En `js/storage-service.js`, agregar método `updateNote(id, newContent)` y asegurar que `saveTask` maneje tanto creación como actualización completa.
- [ ] En `app.js`, conectar el botón `+ Tarea Manual` y los botones `✏️ Editar` de cada tarjeta de tarea para abrir `dialogTaskModal` (prellenando datos si es edición).
- [ ] En `app.js`, implementar `dialogNoteModal` para crear notas manualmente y editar notas existentes.
- [ ] En `app.js`, conectar el evento `input` en `#inputSearchNotes` para filtrar notas en tiempo real.
- [ ] Añadir toast temporal sutil o feedback visual al completar tareas ("✅ Tarea completada").
- [ ] Sincronizar cambios a `public/js/storage-service.js` y `public/app.js`.

### Task 5: Actualización de Service Worker y pruebas de regresión
- [ ] Incrementar `CACHE_NAME = 'organiza-ai-cache-v5'` en `sw.js` y `public/sw.js`.
- [ ] Ejecutar `npm test` para asegurar que todas las pruebas pasen.
- [ ] Verificar sintaxis y carga estática sin errores.

### Task 6: Commit, Push y Verificación en Vercel
- [ ] Realizar commit descriptivo: `feat: interactive task editing modal, completed strikethrough animation, and notes CRUD with search`.
- [ ] Push a la rama `main` en GitHub.
- [ ] Verificar con la herramienta MCP de Vercel que el despliegue termine en estado `READY`.
