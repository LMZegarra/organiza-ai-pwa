# Plan de Implementación: App de Texto a Listas y Calendario con IA (Sincronización Online)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar la aplicación existente en una PWA orientada a teclado y texto que procesa lenguaje natural con IA (Gemini y OpenRouter), organizando automáticamente la información en listas de tareas clasificadas y una agenda/calendario interactivo híbrido, con sincronización cloud en tiempo real (Supabase) y funcionamiento local-first.

**Architecture:** Frontend PWA modular (HTML5 semántico, CSS moderno mobile-first, Vanilla JS con State Store reactivo), integración directa o vía proxy con APIs de IA (Google Gemini 1.5/2.0 Flash y OpenRouter), almacenamiento local híbrido (`localStorage`/`IndexedDB`) con sincronización bidireccional en tiempo real con Supabase Postgres mediante WebSockets.

**Tech Stack:** JavaScript (ES6+), HTML5 Semantic & `<dialog>`, CSS3 Variables, Supabase JS Client, Google Generative AI SDK / REST API, OpenRouter REST API, PWA Service Worker (Cache-First offline).

**Spec:** Requerimiento del usuario para cambiar de voz a texto por teclado, clasificar en tareas y agenda en calendario interactivo, configurable con Gemini y OpenRouter, sincronizable en laptop y celular en tiempo real vía backend en la nube.

## Global Constraints

- **Mobile First & Responsive:** Diseñado con controles táctiles de al menos 44x44px y layout adaptable para pantallas de teléfonos y portátiles.
- **Sin dependencias pesadas de build:** Mantener el cliente ejecutable sin compiladores complejos (Vite/Webpack), usando módulos nativos o CDN/Node según aplique para despliegue ágil.
- **Dual Cloud/Local:** La aplicación debe funcionar inmediatamente de forma local sin configuración previa, y activar la sincronización multi-dispositivo en cuanto se ingresen las credenciales de Supabase en Ajustes (⚙️).
- **IME-safe Textarea:** La entrada de texto con `Enter` debe respetar la composición IME en móviles y teclados internacionales según las guías modernas de web (`isComposing || keyCode === 229`).
- **Modal con `<dialog>` Nativo:** Uso del elemento nativo `<dialog>` con aislamiento de scroll y backdrop accesible.

## Review Focus

1. **Text Parsing & AI Schema:** Si el usuario escribe una nota que no contiene fecha u hora explícita, la IA debe asignarla a listas/tareas sin inventar fechas falsas en el calendario.
2. **Timezone & Date Parsing:** Las fechas de eventos en el calendario deben formatearse en formato ISO local (`YYYY-MM-DD` y `HH:mm`) evitando desfases de zonas horarias.
3. **Offline & Sync State:** Si la conexión a la nube se interrumpe o las credenciales no están configuradas, los cambios locales no deben perderse y deben sincronizarse al reconectar.
4. **Interactive Calendar Navigation:** El cambio de mes y selección de días debe refrescar instantáneamente las tareas y eventos vinculados a esa fecha.
5. **Multi-Model AI Fallback:** Si falla la API Key de Gemini o se supera la cuota, debe informar claramente o permitir alternar con OpenRouter sin bloquear la interfaz.

---

### Tarea 1: Módulo de IA Unificado (Gemini + OpenRouter) y Prompt de Organización

**Files:**
- Create/Modify: `public/js/ai-service.js`
- Modify: `server.js` (soporte de proxy o cliente directo)
- Test: `tests/ai-service.test.js`

- [ ] **Paso 1.1:** Diseñar el prompt del sistema que recibe texto no estructurado y devuelve un JSON estricto con:
  ```json
  {
    "summary": "Resumen conciso",
    "tasks": [
      { "title": "...", "priority": "alta|media|baja", "category": "Trabajo|Personal|Compras|Otro", "due_date": "YYYY-MM-DD o null" }
    ],
    "calendar_events": [
      { "title": "...", "date": "YYYY-MM-DD", "start_time": "HH:mm o null", "end_time": "HH:mm o null", "location": "...", "description": "..." }
    ],
    "notes": ["Idea 1", "Idea 2"]
  }
  ```
- [ ] **Paso 1.2:** Implementar la llamada a la API de **Google Gemini** (usando `gemini-1.5-flash` o `gemini-2.0-flash` con `responseMimeType: "application/json"`).
- [ ] **Paso 1.3:** Implementar la llamada a la API de **OpenRouter** con fallback secuencial si está seleccionada en los ajustes.
- [ ] **Paso 1.4:** Crear un mock de prueba para verificar que el parseo de respuestas maneja Markdown envolvente (````json ... ````) y entradas ambiguas.

---

