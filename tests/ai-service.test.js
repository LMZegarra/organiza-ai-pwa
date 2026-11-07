const assert = require('assert');

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

// Función pura de limpieza y parseo de respuestas JSON de modelos LLM
function parseAIResponse(content) {
  if (!content || typeof content !== 'string') {
    throw new Error('Respuesta de IA vacía o inválida');
  }

  // Eliminar bloques markdown ```json ... ``` si existen
  let cleanText = content.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Si aún contiene texto alrededor, extraer el primer objeto JSON válido
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleanText = jsonMatch[0];
  }

  const parsed = JSON.parse(cleanText);

  // Normalizar estructura esperada
  return {
    summary: parsed.summary || '',
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((t, idx) => ({
      id: t.id || `task_${Date.now()}_${idx}`,
      title: t.title || 'Tarea sin título',
      priority: ['alta', 'media', 'baja'].includes(t.priority?.toLowerCase()) ? t.priority.toLowerCase() : 'media',
      category: t.category || 'General',
      due_date: t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : null,
      completed: Boolean(t.completed)
    })) : [],
    calendar_events: Array.isArray(parsed.calendar_events) ? parsed.calendar_events.map((e, idx) => ({
      id: e.id || `event_${Date.now()}_${idx}`,
      title: e.title || 'Evento sin título',
      date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : getLocalDateISO(),
      start_time: normalizeTimeString(e.start_time),
      end_time: normalizeTimeString(e.end_time),
      location: e.location || '',
      description: e.description || ''
    })) : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(n => typeof n === 'string' ? n : (n.content || JSON.stringify(n))).filter(Boolean) : []
  };
}

// Tests
console.log('Ejecutando pruebas de parsing de IA...');

// Test 1: Markdown envolvente ```json
const raw1 = '```json\n{"summary":"Resumen","tasks":[{"title":"Comprar leche","priority":"alta"}],"calendar_events":[],"notes":["Nota 1"]}\n```';
const res1 = parseAIResponse(raw1);
assert.strictEqual(res1.summary, 'Resumen');
assert.strictEqual(res1.tasks.length, 1);
assert.strictEqual(res1.tasks[0].priority, 'alta');
assert.strictEqual(res1.tasks[0].completed, false);
assert.strictEqual(res1.notes[0], 'Nota 1');

// Test 2: Evento con fecha y hora
const raw2 = '{"calendar_events":[{"title":"Cita médica","date":"2026-11-10","start_time":"15:30"}],"tasks":[]}';
const res2 = parseAIResponse(raw2);
assert.strictEqual(res2.calendar_events.length, 1);
assert.strictEqual(res2.calendar_events[0].date, '2026-11-10');
assert.strictEqual(res2.calendar_events[0].start_time, '15:30');

// Test 3: Prioridad por defecto si viene desconocida
const raw3 = '{"tasks":[{"title":"Hacer ejercicio","priority":"super_urgente"}]}';
const res3 = parseAIResponse(raw3);
assert.strictEqual(res3.tasks[0].priority, 'media');

// Test 4: Normalización de hora de 1 dígito (9:00 -> 09:00) y notas como objetos
const raw4 = '{"calendar_events":[{"title":"Clase de yoga","date":"2026-11-12","start_time":"9:00","end_time":"10:30:00"}],"notes":[{"content":"Recordar toalla"}]}';
const res4 = parseAIResponse(raw4);
assert.strictEqual(res4.calendar_events[0].start_time, '09:00');
assert.strictEqual(res4.calendar_events[0].end_time, '10:30');
assert.strictEqual(res4.notes[0], 'Recordar toalla');

console.log('✅ Todas las pruebas de parseo pasaron exitosamente.');
