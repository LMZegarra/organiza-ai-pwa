# Proyecto: Voz a Tareas AI (PWA) - Directrices y Reglas

Este proyecto es una Progressive Web App (PWA) de productividad que graba notas de voz, transcribe audio localmente con Whisper y sintetiza tareas e ideas clave mediante modelos de IA.

---

## 1. Arquitectura del Proyecto

- **Frontend:**
  - Vanilla JavaScript ES6+, HTML5 semántico y CSS3 con variables.
  - Diseñado con enfoque **mobile-first** (óptimo en smartphones táctiles y adaptable a escritorio).
  - Grabación con `MediaRecorder` y visualización en tiempo real vía Web Audio API y `<canvas>`.
  - PWA con Service Worker, manifiesto y capacidad de trabajo sin conexión / instalación en pantalla de inicio.

- **Backend (Node.js & Express):**
  - Servidor Express en `server.js` (puerto configurable).
  - Gestión de subida multipart con `multer` a `/tmp/voice_uploads`.
  - Comunicación con subproceso Python para transcripción local.
  - Conexión con proveedores LLM (OpenRouter / Gemini) mediante prompts estructurados con salida JSON estricta y fallbacks automáticos.

- **Transcripción Local (Python):**
  - `transcribe_local.py` usando `faster-whisper` optimizado para CPU (`int8`), rápido y privado.

---

## 2. Reglas de Desarrollo y Buenas Prácticas

### Frontend & Web Audio
1. **Compatibilidad Móvil (iOS / Android):**
   - Siempre verificar compatibilidad MIME al instanciar `MediaRecorder` (`audio/webm`, `audio/mp4`, `audio/aac`).
   - Liberar pistas de audio (`stream.getTracks().forEach(t => t.stop())`) y cerrar `AudioContext` para evitar fugas de memoria y batería.
2. **Interactividad y Accesibilidad:**
   - Botones y controles táctiles con tamaño mínimo de 44x44 px.
   - Feedback visual claro en todos los estados (grabando, subiendo, transcribiendo, completado, error).
3. **Persistencia y Estado:**
   - Almacenar configuración de usuario (claves, modelos preferidos) e historial de tareas de manera estructurada y segura.

### Backend & Seguridad
1. **Ciclo de Vida de Archivos Temporales:**
   - Todo archivo de audio subido debe eliminarse obligatoriamente en el bloque `finally` para evitar agotar el almacenamiento del sistema.
2. **Validación de Respuestas de IA:**
   - Limpiar y validar siempre el JSON retornado por los modelos de lenguaje antes de entregarlo al cliente.
   - Manejo de fallbacks ante límites de cuota o caídas de modelos individuales.
3. **Manejo de Errores Limpio:**
   - Entregar mensajes descriptivos y amigables al cliente si falla el micrófono, el backend o el servicio de IA.
