const assert = require('assert');

// Mock simple de localStorage para Node
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock;

// Importar lógica simplificada de Storage
const STORAGE_KEYS = {
  TASKS: 'organiza_local_tasks',
  EVENTS: 'organiza_local_events',
  NOTES: 'organiza_local_notes'
};

function getTasks() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
}

function saveTask(task) {
  const tasks = getTasks();
  if (!task.status) {
    task.status = task.completed ? 'completed' : 'pending';
  }
  const idx = tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) tasks[idx] = { ...tasks[idx], ...task };
  else tasks.unshift(task);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

function toggleTask(id) {
  const tasks = getTasks();
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    task.status = task.completed ? 'completed' : 'pending';
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }
}

function clearLocalDataOnLogout() {
  localStorage.removeItem(STORAGE_KEYS.TASKS);
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
  localStorage.removeItem(STORAGE_KEYS.NOTES);
}

function deleteTask(id) {
  let tasks = getTasks();
  tasks = tasks.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
}

const EVENT_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#ea580c'
];

function getNextAvailableEventColor(date, existingEvents = [], currentEventId = null) {
  if (!date) return EVENT_COLORS[0];
  const sameDateEvents = existingEvents.filter(e => e.date === date && e.id !== currentEventId);
  const usedColors = new Set(sameDateEvents.map(e => (e.color || '').toLowerCase()).filter(Boolean));
  const available = EVENT_COLORS.find(c => !usedColors.has(c.toLowerCase()));
  if (available) return available;
  return EVENT_COLORS[sameDateEvents.length % EVENT_COLORS.length];
}

function getEvents() {
  const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
  return parsed.map((e, idx) => {
    if (!e.color) {
      e.color = EVENT_COLORS[idx % EVENT_COLORS.length];
    }
    return e;
  });
}

function saveEvent(event) {
  const events = getEvents();
  if (!event.color) {
    event.color = getNextAvailableEventColor(event.date, events, event.id);
  }
  const idx = events.findIndex(e => e.id === event.id);
  if (idx >= 0) events[idx] = { ...events[idx], ...event };
  else events.push(event);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

function deleteEvent(id) {
  let events = getEvents();
  events = events.filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
}

function getNotes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
}

function saveNote(note) {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === note.id);
  if (idx >= 0) notes[idx] = { ...notes[idx], ...note };
  else notes.unshift(note);
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

function updateNote(id, newContent) {
  const notes = getNotes();
  const note = notes.find(n => n.id === id);
  if (note) {
    note.content = newContent;
    note.updated_at = new Date().toISOString();
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  }
}

function deleteNote(id) {
  let notes = getNotes();
  notes = notes.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
}

function searchNotes(query) {
  const notes = getNotes();
  if (!query || !query.trim()) return notes;
  const q = query.toLowerCase().trim();
  return notes.filter(n => (n.content || '').toLowerCase().includes(q));
}

console.log('Probando operaciones de Storage...');
localStorage.clear();

// Pruebas de Tareas
saveTask({ id: 't1', title: 'Comprar café', priority: 'media', category: 'Compras', completed: false });
assert.strictEqual(getTasks().length, 1);
assert.strictEqual(getTasks()[0].completed, false);
assert.strictEqual(getTasks()[0].status, 'pending');

toggleTask('t1');
assert.strictEqual(getTasks()[0].completed, true);
assert.strictEqual(getTasks()[0].status, 'completed');

toggleTask('t1');
assert.strictEqual(getTasks()[0].completed, false);
assert.strictEqual(getTasks()[0].status, 'pending');

// Update existing task
saveTask({ id: 't1', title: 'Comprar café descafeinado', priority: 'alta', due_date: '2026-11-10', completed: true, status: 'completed' });
assert.strictEqual(getTasks()[0].title, 'Comprar café descafeinado');
assert.strictEqual(getTasks()[0].priority, 'alta');
assert.strictEqual(getTasks()[0].due_date, '2026-11-10');
assert.strictEqual(getTasks()[0].completed, true);

// Prueba de estados de Kanban (pending, in_progress, completed)
saveTask({ id: 't2', title: 'Diseñar arquitectura', priority: 'alta', status: 'pending', completed: false });
assert.strictEqual(getTasks().find(t => t.id === 't2').status, 'pending');

saveTask({ id: 't2', status: 'in_progress' });
assert.strictEqual(getTasks().find(t => t.id === 't2').status, 'in_progress');

saveTask({ id: 't2', status: 'completed', completed: true });
assert.strictEqual(getTasks().find(t => t.id === 't2').completed, true);
assert.strictEqual(getTasks().find(t => t.id === 't2').status, 'completed');

deleteTask('t1');
deleteTask('t2');
assert.strictEqual(getTasks().length, 0);

// Pruebas de Notas
saveNote({ id: 'n1', content: 'Idea para proyecto de inteligencia artificial' });
saveNote({ id: 'n2', content: 'Recordar comprar baterías AAA' });
assert.strictEqual(getNotes().length, 2);

updateNote('n1', 'Idea para proyecto de inteligencia artificial en PWA');
assert.strictEqual(getNotes().find(n => n.id === 'n1').content, 'Idea para proyecto de inteligencia artificial en PWA');

// Búsqueda de Notas
const searchResults = searchNotes('inteligencia');
assert.strictEqual(searchResults.length, 1);
assert.strictEqual(searchResults[0].id, 'n1');

deleteNote('n2');
assert.strictEqual(getNotes().length, 1);

// Pruebas de Eventos y Colores Distintos por Día
saveEvent({ id: 'e1', title: 'Reunión Matutina', date: '2026-11-15', start_time: '09:00' });
assert.strictEqual(getEvents().length, 1);
assert.strictEqual(getEvents()[0].color, '#2563eb'); // Primer color por defecto

// 2do evento en el mismo día debe recibir un color distinto automáticamente
saveEvent({ id: 'e2', title: 'Almuerzo de Equipo', date: '2026-11-15', start_time: '13:00' });
assert.strictEqual(getEvents().length, 2);
const ev2 = getEvents().find(e => e.id === 'e2');
assert.notStrictEqual(ev2.color, '#2563eb'); // Color distinto al primero
assert.strictEqual(ev2.color, '#10b981'); // Segundo color de la paleta

// 3er evento en el mismo día debe recibir el tercer color distinto
saveEvent({ id: 'e3', title: 'Dentista', date: '2026-11-15', start_time: '16:00' });
const ev3 = getEvents().find(e => e.id === 'e3');
assert.strictEqual(ev3.color, '#f59e0b');

// Edición de color manual por el usuario (paleta de 10 colores)
saveEvent({ id: 'e3', color: '#ec4899' }); // Rosa fucsia
assert.strictEqual(getEvents().find(e => e.id === 'e3').color, '#ec4899');

deleteEvent('e1');
deleteEvent('e2');
deleteEvent('e3');
assert.strictEqual(getEvents().length, 0);

console.log('✅ Pruebas de StorageService pasaron exitosamente.');
