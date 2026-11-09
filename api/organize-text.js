/**
 * Vercel Serverless Function: /api/organize-text
 * Permite procesar texto con OpenRouter de forma segura sin exponer la API Key en el frontend público.
 */

function getLocalDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayNameFromDate(dateISO) {
  if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    return new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  }
  const [y, m, d] = dateISO.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
}

function normalizeTimeString(timeStr) {
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

function cleanAndNormalizeAIResponse(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Respuesta de IA vacía o ilegible');
  }

  let clean = content.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    clean = jsonMatch[0];
  }

  const parsed = JSON.parse(clean);

  return {
    summary: parsed.summary || 'Resumen generado.',
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((t, idx) => ({
      id: t.id || `task_${Date.now()}_${idx}`,
      title: t.title || 'Tarea',
      priority: ['alta', 'media', 'baja'].includes(t.priority?.toLowerCase()) ? t.priority.toLowerCase() : 'media',
      category: t.category || 'General',
      due_date: t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
      completed: Boolean(t.completed)
    })) : [],
    calendar_events: Array.isArray(parsed.calendar_events) ? parsed.calendar_events.map((e, idx) => ({
      id: e.id || `event_${Date.now()}_${idx}`,
      title: e.title || 'Evento',
      date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : getLocalDateISO(),
      start_time: normalizeTimeString(e.start_time),
      end_time: normalizeTimeString(e.end_time),
      location: e.location || '',
      description: e.description || ''
    })) : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(n => typeof n === 'string' ? n : (n.content || JSON.stringify(n))).filter(Boolean) : []
  };
}

function getSystemPrompt(currentDate = getLocalDateISO()) {
  const dayName = getDayNameFromDate(currentDate);
  return `
Eres un asistente experto en organización de proyectos, productividad y gestión de agendas.
Fecha de referencia actual: ${currentDate} (${dayName}).

Analiza el siguiente texto y extráelo organizadamente en un JSON estricto.
REGLAS:
1. "calendar_events": Compromisos, citas, reuniones o eventos que tengan una fecha u hora explícita o relativa ("mañana", "el jueves a las 3", "20 de noviembre"). Calcula la fecha ISO "YYYY-MM-DD" y hora "HH:mm" (24h) basándote en la fecha de referencia.
2. "tasks": Acciones o tareas a realizar. Asigna una "priority" ("alta", "media" o "baja"), "category" ("Trabajo", "Personal", "Compras", "Estudio", "Salud", "General") y "due_date" (YYYY-MM-DD o null).
3. "notes": Ideas, apuntes, reflexiones o datos útiles que no constituyen ni una tarea ni un evento de calendario.
4. "summary": Una o dos oraciones breves que resuman la nota.

Responde ÚNICAMENTE con un JSON con la siguiente estructura exacta:
{
  "summary": "Resumen conciso",
  "tasks": [
    { "title": "...", "priority": "alta|media|baja", "category": "Trabajo|Personal|...", "due_date": "YYYY-MM-DD o null", "completed": false }
  ],
  "calendar_events": [
    { "title": "...", "date": "YYYY-MM-DD", "start_time": "HH:mm o null", "end_time": "HH:mm o null", "location": "...", "description": "..." }
  ],
  "notes": ["..."]
}
`;
}

module.exports = async (req, res) => {
  // Configurar CORS estándar para API pública
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { text, apiKey, model, currentDate } = req.body || {};

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'El texto no puede estar vacío.' });
    }

    if (text.length > 25000) {
      return res.status(400).json({ error: 'El texto excede el límite máximo permitido (25,000 caracteres).' });
    }

    // Usa la clave enviada por el usuario o la variable de entorno de Vercel/servidor
    const keyToUse = apiKey || process.env.OPENROUTER_API_KEY;
    if (!keyToUse) {
      return res.status(400).json({
        error: 'No se encontró API Key de OpenRouter configurada en el servidor ni en los ajustes.'
      });
    }

    const preferredModel = model || process.env.OPENROUTER_MODEL || 'openrouter/free';
    const modelsToTry = [
      preferredModel,
      'openrouter/free',
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free'
    ].filter(Boolean);

    const prompt = `${getSystemPrompt(currentDate)}\n\nTexto del usuario:\n"""\n${text}\n"""`;
    let lastError = null;

    for (const m of [...new Set(modelsToTry)]) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4500); // 4.5s timeout por modelo para permitir fallback dentro del límite de 10s de Vercel

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keyToUse}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://organiza-ai-pwa.vercel.app',
            'X-Title': 'OrganizaAI'
          },
          body: JSON.stringify({
            model: m,
            messages: [{ role: 'user', content: prompt }]
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const resJson = await response.json();
        if (!response.ok) {
          throw new Error(resJson.error?.message || `Error ${response.status} en ${m}`);
        }

        const content = resJson.choices?.[0]?.message?.content;
        if (!content) throw new Error('Respuesta vacía');

        const parsed = cleanAndNormalizeAIResponse(content);
        return res.json(parsed);

      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('No se pudo procesar con los modelos de OpenRouter');

  } catch (err) {
    console.error('Error procesando texto en Vercel Function:', err);
    return res.status(500).json({ error: err.message || 'Error al procesar con IA' });
  }
};
