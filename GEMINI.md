# OrganizaAI - Contexto y Directrices del Proyecto

Este archivo (`GEMINI.md`) sirve como la memoria de contexto permanente del proyecto. Cualquier sesión de Gemini / Antigravity que se abra en esta carpeta leerá este archivo automáticamente antes de interactuar.

---

## 1. ¿Qué es este proyecto?

**OrganizaAI** es una Progressive Web App (**PWA**) de productividad y organización personal diseñada para móvil y escritorio. Su objetivo principal es resolver la fricción de captura que tienen apps como Notion:
- **Entrada rápida:** El usuario escribe un texto libre ("dump mental" o nota rápida).
- **Procesamiento con IA:** Un modelo de lenguaje (OpenRouter) clasifica automáticamente la nota en tres bloques estructurados:
  1. `calendar_events`: Citas, compromisos y reuniones con fecha/hora calculada.
  2. `tasks`: Acciones concretas con prioridad (alta, media, baja), categoría y fecha límite.
  3. `notes`: Ideas, reflexiones o apuntes de referencia.
- **Vistas Automáticas:**
  - Calendario mensual interactivo con agenda del día (muestra eventos y tareas con fecha).
  - Lista de tareas con filtros (estado, categoría), edición táctil con modal nativo y tachado suave.
  - Pestaña de ideas con buscador en tiempo real.
- **Local-First & Multi-Tenancy:** Funciona offline en `localStorage` y se sincroniza en tiempo real con **Supabase** (Postgres + RLS) cuando el usuario inicia sesión.

---

## 2. Enlaces y Entornos de Producción

- **Producción Vercel:** `https://mi-calendario-xi.vercel.app` (Proyecto: `mi-calendario` / `prj_GVVrwvoOXqn4Vod5qbCnaelQArN4`)
- **Repositorio GitHub:** `https://github.com/LMZegarra/organiza-ai-pwa` (Rama principal: `main`)
- **Supabase Cloud:** `https://vhxprfbexizxpllaqeqk.supabase.co` (Proyecto ref: `vhxprfbexizxpllaqeqk`)
- **Credenciales Locales:** Guardadas de forma segura en `clavesQueUsaras.txt` y `.env` (ambos en `.gitignore`).

---

## 3. Arquitectura del Código

- **Frontend:**
  - `index.html`: Estructura semántica con modales nativos `<dialog>` (`dialogSettings`, `dialogTaskModal`, `dialogNoteModal`, `dialogAuthModal`).
  - `app.js`: Controlador principal, enrutador de vistas, gestión de modales, autenticación y notificaciones flotantes (*Toast*).
  - `style.css`: Estilos Mobile-First usando CSS Custom Properties (variables de tema oscuro).
  - `sw.js`: Service Worker PWA con estrategia Cache-First y revalidación de APIs.
  - `js/calendar-component.js`: Componente del calendario híbrido mensual y agenda diaria.
  - `js/storage-service.js`: Capa de persistencia local-first y sincronización bidireccional.
  - `js/supabase-client.js`: Cliente de Supabase, gestión de sesiones JWT (`supabase.auth`) y sincronización Postgres.
  - `js/ai-service.js`: Cliente de IA que envía texto a la función serverless de Vercel.
- **Backend Serverless:**
  - `api/organize-text.js`: Función serverless en Vercel que actúa de proxy seguro hacia OpenRouter usando `process.env.OPENROUTER_API_KEY`.
- **Base de Datos (Supabase):**
  - Tablas: `organiza_tasks`, `organiza_events`, `organiza_notes`.
  - Seguridad: Row Level Security (RLS) habilitada con políticas `auth.uid() = user_id`.

---

## 4. Reglas Críticas de Desarrollo

1. **Sincronización `root` vs `public/`:**
   - Todo cambio realizado en archivos raíz (`index.html`, `app.js`, `style.css`, `sw.js`, `js/*`) DEBE sincronizarse obligatoriamente en la carpeta `public/` para mantener compatibilidad total tanto con Vercel como con otros hostings.
2. **Seguridad de Credenciales:**
   - NUNCA commitear claves de API privadas en el repositorio público de GitHub.
   - Las variables sensibles deben permanecer en `.env`, `clavesQueUsaras.txt` y en las Variables de Entorno de Vercel.
3. **Control de Caché en PWA:**
   - Al modificar archivos estáticos (`app.js`, `style.css`, etc.), siempre incrementar la versión de caché en `sw.js` y `public/sw.js` (`CACHE_NAME = 'organiza-ai-cache-vX'`) para que los navegadores móviles descarguen la nueva versión inmediatamente.
4. **Pruebas:**
   - Ejecutar `npm test` antes de cada commit para validar que `tests/storage.test.js` y `tests/ai-service.test.js` pasen al 100%.
5. **Historial de Conversaciones:**
   - La carpeta `conversaciones con gemini/` almacena los registros de sesiones anteriores para auditoría humana y contexto extendido.
