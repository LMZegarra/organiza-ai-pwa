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
  const clean = timeStr.trim().toLowerCase();
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = match[2] ? match[2] : '00';
  const meridiem = match[3];
  if (meridiem === 'pm' && h < 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  if (h >= 0 && h <= 23) {
    return `${String(h).padStart(2, '0')}:${m}`;
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
          console.warn('[AIService] Servidor indicó:', errJson.error);
        }
      }
    } catch (err) {
      console.warn('[AIService] Backend /api/organize-text no disponible o sin credencial, activando fallback:', err.message);
    }

    // 2. Fallback: Llamada directa a OpenRouter desde el navegador (para GitHub Pages estático o local)
    if (apiKey) {
      try {
        return await this.directOpenRouter(apiKey, text.trim(), model, currentDate);
      } catch (err) {
        console.warn('[AIService] OpenRouter directo falló, activando motor heurístico local:', err.message);
      }
    }

    // 3. Fallback Heurístico Local (Offline / Sin Conexión): Garantiza que el usuario nunca quede bloqueado
    console.info('[AIService] Procesando con motor heurístico local (Local-First Offline)...');
    return this.localHeuristicParser(text.trim(), currentDate);
  }

  static async organizeText(text) {
    return this.processText(text);
  }

  static localHeuristicParser(rawText, currentDate) {
    const text = (rawText || '').trim();
    const today = new Date();
    const baseDate = currentDate || getLocalDateISO(today);

    let targetDate = baseDate;
    const lower = text.toLowerCase();
    if (lower.includes('mañana')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 1);
      targetDate = getLocalDateISO(d);
    } else if (lower.includes('pasado mañana')) {
      const d = new Date(today);
      d.setDate(d.getDate() + 2);
      targetDate = getLocalDateISO(d);
    } else if (lower.includes('sábado') || lower.includes('sabado')) {
      const d = new Date(today);
      const diff = (6 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      targetDate = getLocalDateISO(d);
    }

    let startTime = null;
    const timeMatch = lower.match(/(?:a las\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|hrs|h)?/);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? timeMatch[2] : '00';
      const meridiem = timeMatch[3];
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      if (lower.includes('noche') && h < 12) h += 12;
      if (h >= 0 && h <= 23) {
        startTime = String(h).padStart(2, '0') + ':' + m;
      }
    }

    const isCalendarEvent = startTime !== null || /reunión|reunion|cita|gimnasio|dentista|zoom|meet|partido|cumpleaños|vuelo/i.test(text);

    const calendar_events = [];
    const tasks = [];
    const notes = [];

    if (isCalendarEvent) {
      calendar_events.push({
        id: 'event_' + Date.now() + '_0',
        title: text.replace(/^(programar|agendar|añadir|crear)\s+/i, '').trim(),
        date: targetDate,
        startTime: startTime || '10:00',
        endTime: null,
        location: /zoom|meet/i.test(text) ? 'Virtual' : '',
        description: 'Planificado con IA: ' + text
      });
    } else if (/comprar|pagar|enviar|revisar|preparar|hacer|llamar|terminar/i.test(text)) {
      const isHigh = /urgente|alta|hoy|pagar/i.test(text);
      const category = /comprar/i.test(text) ? 'Compras' : (/enviar|revisar|informe/i.test(text) ? 'Trabajo' : 'General');
      tasks.push({
        id: 'task_' + Date.now() + '_0',
        title: text.replace(/^(hacer|realizar|recordar)\s+/i, '').trim(),
        priority: isHigh ? 'alta' : 'media',
        category,
        dueDate: targetDate,
        due_date: targetDate,
        completed: false
      });
    } else {
      tasks.push({
        id: 'task_' + Date.now() + '_0',
        title: text,
        priority: 'media',
        category: 'General',
        dueDate: targetDate,
        due_date: targetDate,
        completed: false
      });
    }

    return {
      summary: 'Plan detectado: ' + text,
      calendar_events,
      tasks,
      notes
    };
  }
}
