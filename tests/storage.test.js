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

console.log('Probando operaciones de Storage...');
localStorage.clear();

saveTask({ id: 't1', title: 'Comprar café', completed: false });
assert.strictEqual(getTasks().length, 1);
assert.strictEqual(getTasks()[0].completed, false);

toggleTask('t1');
assert.strictEqual(getTasks()[0].completed, true);

// Update existing
saveTask({ id: 't1', title: 'Comprar café descafeinado' });
assert.strictEqual(getTasks()[0].title, 'Comprar café descafeinado');
assert.strictEqual(getTasks()[0].completed, true);

console.log('✅ Pruebas de StorageService pasaron exitosamente.');
