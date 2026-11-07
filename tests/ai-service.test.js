const assert = require('assert');

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
      date: e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : new Date().toISOString().slice(0, 10),
      start_time: e.start_time && /^\d{2}:\d{2}$/.test(e.start_time) ? e.start_time : null,
      end_time: e.end_time && /^\d{2}:\d{2}$/.test(e.end_time) ? e.end_time : null,
      location: e.location || '',
      description: e.description || ''
    })) : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes.filter(Boolean) : []
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

console.log('✅ Todas las pruebas de parseo pasaron exitosamente.');