### Tarea 2: Capa de Datos y Sincronización en Tiempo Real (Local-First + Supabase)

**Files:**
- Create: `public/js/storage-service.js`
- Create: `public/js/supabase-client.js`
- Test: `tests/storage.test.js`

- [ ] **Paso 2.1:** Implementar el gestor de almacenamiento local (`storage-service.js`) con soporte para colecciones: `tasks`, `calendar_events`, `notes`, `settings`.
- [ ] **Paso 2.2:** Integrar el cliente de Supabase con conexión opcional: si el usuario ingresa `supabase_url` y `supabase_anon_key` en ajustes, se suscribe a los cambios en tiempo real (`supabase.channel('schema-db-changes')`).
- [ ] **Paso 2.3:** Implementar sincronización bidireccional (los cambios en la laptop se reflejan en el móvil al instante y viceversa).
- [ ] **Paso 2.4:** Proveer el script SQL / guía de tablas para que el usuario cree las tablas en su proyecto gratuito de Supabase en 1 clic.

---

### Tarea 3: Componente de Calendario Híbrido & Agenda del Día

**Files:**
- Create: `public/js/calendar-component.js`
- Modify: `public/index.html`
- Modify: `public/style.css`

- [ ] **Paso 3.1:** Implementar la grilla mensual interactiva en JavaScript puro:
  - Selector de mes/año (Anterior / Siguiente / "Hoy").
  - Renderizado de los días de la semana y casillas numéricas.
  - Indicadores visuales (puntos de color) para días que contienen eventos o tareas con vencimiento.
- [ ] **Paso 3.2:** Implementar la vista de Agenda Diaria (panel inferior):
  - Al pulsar cualquier día del calendario, lista los eventos de ese día ordenados cronológicamente por hora.
  - Muestra las tareas asociadas a esa fecha.
  - Botón rápido para agregar evento manual o editar/eliminar.
- [ ] **Paso 3.3:** Estilizar con diseño táctil moderno (CSS Grid, transiciones suaves, contraste alto, scroll contenido).

---

### Tarea 4: Interfaz de Entrada de Texto Inteligente y Listas de Tareas

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/style.css`

- [ ] **Paso 4.1:** Reemplazar el grabador de audio por un área de captura de texto inteligente (`<textarea>` adaptable, soporte de atajos `Ctrl+Enter` / `Enter` seguro con IME y botón `✨ Organizar con IA`).
- [ ] **Paso 4.2:** Reestructurar el panel de Listas y Tareas:
  - Filtros por categoría (`Todas`, `Trabajo`, `Personal`, `Compras`) y por estado (`Pendientes`, `Completadas`).
  - Etiquetas visuales de prioridad (`Alta`, `Media`, `Baja`).
  - Edición y borrado rápido de ítems.
- [ ] **Paso 4.3:** Incorporar la vista de Ideas / Notas rápidas sintetizadas.

---

### Tarea 5: Modal de Ajustes (Gemini, OpenRouter, Supabase Sync) con `<dialog>`

**Files:**
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/style.css`

- [ ] **Paso 5.1:** Migrar el modal de ajustes al elemento nativo `<dialog>` siguiendo las pautas de accesibilidad y prevención de scroll bajo modal.
- [ ] **Paso 5.2:** Agregar pestañas o secciones de configuración:
  - **Inteligencia Artificial:** Selección entre Google Gemini y OpenRouter, campos para ingresar API keys, selector de modelos recomendados.
  - **Sincronización Cloud (Laptop ↔ Celular):** Campos para Supabase URL y Anon Key, botón de prueba de conexión e indicador de estado de sincronización (En línea / Local).
- [ ] **Paso 5.3:** Guardar la configuración en `localStorage` con confirmación inmediata de estado.

---

### Tarea 6: PWA Completa (Service Worker) y Preparación para Despliegue Online

**Files:**
- Create: `public/sw.js`
- Modify: `public/manifest.json`
- Modify: `server.js` (o preparación para static hosting en Vercel/Netlify/Cloudflare)
- Create: `README.md` (instrucciones para conectar laptop y celular)

- [ ] **Paso 6.1:** Crear el Service Worker `sw.js` con estrategia Cache-First para recursos estáticos y Network-First para APIs.
- [ ] **Paso 6.2:** Registrar el Service Worker en `app.js` asegurando que la PWA sea instalable en Android y iOS ("Agregar a pantalla de inicio").
- [ ] **Paso 6.3:** Configurar opciones de despliegue para tener la app online 24/7 (ej. Vercel o Render gratuito, o túnel Cloudflare).
- [ ] **Paso 6.4:** Documentar detalladamente en el `README.md` el paso a paso para abrir la app desde laptop y celular y sincronizarlas.
