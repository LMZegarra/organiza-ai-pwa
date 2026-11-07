const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({
  dest: '/tmp/voice_uploads',
  limits: { fileSize: 25 * 1024 * 1024 }
});

function getLocalDateISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeTimeString(timeStr) {
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

// Helper de limpieza y validación de respuesta JSON
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

function buildSystemPrompt(currentDate = getLocalDateISO()) {
  const dayName = new Date().toLocaleDateString('es-ES', { weekday: 'long' });
  return `
Eres un asistente experto en organización de proyectos, productividad y gestión de agendas.
Fecha de referencia actual: ${currentDate} (${dayName}).

Analiza el siguiente texto proporcionado por el usuario y extráelo organizadamente en un JSON estricto.
Texto del usuario:
`;
}

const JSON_PROMPT_INSTRUCTIONS = `
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

// Procesar con Google Gemini
async function processWithGemini(apiKey, text, model = 'gemini-1.5-flash', currentDate) {
  const prompt = `${buildSystemPrompt(currentDate)}\n"""\n${text}\n"""\n\n${JSON_PROMPT_INSTRUCTIONS}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{ text: prompt }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error?.message || `Error en Gemini (${response.status})`);
  }

  const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini retornó una respuesta vacía');

  return cleanAndNormalizeAIResponse(rawText);
}

// Procesar con OpenRouter
async function processWithOpenRouter(apiKey, text, preferredModel, currentDate) {
  const modelsToTry = [
    preferredModel,
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-4-31b-it:free',
    'openrouter/free'
  ].filter(Boolean);

  const prompt = `${buildSystemPrompt(currentDate)}\n"""\n${text}\n"""\n\n${JSON_PROMPT_INSTRUCTIONS}`;
  let lastError = null;

  for (const model of [...new Set(modelsToTry)]) {
    try {
      console.log(`[OpenRouter] Intentando con modelo: ${model}...`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'OrganizaAI PWA'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error?.message || `Error ${response.status} en OpenRouter con ${model}`);
      }

      const content = resJson.choices?.[0]?.message?.content;
      if (!content) throw new Error('Respuesta vacía');

      const parsed = cleanAndNormalizeAIResponse(content);
      console.log(`[OpenRouter] Éxito con ${model}!`);
      return parsed;

    } catch (err) {
      console.warn(`[OpenRouter] Falló ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo procesar con los modelos de OpenRouter');
}

// ENDPOINT PRINCIPAL: Organizar Texto
app.post('/api/organize-text', async (req, res) => {
  try {
    const { text, provider, apiKey, model, currentDate } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'El texto no puede estar vacío.' });
    }

    const keyToUse = apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY);
    if (!keyToUse) {
      return res.status(400).json({
        error: `Por favor ingresa tu API Key de ${provider === 'gemini' ? 'Google Gemini' : 'OpenRouter'} en los ajustes (⚙️).`
      });
    }

    let result;
    if (provider === 'gemini') {
      result = await processWithGemini(keyToUse, text, model || 'gemini-1.5-flash', currentDate);
    } else {
      result = await processWithOpenRouter(keyToUse, text, model || 'openrouter/free', currentDate);
    }

    return res.json(result);

  } catch (error) {
    console.error('Error en /api/organize-text:', error);
    return res.status(500).json({ error: error.message || 'Error al procesar el texto.' });
  }
});

// Info IP local para sincronización y acceso móvil
app.get('/api/server-info', (req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  res.json({ ips: addresses, port });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`OrganizaAI PWA activa en http://localhost:${port}`);
});
