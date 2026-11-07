# 📖 Registro de Conversación y Bitácora del Proyecto: OrganizaAI
**Fecha:** 6 y 7 de Noviembre de 2026  
**Participantes:** Usuario (LMZegarra) & Asistente IA (Antigravity / Gemini)  
**Proyecto:** OrganizaAI (PWA Inteligente de Texto a Tareas, Agenda y Calendario)

---

## 1. Resumen Ejecutivo de la Sesión

En esta sesión intensiva de pair programming transformamos un prototipo local tosco en una aplicación web progresiva (**PWA**) moderna, lista para producción, conectada a la nube en tiempo real, respaldada en GitHub y desplegada automáticamente en Vercel.

### Hitos Logrados:
1. **GitHub:** Creación, configuración y sincronización del repositorio oficial `https://github.com/LMZegarra/organiza-ai-pwa`.
2. **Vercel & CI/CD:** Despliegue continuo en producción bajo el dominio `https://mi-calendario-xi.vercel.app`.
3. **Backend Serverless Seguro:** Creación de la función serverless `/api/organize-text` que procesa el texto con OpenRouter usando variables de entorno seguras en el servidor, sin exponer tu API key al público.
4. **Análisis Competitivo y Benchmarking:** Estudio profundo de Notion, Todoist, Obsidian y Google Keep, definiendo la matriz de Requisitos Funcionales (RF) y No Funcionales (RNF).
5. **Gestión Táctil de Tareas:** Modal nativo HTML5 para editar título, categoría, prioridad y fecha límite; animación de tachado suave al completar y botones de acción rápida.
6. **Archivo y Búsqueda de Notas:** Pestaña de ideas con buscador en tiempo real por palabra clave y modal para crear y editar notas.
7. **Autenticación Multi-usuario:** Integración completa de Supabase Auth (Email + Contraseña y Magic Link) con políticas de seguridad Postgres RLS (`auth.uid() = user_id`) ejecutadas directamente en tu base de datos mediante la API de Supabase.
8. **Limpieza y Puesta a Punto:** Eliminación total de datos de prueba antiguos en base de datos y memoria local.

---

## 2. Enlaces y Recursos del Proyecto

