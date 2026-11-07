/**
 * ai-service.js
 * Servicio de Inteligencia Artificial exclusivo para OpenRouter.
 * Utiliza por defecto las credenciales del sistema y permite
 * al usuario ingresar una API Key propia opcionalmente.
 */

import { APP_CONFIG } from './config.js';

export function getLocalDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hour = match[1].padStart(2, '0');
  const minute = match[2];
  const hNum = parseInt(hour, 10);
  const mNum = parseInt(minute, 10);
  if (hNum >= 0 && hNum <= 23 && mNum >= 0 && mNum <= 59) {
    return `${hour}:${minute}`;
  }
  return null;
}

export class AIService {
  static cleanAndParseResponse(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') {
      throw new Error('La IA no retornó contenido legible');
    }

    let clean = rawContent.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }

    const data = JSON.parse(clean);

    return {
      summary: data.summary || '',
      tasks: Array.isArray(data.tasks) ? data.tasks.map((t, idx) => ({
        id: t.id || `task_${Date.now()}_${idx}`,
        title: t.title || 'Tarea',
        priority: ['alta', 'media', 'baja'].includes(t.priority?.toLowerCase()) ? t.priority.toLowerCase() : 'media',
        category: t.category || 'General',
        due_date: t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
        completed: Boolean(t.completed)
      })) : [],
      calendar_events: Array.isArray(data.calendar_events) ? data.calendar_events.map((e, idx) => ({
        id: e.id || `event_${Date.now()}_${idx}`,
        title: e.title || 'Evento',
        date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : getLocalDateISO(),
        start_time: normalizeTimeString(e.start_time),
        end_time: normalizeTimeString(e.end_time),
        location: e.location || '',
        description: e.description || ''
      })) : [],
      notes: Array.isArray(data.notes) ? data.notes.map(n => typeof n === 'string' ? n : (n.content || JSON.stringify(n))).filter(Boolean) : []
    };
  }

  static getSystemPrompt(currentDateISO = getLocalDateISO()) {
    const dayOfWeek = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
    return `
Eres un asistente de organización personal de alta precisión.
La fecha y día actual de referencia es: ${currentDateISO} (${dayOfWeek}).

Tu objetivo es analizar el texto que escribe el usuario (ideas, pendientes, planes, notas sueltas) y organizarlo en tres estructuras claras:
1. "calendar_events": Reuniones, citas, eventos o compromisos que tienen un día y/o una hora determinada (o relativa como "mañana a las 4pm", "este viernes").
2. "tasks": Acciones o tareas pendientes que deben realizarse (ej. "comprar leche", "revisar contrato").
3. "notes": Ideas, reflexiones o detalles importantes que no son ni eventos ni tareas accionables inmediatas.
4. "summary": Un resumen breve de 1 o 2 oraciones de lo interpretado.

REGLAS ESTRICTAS DE EXTRACCIÓN:
- Resuelve cualquier fecha relativa usando la fecha de referencia (${currentDateISO}). Ejemplo: si dice "mañana", calcula la fecha exacta en formato YYYY-MM-DD.
- No inventes fechas para el calendario si el usuario no especificó cuándo ocurre. Si es algo pendiente sin fecha exacta, ponlo en "tasks".
- "priority" solo puede ser: "alta", "media" o "baja".
- Formato de fechas: "YYYY-MM-DD"
- Formato de horas: "HH:mm" (24 horas, ej. "16:00") o null si no se especifica.
- Formato de respuesta: DEBES responder EXCLUSIVAMENTE con un JSON válido con la siguiente estructura exacta:

{
  "summary": "Resumen conciso",
  "tasks": [
    {
      "title": "Descripción clara de la tarea",
      "priority": "alta|media|baja",
      "category": "Trabajo|Personal|Compras|Estudio|Salud|General",
      "due_date": "YYYY-MM-DD o null",
      "completed": false
    }
  ],
  "calendar_events": [
    {
      "title": "Nombre de la cita o evento",
      "date": "YYYY-MM-DD",
      "start_time": "HH:mm o null",
      "end_time": "HH:mm o null",
      "location": "Ubicación o enlace o vacío",
      "description": "Detalles adicionales"
    }
  ],
  "notes": [
    "Punto o idea relevante extraída"
  ]
}
`.trim();
  }

  static async directOpenRouter(apiKey, text, preferredModel, currentDate) {
    const prompt = `${this.getSystemPrompt(currentDate)}\n\nTexto del usuario:\n"""\n${text}\n"""`;
    const models = [
      preferredModel,
      ...(APP_CONFIG.FALLBACK_MODELS || ['openrouter/free'])
    ].filter(Boolean);

    let lastErr = null;
    for (const m of [...new Set(models)]) {
      try {
        console.log(`[OpenRouter] Intentando con: ${m}...`);
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'OrganizaAI'
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        const resJson = await res.json();
        if (!res.ok) throw new Error(resJson.error?.message || `Error en ${m}`);
        const content = resJson.choices?.[0]?.message?.content;
        return this.cleanAndParseResponse(content);
      } catch (err) {
        console.warn(`[OpenRouter] Falló modelo ${m}:`, err.message);
        lastErr = err;
      }
    }
    throw lastErr || new Error('No se pudo procesar con los modelos de OpenRouter');
  }

  static async processText(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('El texto no puede estar vacío');
    }

    // Prioridad de credencial:
    // 1. Clave personal del usuario (si la agregó en Ajustes)
    // 2. Clave por defecto de la app (servidor Vercel o config.local.js)
    const customKey = localStorage.getItem('custom_openrouter_key')?.trim() || '';
    const apiKey = customKey || APP_CONFIG.DEFAULT_OPENROUTER_KEY || '';
    const model = APP_CONFIG.DEFAULT_OPENROUTER_MODEL || 'openrouter/free';
    const currentDate = getLocalDateISO();

    // 1. Intentar llamar al backend (/api/organize-text en Vercel Serverless o Express local)
    // El servidor tiene configurada la variable OPENROUTER_API_KEY de forma segura
    try {
      const response = await fetch('/api/organize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          provider: 'openrouter',
          apiKey: customKey || undefined,
          model,
          currentDate
        })
      });

      if (response.ok) {
        return await response.json();
      }

      // Si el servidor respondió con un error específico (por ejemplo 400 o 500)
      if (response.status !== 404) {
        const errJson = await response.json().catch(() => null);
        if (errJson?.error) {
          throw new Error(errJson.error);
        }
      }
    } catch (err) {
      // Si el error provino directamente del servidor con un mensaje explícito, mostrarlo
      if (err.message && !err.message.includes('fetch') && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      console.warn('[AIService] Backend /api/organize-text no disponible, intentando fallback directo:', err.message);
    }

    // 2. Fallback: Llamada directa a OpenRouter desde el navegador (para GitHub Pages estático o local)
    if (apiKey) {
      return await this.directOpenRouter(apiKey, text.trim(), model, currentDate);
    }

    // 3. Si el servidor no estuvo disponible y no hay clave en el cliente
    throw new Error('No se pudo contactar al servidor y no hay una API Key de OpenRouter configurada en el dispositivo. Puedes agregar tu clave personal en Ajustes (⚙️).');
  }
}
