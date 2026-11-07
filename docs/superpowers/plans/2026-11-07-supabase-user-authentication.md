# Supabase User Authentication & Multi-Tenancy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el sistema de autenticación de usuarios (registro e inicio de sesión con Email/Password y Magic Link) usando Supabase Auth, integrando aislamiento seguro de datos por usuario (`user_id` + RLS), sincronización automática de datos locales al iniciar sesión, y gestión de sesión en la interfaz móvil.

**Architecture:** PWA Local-First que permite el uso inmediato sin registro, pero ofrece autenticación transparente mediante Supabase Auth (`supabase.auth.onAuthStateChange`). Cuando el usuario inicia sesión, sus tareas, eventos y notas se asocian a su `user_id` con políticas RLS de Postgres, sincronizándose en tiempo real en todos sus dispositivos.

**Tech Stack:** Supabase Auth (@supabase/supabase-js v2), Postgres Row Level Security (RLS) con `auth.uid() = user_id`, HTML5 `<dialog>` nativo, Vanilla JS ES6 Modules, Service Worker v6.

**Spec:** [docs/superpowers/plans/2026-11-07-supabase-user-authentication.md](file:///home/lmzegarra/Descargas/APLICACIONES/VOZ_A_TAREAS_PWA/docs/superpowers/plans/2026-11-07-supabase-user-authentication.md) y [Matriz de Requisitos](file:///home/lmzegarra/.gemini/antigravity-cli/brain/529e0302-f655-4360-b62e-32566b2b56f6/notion-benchmark-and-requirements.md) (RF-04, RNF-03).

## Global Constraints
- La app debe seguir funcionando offline y para usuarios no autenticados en modo local.
- Nunca almacenar contraseñas en `localStorage` (delegar 100% de la sesión a Supabase Auth JWT).
- RLS en Supabase debe usar `to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)` (siguiendo las directrices del skill Supabase).
- Actualizar `supabase_schema.sql` con la migración para `user_id` y RLS por usuario.
- Mantener sincronía 1:1 entre los archivos raíz (`index.html`, `app.js`, `style.css`, `sw.js`) y `public/`.

---

## Tasks

### Task 1: Actualizar esquema SQL y migraciones en `supabase_schema.sql`
- [ ] Añadir columna `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()` a `organiza_tasks`, `organiza_events` y `organiza_notes`.
- [ ] Configurar políticas RLS seguras para usuarios autenticados:
  `CREATE POLICY "Users can manage own tasks" ON organiza_tasks FOR ALL TO authenticated USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);`
  (y equivalente para eventos y notas).
- [ ] Proveer instrucciones claras para que el usuario o el script ejecute la migración en Supabase.

### Task 2: Extender `SupabaseService` con métodos de Auth y scoping por usuario
- [ ] En `js/supabase-client.js`, añadir métodos:
  - `getCurrentUser()`, `getSession()`
  - `signUp(email, password)`
  - `signIn(email, password)`
  - `signInWithMagicLink(email)`
  - `signOut()`
  - `onAuthStateChange(callback)`
- [ ] En `fetchAllRemote()`, filtrar automáticamente por `user_id = user.id` o dejar que RLS de Supabase lo filtre con el token JWT de la sesión.
- [ ] En `syncTask`, `syncEvent` y `syncNote`, incluir `user_id: user.id` al hacer upsert.
- [ ] Sincronizar a `public/js/supabase-client.js`.

### Task 3: Modal nativo de Autenticación en `index.html`
- [ ] Añadir botón de sesión en el header de `index.html`: `<button id="btnAuthHeader" class="btn btn-sm btn-outline">👤 Acceder</button>` o estado de usuario conectado (`<div id="userProfileBadge" class="hidden">...</div>`).
- [ ] Añadir `<dialog id="dialogAuthModal" class="modal-dialog">` con:
  - Tabs: "Iniciar Sesión" y "Crear Cuenta".
  - Campo Email.
  - Campo Contraseña.
  - Botón principal ("Ingresar" / "Registrarse").
  - Botón secundario ("Enviar enlace de acceso mágico").
  - Contenedor de mensajes de error o éxito (`#authMessage`).
- [ ] Sincronizar a `public/index.html`.

### Task 4: Estilos CSS para el modal de Auth y perfil de usuario
- [ ] Añadir estilos para los tabs de auth (`.auth-tabs`, `.auth-tab-btn.active`).
- [ ] Añadir estilos para el badge de usuario en el header (`.user-header-info`, `.btn-logout`).
- [ ] Añadir estilos para mensajes de error/alerta (`.auth-alert-error`, `.auth-alert-success`).
- [ ] Sincronizar a `public/style.css`.

### Task 5: Controlador de sesión e interacción en `app.js` y `storage-service.js`
- [ ] Escuchar `SupabaseService.onAuthStateChange`:
  - Si el usuario inicia sesión: actualizar header con su correo, sincronizar datos de Supabase, y migrar datos locales huérfanos a la cuenta en la nube.
  - Si el usuario cierra sesión: actualizar header a "👤 Acceder", pausar sincronización en tiempo real.
- [ ] Conectar formularios de login, registro, magic link y botón de cerrar sesión.
- [ ] Sincronizar a `public/app.js` y `public/js/storage-service.js`.

### Task 6: Actualizar Service Worker (`v6`), Pruebas y Despliegue en Vercel
- [ ] Actualizar Service Worker a `organiza-ai-cache-v6` en `sw.js` y `public/sw.js`.
- [ ] Ejecutar `npm test` y verificar sintaxis.
- [ ] Hacer commit y push a GitHub (`main`).
- [ ] Verificar con MCP de Vercel que el despliegue esté en estado `READY`.
