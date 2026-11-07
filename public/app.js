/**
 * app.js
 * Controlador principal de OrganizaAI PWA.
 * Integra AIService, StorageService, SupabaseService y CalendarComponent.
 */

import { storage } from './js/storage-service.js';
import { SupabaseService } from './js/supabase-client.js';
import { AIService } from './js/ai-service.js';
import { CalendarComponent } from './js/calendar-component.js';

// DOM Elements
const organizeForm = document.getElementById('organizeForm');
const inputText = document.getElementById('inputText');
const btnSubmitText = document.getElementById('btnSubmitText');
const loadingIndicator = document.getElementById('loadingIndicator');
const loadingText = document.getElementById('loadingText');

const syncBadge = document.getElementById('syncBadge');
const syncText = document.getElementById('syncText');

const badgeTaskCount = document.getElementById('badgeTaskCount');
const badgeNoteCount = document.getElementById('badgeNoteCount');

const taskListElement = document.getElementById('taskListElement');
const selectCategoryFilter = document.getElementById('selectCategoryFilter');
const selectStatusFilter = document.getElementById('selectStatusFilter');
const btnQuickAddTask = document.getElementById('btnQuickAddTask');

const notesContainer = document.getElementById('notesContainer');
const btnClearNotes = document.getElementById('btnClearNotes');

const historyListElement = document.getElementById('historyListElement');
const btnClearHistory = document.getElementById('btnClearHistory');

// Dialog Ajustes
const dialogSettings = document.getElementById('dialogSettings');
const btnSettings = document.getElementById('btnSettings');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnDismissModal = document.getElementById('btnDismissModal');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const selectAiProvider = document.getElementById('selectAiProvider');
const sectionGeminiConfig = document.getElementById('sectionGeminiConfig');
const sectionOpenRouterConfig = document.getElementById('sectionOpenRouterConfig');
const inputGeminiKey = document.getElementById('inputGeminiKey');
const selectGeminiModel = document.getElementById('selectGeminiModel');
const inputOpenRouterKey = document.getElementById('inputOpenRouterKey');
const selectOpenRouterModel = document.getElementById('selectOpenRouterModel');
const inputSupabaseUrl = document.getElementById('inputSupabaseUrl');
const inputSupabaseAnonKey = document.getElementById('inputSupabaseAnonKey');
const btnTestSupabase = document.getElementById('btnTestSupabase');
const testSyncStatus = document.getElementById('testSyncStatus');

// Inicializar Calendario
const calendarMount = document.getElementById('calendarMount');
let calendarComponent = null;

if (calendarMount) {
  calendarComponent = new CalendarComponent(calendarMount);
}

// -------------------------------------------------------------
// Sincronización y Estado de Conexión
// -------------------------------------------------------------
function updateSyncBadge() {
  if (SupabaseService.isConfigured()) {
    syncBadge.className = 'sync-badge synced';
    syncText.textContent = 'En línea (Nube)';
  } else {
    syncBadge.className = 'sync-badge local';
    syncText.textContent = 'Local (Offline)';
  }
}

// -------------------------------------------------------------
// Pestañas Principales
// -------------------------------------------------------------
document.querySelectorAll('.view-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

    tab.classList.add('active');
    const targetId = tab.dataset.target;
    const targetPanel = document.getElementById(targetId);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }
  });
});

// -------------------------------------------------------------
// Entrada de Texto Inteligente & Envío IME-safe
// -------------------------------------------------------------
// Detectar atajo Ctrl+Enter o Enter seguro con IME (según Modern Web Guidance)
inputText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    // Si presiona Ctrl+Enter o Cmd+Enter, enviar formulario
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.isComposing || e.keyCode === 229) return;
      organizeForm.requestSubmit();
    }
  }
});

// Chips de ejemplo rápido
document.querySelectorAll('.chip-btn').forEach(chip => {
  chip.addEventListener('click', () => {
    inputText.value = chip.dataset.text;
    inputText.focus();
  });
});

// Envío del Formulario
organizeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = inputText.value.trim();
  if (!text) return;

  loadingIndicator.classList.remove('hidden');
  loadingText.textContent = 'Interpretando con IA y clasificando en tareas y calendario...';
  btnSubmitText.disabled = true;

  try {
    const aiResult = await AIService.processText(text);

    // Guardar en almacenamiento local y sincronizar con la nube
    storage.addBatchFromAI(aiResult, text);

    inputText.value = '';
    alert('✨ ¡Organizado con éxito! Revisa tu calendario y lista de tareas.');

    // Si generó eventos, cambiar a la pestaña de calendario
    if (aiResult.calendar_events && aiResult.calendar_events.length > 0) {
      document.querySelector('.view-tab[data-target="viewCalendar"]')?.click();
    } else {
      document.querySelector('.view-tab[data-target="viewTasks"]')?.click();
    }

  } catch (err) {
    console.error('Error al procesar:', err);
    if (err.message.includes('API Key') || err.message.includes('Configuración')) {
      dialogSettings.showModal();
    }
    alert(err.message || 'Error al comunicarse con la IA');
  } finally {
    loadingIndicator.classList.add('hidden');
    btnSubmitText.disabled = false;
  }
});

