/**
 * ai-service.js
 * Servicio unificado de Inteligencia Artificial para estructurar texto en:
 * - Tareas (prioridad, categoría, fecha límite)
 * - Eventos de Calendario (fecha, hora inicio/fin, ubicación)
 * - Resumen e Ideas Clave
 * 
 * Soporta tanto llamada a backend Express como ejecución directa en el navegador
 * (para despliegue estático gratuito en GitHub Pages / Vercel sin servidor).
 */

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
        date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : new Date().toISOString().slice(0, 10),
        start_time: e.start_time && /^\d{2}:\d{2}$/.test(e.start_time) ? e.start_time : null,
        end_time: e.end_time && /^\d{2}:\d{2}$/.test(e.end_time) ? e.end_time : null,
        location: e.location || '',
        description: e.description || ''
      })) : [],
      notes: Array.isArray(data.notes) ? data.notes.filter(Boolean) : []
    };
  }

  static getSystemPrompt(currentDateISO = new Date().toISOString().slice(0, 10)) {
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

  // Llamada directa a Google Gemini desde el navegador (serverless)
  static async directGemini(apiKey, text, model = 'gemini-1.5-flash', currentDate) {
    const prompt = `${this.getSystemPrompt(currentDate)}\n\nTexto del usuario:\n"""\n${text}\n"""`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    const resJson = await res.json();
    if (!res.ok) {
      throw new Error(resJson.error?.message || `Error en Google Gemini (${res.status})`);
    }

    const raw = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    return this.cleanAndParseResponse(raw);
  }

  // Llamada directa a OpenRouter desde el navegador (serverless)
  static async directOpenRouter(apiKey, text, preferredModel = 'openrouter/free', currentDate) {
    const prompt = `${this.getSystemPrompt(currentDate)}\n\nTexto del usuario:\n"""\n${text}\n"""`;
    const models = [
      preferredModel,
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'openrouter/free'
    ].filter(Boolean);

    let lastErr = null;
    for (const m of [...new Set(models)]) {
      try {
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
        lastErr = err;
      }
    }
    throw lastErr || new Error('No se pudo procesar con OpenRouter');
  }

  static async processText(text, options = {}) {
    if (!text || text.trim().length === 0) {
      throw new Error('El texto no puede estar vacío');
    }

    const provider = options.provider || localStorage.getItem('ai_provider') || 'gemini';
    const geminiKey = options.geminiKey || localStorage.getItem('gemini_api_key') || '';
    const openrouterKey = options.openrouterKey || localStorage.getItem('openrouter_api_key') || '';
    const geminiModel = options.geminiModel || localStorage.getItem('gemini_model') || 'gemini-1.5-flash';
    const openrouterModel = options.openrouterModel || localStorage.getItem('openrouter_model') || 'openrouter/free';

    const apiKey = provider === 'gemini' ? geminiKey : openrouterKey;
    const model = provider === 'gemini' ? geminiModel : openrouterModel;
    const currentDate = new Date().toISOString().slice(0, 10);

    if (!apiKey) {
      const providerName = provider === 'gemini' ? 'Google Gemini' : 'OpenRouter';
      throw new Error(`Por favor ingresa tu API Key de ${providerName} en Configuración (⚙️).`);
    }

    // 1. Intentar llamar al backend local (si está disponible en modo Node.js)
    try {
      const response = await fetch('/api/organize-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim(), provider, apiKey, model, currentDate })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch {
      // Backend no disponible (modo static/GitHub Pages/Vercel) -> Fallback directo en cliente
      console.log('[AIService] Backend local no detectado. Procesando directamente en el navegador...');
    }

    // 2. Ejecución Directa en el Navegador (Serverless 100% Online)
    if (provider === 'gemini') {
      return await this.directGemini(apiKey, text.trim(), model, currentDate);
    } else {
      return await this.directOpenRouter(apiKey, text.trim(), model, currentDate);
    }
  }
}
