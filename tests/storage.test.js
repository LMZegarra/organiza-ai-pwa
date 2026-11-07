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
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }
}

function deleteTask(id) {
  let tasks = getTasks();
  tasks = tasks.filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
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

toggleTask('t1');
assert.strictEqual(getTasks()[0].completed, true);

// Update existing task
saveTask({ id: 't1', title: 'Comprar café descafeinado', priority: 'alta', due_date: '2026-11-10' });
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

console.log('✅ Pruebas de StorageService pasaron exitosamente.');