// -------------------------------------------------------------
// Renderizado de Tareas y Filtros
// -------------------------------------------------------------
function renderTasks() {
  const allTasks = storage.getTasks();
  badgeTaskCount.textContent = allTasks.filter(t => !t.completed).length;

  const categoryFilter = selectCategoryFilter.value;
  const statusFilter = selectStatusFilter.value;

  let filtered = allTasks;

  if (categoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  if (statusFilter === 'pending') {
    filtered = filtered.filter(t => !t.completed);
  } else if (statusFilter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  }

  if (filtered.length === 0) {
    taskListElement.innerHTML = `
      <li style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.9rem;">
        No hay tareas que coincidan con los filtros seleccionados.
      </li>
    `;
    return;
  }

  taskListElement.innerHTML = '';
  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-card ${task.completed ? 'completed' : ''}`;
    li.innerHTML = `
      <input type="checkbox" class="task-chk" ${task.completed ? 'checked' : ''} data-id="${task.id}">
      <div class="task-body">
        <span class="task-text">${task.title}</span>
        <div class="task-meta">
          <span class="category-tag">${task.category || 'General'}</span>
          <span class="task-priority priority-${task.priority || 'media'}">${task.priority || 'media'}</span>
          ${task.due_date ? `<span class="task-due">📅 ${task.due_date}</span>` : ''}
        </div>
      </div>
      <button class="btn-icon-danger btn-delete-task" data-id="${task.id}" title="Eliminar tarea">🗑️</button>
    `;

    li.querySelector('.task-chk').addEventListener('change', () => {
      storage.toggleTask(task.id);
    });

    li.querySelector('.btn-delete-task').addEventListener('click', () => {
      if (confirm(`¿Eliminar la tarea "${task.title}"?`)) {
        storage.deleteTask(task.id);
      }
    });

    taskListElement.appendChild(li);
  });
}

selectCategoryFilter.addEventListener('change', renderTasks);
selectStatusFilter.addEventListener('change', renderTasks);

// Añadir tarea manual rápida
btnQuickAddTask.addEventListener('click', () => {
  const title = prompt('Descripción de la tarea:');
  if (title && title.trim()) {
    const category = prompt('Categoría (Trabajo, Personal, Compras, General):', 'General') || 'General';
    const dueDate = prompt('Fecha límite (YYYY-MM-DD) o dejar en blanco:', '');
    storage.saveTask({
      id: `task_manual_${Date.now()}`,
      title: title.trim(),
      priority: 'media',
      category: category.trim(),
      due_date: dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim()) ? dueDate.trim() : null,
      completed: false,
      created_at: new Date().toISOString()
    });
  }
});

// -------------------------------------------------------------
// Renderizado de Notas e Ideas
// -------------------------------------------------------------
function renderNotes() {
  const notes = storage.getNotes();
  badgeNoteCount.textContent = notes.length;

  if (notes.length === 0) {
    notesContainer.innerHTML = `
      <p style="text-align:center; grid-column:1/-1; padding:24px; color:var(--text-muted); font-size:0.9rem;">
        Aún no tienes ideas o notas rápidas guardadas.
      </p>
    `;
    return;
  }

  notesContainer.innerHTML = '';
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    const content = typeof note === 'string' ? note : (note.content || note.text || '');
    const dateFormatted = note.created_at ? new Date(note.created_at).toLocaleDateString() : '';

    card.innerHTML = `
      <p class="note-content">${content}</p>
      <div class="note-footer">
        <span>${dateFormatted}</span>
        <div>
          <button class="btn-link btn-copy-note" style="margin-right:8px;">Copiar</button>
          <button class="btn-icon-danger btn-delete-note">🗑️</button>
        </div>
      </div>
    `;

    card.querySelector('.btn-copy-note').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => alert('Copiado al portapapeles'));
    });

    card.querySelector('.btn-delete-note').addEventListener('click', () => {
      storage.deleteNote(note.id);
    });

    notesContainer.appendChild(card);
  });
}

btnClearNotes.addEventListener('click', () => {
  if (confirm('¿Deseas vaciar todas las notas e ideas?')) {
    localStorage.removeItem('organiza_local_notes');
    storage.notify();
  }
});

// -------------------------------------------------------------
// Historial de Procesamiento
// -------------------------------------------------------------
function renderHistory() {
  let history = [];
  try {
    history = JSON.parse(localStorage.getItem('organiza_local_history') || '[]');
  } catch {
    history = [];
  }

  if (history.length === 0) {
    historyListElement.innerHTML = `
      <p style="text-align:center; padding:24px; color:var(--text-muted); font-size:0.9rem;">
        No hay registros en el historial de entradas.
      </p>
    `;
    return;
  }

  historyListElement.innerHTML = '';
  history.forEach(item => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-meta">
        <span>📅 ${item.date}</span>
        <span>✅ ${item.tasksCount} tareas &bull; 🗓️ ${item.eventsCount} eventos</span>
      </div>
      <div class="history-summary">${item.summary || 'Procesado con IA'}</div>
      <div class="history-raw">"${item.rawText}"</div>
    `;

    card.addEventListener('click', () => {
      inputText.value = item.rawText;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    historyListElement.appendChild(card);
  });
}

btnClearHistory.addEventListener('click', () => {
  if (confirm('¿Deseas limpiar el historial de entradas?')) {
    localStorage.removeItem('organiza_local_history');
    renderHistory();
  }
});

// -------------------------------------------------------------
// Modal de Ajustes (Native <dialog>)
// -------------------------------------------------------------
function loadSettingsIntoDialog() {
  const provider = localStorage.getItem('ai_provider') || 'gemini';
  selectAiProvider.value = provider;
  toggleProviderFields(provider);

  inputGeminiKey.value = localStorage.getItem('gemini_api_key') || '';
  selectGeminiModel.value = localStorage.getItem('gemini_model') || 'gemini-1.5-flash';

  inputOpenRouterKey.value = localStorage.getItem('openrouter_api_key') || '';
  selectOpenRouterModel.value = localStorage.getItem('openrouter_model') || 'openrouter/free';

  inputSupabaseUrl.value = localStorage.getItem('supabase_url') || '';
  inputSupabaseAnonKey.value = localStorage.getItem('supabase_anon_key') || '';
  testSyncStatus.textContent = '';
}

function toggleProviderFields(provider) {
  if (provider === 'gemini') {
    sectionGeminiConfig.classList.remove('hidden');
    sectionOpenRouterConfig.classList.add('hidden');
  } else {
    sectionGeminiConfig.classList.add('hidden');
    sectionOpenRouterConfig.classList.remove('hidden');
  }
}

selectAiProvider.addEventListener('change', (e) => {
  toggleProviderFields(e.target.value);
});

// Pestañas internas del Modal de Ajustes
document.querySelectorAll('.settings-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(c => c.classList.remove('active'));

    btn.classList.add('active');
    const target = document.getElementById(btn.dataset.tab);
    if (target) target.classList.add('active');
  });
});