* **URL Pública en Producción:** [https://mi-calendario-xi.vercel.app](https://mi-calendario-xi.vercel.app)
* **Repositorio en GitHub:** [https://github.com/LMZegarra/organiza-ai-pwa](https://github.com/LMZegarra/organiza-ai-pwa)
* **Proyecto en Vercel:** `prj_GVVrwvoOXqn4Vod5qbCnaelQArN4` (`mi-calendario`)
* **Proyecto en Supabase:** `https://vhxprfbexizxpllaqeqk.supabase.co` (Ref: `vhxprfbexizxpllaqeqk`)
* **Archivo de Credenciales Privadas (Local):** `clavesQueUsaras.txt` y `.env` (ambos protegidos en `.gitignore`).

---

## 3. Cronología Detallada de la Conversación y Decisiones

### Petición 1 a 3: Inicio y Estrategia GitHub
- **Usuario:** Desea que la aplicación esté online desde ya en Supabase, Vercel y GitHub, indicando que es su primera vez usando GitHub.
- **Acción:** Explicamos la arquitectura de la app (Frontend estático modular con backend serverless y cliente Supabase). Configuramos Git localmente, vinculamos con el repositorio remoto de GitHub `LMZegarra/organiza-ai-pwa` y realizamos los primeros commits limpios.

### Petición 4 a 6: Despliegue en Vercel y Seguridad de Claves
- **Usuario:** Pide seguir la recomendación de Vercel y solicita usar únicamente la API de OpenRouter por defecto, dejando la opción de agregar una clave personal en Ajustes. Aporta credenciales y pide aplicar la máxima seguridad en `.gitignore`.
- **Acción:** 
  - Aseguramos que `.gitignore` excluya `.env`, `clavesQueUsaras.txt` y `js/config.local.js`.
  - Instalamos y configuramos el proyecto en Vercel con el nombre `mi-calendario`.
  - Vinculamos las variables de entorno de producción en Vercel (`OPENROUTER_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `OPENROUTER_MODEL`).
  - Creamos la función serverless `api/organize-text.js` para procesar el texto en el servidor sin exponer la clave en el navegador.

### Petición 7 a 10: Resolución del Error "No hay API Key configurada"
- **Problema:** Al abrir la app en Vercel, saltaba una alerta diciendo que no había clave configurada.
- **Causa raíz:** En `js/ai-service.js` había una validación previa en el navegador (`if (!apiKey) throw Error`) que bloqueaba la llamada antes de enviarla al backend de Vercel (donde sí estaba configurada la clave en las variables de entorno).
- **Solución:** Se corrigió `js/ai-service.js` para enviar la petición directamente a `/api/organize-text`, se incrementó la caché del Service Worker a `v4` y se desplegó a producción con éxito comprobado vía `curl`.

### Petición 11: Análisis Competitivo estilo Notion
- **Usuario:** Pide un informe de Notion y aplicaciones del nicho (Todoist, Obsidian, Keep) con requisitos funcionales y no funcionales a mejorar en OrganizaAI.
- **Acción:** Se generó un artefacto exhaustivo analizando la fricción de Notion vs la velocidad de OrganizaAI, definiendo requisitos como CRUD táctil, búsqueda de notas, autenticación con Supabase Auth y vistas avanzadas.

### Petición 12: Implementación de Gestión Táctil y Archivo de Notas
- **Usuario:** Aprueba iniciar con el Punto 1.
- **Acción:**
  - Se crearon los modales HTML5 `<dialog id="dialogTaskModal">` y `<dialog id="dialogNoteModal">`.
  - Se implementó la edición de tareas con lápiz ✏️, selector nativo de fecha, prioridad y categoría.
  - Se añadió buscador en tiempo real en la pestaña **Ideas** (`#inputSearchNotes`) y botón `+ Nueva Idea`.
  - Se incorporaron pruebas unitarias con `npm test` en `tests/storage.test.js`.
  - Desplegado en Vercel en la versión de Service Worker `v5`.

### Petición 13 a 14: Autenticación con Supabase Auth y Migración SQL
- **Usuario:** Pide continuar con la autenticación de usuarios y solicita que ejecutemos la migración en Supabase.
- **Acción:**
  - El usuario suministró un token de acceso personal (`sbp_...`).
  - Nos conectamos vía la API de Administración de Supabase (`https://api.supabase.com/v1/projects/vhxprfbexizxpllaqeqk/database/query`).
  - Ejecutamos la migración SQL agregando `user_id` a `organiza_tasks`, `organiza_events` y `organiza_notes`, activando políticas de seguridad RLS estrictas (`auth.uid() = user_id`) y replicación WebSocket en tiempo real.
  - Integramos en la interfaz el botón `👤 Acceder` con modal para Login, Registro y Magic Link.

### Petición 15 a 16: Limpieza Total de Datos de Prueba
- **Usuario:** Reporta que aún se muestran eventos y tareas antiguas de las pruebas.
- **Acción:**
  - Se vaciaron las tablas en Supabase (`DELETE FROM organiza_tasks; DELETE FROM organiza_events; DELETE FROM organiza_notes;`).
  - Se creó una rutina de limpieza automática en el navegador (`CLEANUP_KEY = 'organiza_cleanup_all_test_data_v2'`) para vaciar el `localStorage` del dispositivo.
  - Se agregaron botones de acción: "Vaciar agenda" en el calendario, "Vaciar tareas" en la lista de tareas y papelera individual 🗑️ para cada tarea en la vista de agenda.
  - Desplegado en Vercel bajo Service Worker `v8`.

---

## 4. Arquitectura de Archivos del Proyecto

```
VOZ_A_TAREAS_PWA/
├── api/
│   └── organize-text.js         # Función Serverless en Vercel (Proxy OpenRouter seguro)
├── js/
│   ├── ai-service.js            # Orquestador de peticiones a la IA y fallbacks
│   ├── calendar-component.js    # Componente dual de Calendario mensual y Agenda diaria
│   ├── config.js                # Variables públicas y fallback a config.local.js
│   ├── storage-service.js       # Almacenamiento Local-First y sincronización en tiempo real
│   └── supabase-client.js       # Cliente Supabase, Auth y llamadas Postgres
├── public/                      # Réplica idéntica optimizada para hosting y assets estáticos
├── tests/
│   ├── ai-service.test.js       # Pruebas de parseo JSON de IA
│   └── storage.test.js          # Pruebas unitarias de almacenamiento y filtros
├── index.html                   # Interfaz PWA con modales <dialog> accesibles
├── app.js                       # Controlador principal y eventos DOM
├── style.css                    # Estilos modernos mobile-first con variables CSS
├── sw.js                        # Service Worker con estrategia Cache-First y revalidación
├── manifest.json                # Manifiesto PWA para instalación móvil
├── vercel.json                  # Reglas de cabeceras PWA para Vercel
├── supabase_schema.sql          # Esquema oficial de base de datos y políticas RLS
├── clavesQueUsaras.txt          # Credenciales privadas (Ignorado por Git)
├── .env                         # Variables locales (Ignorado por Git)
└── GEMINI.md                    # Memoria de contexto persistente para futuras sesiones
```

---

## 5. Próximos Pasos Recomendados (Roadmap Futuro)

1. **Vista de Tablero Kanban:** Selector para ver las tareas como tarjetas arrastrables por prioridad o categoría estilo Trello / Notion.
2. **Notificaciones Locales (Web Push):** Recordatorios automáticos 15 minutos antes de citas agendadas.
3. **Exportación Universal:** Descarga de eventos en formato `.ics` para importar en Google Calendar o Apple Calendar.
