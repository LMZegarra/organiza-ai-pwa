# OrganizaAI (PWA) ✨📅✅

Aplicación web progresiva orientada a productividad que transforma tus ideas y textos en lenguaje natural en:
1. **Eventos y Citas en tu Calendario/Agenda integrado.**
2. **Listas de Tareas clasificadas** por prioridad (`alta`, `media`, `baja`) y categoría (`Trabajo`, `Personal`, `Compras`, etc.).
3. **Ideas Clave y Notas Rápidas** sintetizadas.
4. **Sincronización en Tiempo Real** entre tu **computadora / laptop** y tu **teléfono celular** usando **Supabase** (PostgreSQL gratis) o funcionamiento 100% local y offline si no configuras la nube.

---

## 🚀 Cómo Iniciar la Aplicación

1. En tu terminal:
   ```bash
   cd "/home/lmzegarra/Descargas/APLICACIONES/VOZ_A_TAREAS_PWA"
   npm start
   ```
2. Abre tu navegador:
   * **En tu laptop:** [http://localhost:3000](http://localhost:3000)
   * **En tu celular (misma red Wi-Fi):** Abre la dirección IP que muestra el servidor (ej. `http://10.1.215.176:3000`).
   * **En tu celular (desde cualquier lugar con internet):** Puedes desplegar la carpeta en Vercel, Render o usar un túnel seguro con Cloudflare Tunnel.

---

## ⚙️ Configuración (Icono ⚙️)

Al abrir la aplicación, haz clic en el icono de engranaje **⚙️** en la esquina superior derecha:

### 1. Proveedor de Inteligencia Artificial
* **Google Gemini (Recomendado):**
  * Obtén tu API Key gratuita en [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
  * Es gratuita, tiene límites generosos y extrae fechas y horas con máxima precisión en español.
* **OpenRouter:**
  * Obtén tu API Key en [openrouter.ai/keys](https://openrouter.ai/keys).
  * Puedes usar modelos gratuitos como `openrouter/free` o `meta-llama/llama-3.3-70b-instruct:free`.

### 2. Sincronización en Tiempo Real (Laptop ↔ Celular)
Para que todo lo que escribas en tu computadora aparezca al instante en tu celular:
1. Crea una cuenta y un proyecto gratuito en [supabase.com](https://supabase.com).
2. Ve al **SQL Editor** en tu panel de Supabase y ejecuta el script que viene en [`supabase_schema.sql`](./supabase_schema.sql).
3. Copia la **Project URL** y la **Anon Key** (disponibles en Project Settings > API).
4. Pégalas en los Ajustes (⚙️) de la aplicación tanto en tu laptop como en tu teléfono y pulsa **Guardar**.
5. ¡Listo! Verás el indicador en verde `⚡ En línea (Nube)`. Cualquier tarea o evento agregado, modificado o borrado se sincronizará inmediatamente en ambos dispositivos.

---

## 📱 Instalar como App en tu Celular (PWA)

* **En Android (Chrome):** Toca los 3 puntos verticales en la esquina superior derecha y selecciona **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
* **En iOS (Safari):** Toca el botón de Compartir (icono de cuadrado con flecha hacia arriba) y selecciona **"Agregar al inicio"**.