btnSettings.addEventListener('click', () => {
  loadSettingsIntoDialog();
  dialogSettings.showModal();
});

const closeSettingsDialog = () => {
  dialogSettings.close();
};

btnCloseModal.addEventListener('click', closeSettingsDialog);
btnDismissModal.addEventListener('click', closeSettingsDialog);

btnTestSupabase.addEventListener('click', async () => {
  const url = inputSupabaseUrl.value.trim();
  const key = inputSupabaseAnonKey.value.trim();
  testSyncStatus.textContent = 'Probando conexión...';
  testSyncStatus.className = 'test-status-label';

  try {
    await SupabaseService.testConnection(url, key);
    testSyncStatus.textContent = '✅ Conexión exitosa';
    testSyncStatus.className = 'test-status-label success';
  } catch (err) {
    testSyncStatus.textContent = `❌ ${err.message}`;
    testSyncStatus.className = 'test-status-label error';
  }
});

btnSaveSettings.addEventListener('click', async () => {
  localStorage.setItem('ai_provider', selectAiProvider.value);
  localStorage.setItem('gemini_api_key', inputGeminiKey.value.trim());
  localStorage.setItem('gemini_model', selectGeminiModel.value);
  localStorage.setItem('openrouter_api_key', inputOpenRouterKey.value.trim());
  localStorage.setItem('openrouter_model', selectOpenRouterModel.value);

  const prevUrl = localStorage.getItem('supabase_url');
  const prevKey = localStorage.getItem('supabase_anon_key');
  const newUrl = inputSupabaseUrl.value.trim();
  const newKey = inputSupabaseAnonKey.value.trim();

  localStorage.setItem('supabase_url', newUrl);
  localStorage.setItem('supabase_anon_key', newKey);

  // Reiniciar cliente si cambiaron credenciales
  if (prevUrl !== newUrl || prevKey !== newKey) {
    SupabaseService.resetClient();
    if (newUrl && newKey) {
      storage.syncWithCloud();
    }
  }

  updateSyncBadge();
  alert('Ajustes guardados correctamente.');
  closeSettingsDialog();
});

// -------------------------------------------------------------
// Registro en el Store y Actualizaciones Globales
// -------------------------------------------------------------
storage.subscribe(() => {
  renderTasks();
  renderNotes();
  renderHistory();
});

// Carga Inicial
updateSyncBadge();
renderTasks();
renderNotes();
renderHistory();

// -------------------------------------------------------------
// Registro del Service Worker (PWA)
// -------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado:', reg.scope))
      .catch(err => console.warn('Fallo registro Service Worker:', err));
  });
}
