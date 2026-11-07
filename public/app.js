/**
 * app.js
 * Controlador principal de OrganizaAI PWA.
 * Integra AIService, StorageService, SupabaseService y CalendarComponent.
 */

import { storage } from './js/storage-service.js';
import { SupabaseService } from './js/supabase-client.js';
import { AIService } from './js/ai-service.js';
import { CalendarComponent } from './js/calendar-component.js';
import { APP_CONFIG } from './js/config.js';

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
const btnQuickAddNote = document.getElementById('btnQuickAddNote');
const inputSearchNotes = document.getElementById('inputSearchNotes');
let noteSearchQuery = '';

const historyListElement = document.getElementById('historyListElement');
const btnClearHistory = document.getElementById('btnClearHistory');

// Dialog Ajustes
const dialogSettings = document.getElementById('dialogSettings');
const btnSettings = document.getElementById('btnSettings');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnDismissModal = document.getElementById('btnDismissModal');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const inputCustomOpenRouterKey = document.getElementById('inputCustomOpenRouterKey');
const keyStatusBanner = document.getElementById('keyStatusBanner');
const keyStatusText = document.getElementById('keyStatusText');

// Dialog Tarea Modal
const dialogTaskModal = document.getElementById('dialogTaskModal');
const taskModalHeading = document.getElementById('taskModalHeading');
const formTaskModal = document.getElementById('formTaskModal');
const taskModalId = document.getElementById('taskModalId');
const taskModalTitle = document.getElementById('taskModalTitle');
const taskModalCategory = document.getElementById('taskModalCategory');
const taskModalPriority = document.getElementById('taskModalPriority');
const taskModalDueDate = document.getElementById('taskModalDueDate');
const btnCloseTaskModal = document.getElementById('btnCloseTaskModal');
const btnDismissTaskModal = document.getElementById('btnDismissTaskModal');

// Dialog Nota Modal
const dialogNoteModal = document.getElementById('dialogNoteModal');
const noteModalHeading = document.getElementById('noteModalHeading');
const formNoteModal = document.getElementById('formNoteModal');
const noteModalId = document.getElementById('noteModalId');
const noteModalContent = document.getElementById('noteModalContent');
const btnCloseNoteModal = document.getElementById('btnCloseNoteModal');
const btnDismissNoteModal = document.getElementById('btnDismissNoteModal');

// Feedback Táctil (Toast)
function showToast(message, duration = 2400) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

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
inputText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
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

    if (aiResult.calendar_events && aiResult.calendar_events.length > 0) {
      document.querySelector('.view-tab[data-target="viewCalendar"]')?.click();
    } else {
      document.querySelector('.view-tab[data-target="viewTasks"]')?.click();
    }

  } catch (err) {
    console.error('Error al procesar:', err);
    if (err.message.includes('API Key') || err.message.includes('Ajustes')) {
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
      <input type="checkbox" class="task-chk" ${task.completed ? 'checked' : ''} data-id="${task.id}" aria-label="Marcar como completada">
      <div class="task-body">
        <span class="task-text">${task.title}</span>
        <div class="task-meta">
          <span class="category-tag">${task.category || 'General'}</span>
          <span class="task-priority priority-${task.priority || 'media'}">${task.priority || 'media'}</span>
          ${task.due_date ? `<span class="task-due">📅 ${task.due_date}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon-action btn-edit-task" data-id="${task.id}" title="Editar tarea">✏️</button>
        <button class="btn-icon-danger btn-delete-task" data-id="${task.id}" title="Eliminar tarea">🗑️</button>
      </div>
    `;

    li.querySelector('.task-chk').addEventListener('change', () => {
      const willBeCompleted = !task.completed;
      storage.toggleTask(task.id);
      showToast(willBeCompleted ? '✅ ¡Tarea completada!' : 'Tarea marcada como pendiente');
    });

    li.querySelector('.btn-edit-task').addEventListener('click', () => {
      taskModalHeading.textContent = '✏️ Editar Tarea';
      taskModalId.value = task.id;
      taskModalTitle.value = task.title;
      taskModalCategory.value = task.category || 'General';
      taskModalPriority.value = task.priority || 'media';
      taskModalDueDate.value = task.due_date || '';
      dialogTaskModal.showModal();
    });

    li.querySelector('.btn-delete-task').addEventListener('click', () => {
      if (confirm(`¿Eliminar la tarea "${task.title}"?`)) {
        storage.deleteTask(task.id);
        showToast('🗑️ Tarea eliminada');
      }
    });

    taskListElement.appendChild(li);
  });
}

selectCategoryFilter.addEventListener('change', renderTasks);
selectStatusFilter.addEventListener('change', renderTasks);

// Modal Tarea: Abrir para nueva tarea
btnQuickAddTask.addEventListener('click', () => {
  taskModalHeading.textContent = '➕ Nueva Tarea';
  taskModalId.value = '';
  taskModalTitle.value = '';
  taskModalCategory.value = 'General';
  taskModalPriority.value = 'media';
  taskModalDueDate.value = '';
  dialogTaskModal.showModal();
});

const closeTaskModal = () => dialogTaskModal.close();
btnCloseTaskModal.addEventListener('click', closeTaskModal);
btnDismissTaskModal.addEventListener('click', closeTaskModal);

formTaskModal.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = taskModalTitle.value.trim();
  if (!title) return;

  const id = taskModalId.value;
  if (id) {
    storage.saveTask({
      id,
      title,
      category: taskModalCategory.value,
      priority: taskModalPriority.value,
      due_date: taskModalDueDate.value || null
    });
    showToast('✏️ Tarea actualizada');
  } else {
    storage.saveTask({
      id: `task_manual_${Date.now()}`,
      title,
      category: taskModalCategory.value,
      priority: taskModalPriority.value,
      due_date: taskModalDueDate.value || null,
      completed: false,
      created_at: new Date().toISOString()
    });
    showToast('✅ Tarea creada');
  }
  dialogTaskModal.close();
});

// -------------------------------------------------------------
// Renderizado de Notas e Ideas con Búsqueda en Tiempo Real
// -------------------------------------------------------------
if (inputSearchNotes) {
  inputSearchNotes.addEventListener('input', (e) => {
    noteSearchQuery = e.target.value;
    renderNotes();
  });
}

function renderNotes() {
  const allNotes = storage.getNotes();
  badgeNoteCount.textContent = allNotes.length;

  let notes = allNotes;
  if (noteSearchQuery && noteSearchQuery.trim()) {
    const q = noteSearchQuery.toLowerCase().trim();
    notes = notes.filter(n => {
      const content = typeof n === 'string' ? n : (n.content || n.text || '');
      return content.toLowerCase().includes(q);
    });
  }

  if (notes.length === 0) {
    const isSearching = noteSearchQuery && noteSearchQuery.trim().length > 0;
    notesContainer.innerHTML = `
      <p style="text-align:center; grid-column:1/-1; padding:24px; color:var(--text-muted); font-size:0.9rem;">
        ${isSearching ? `No se encontraron notas con "${noteSearchQuery}".` : 'Aún no tienes ideas o notas rápidas guardadas.'}
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
        <div class="note-card-actions">
          <button class="btn-link btn-copy-note" style="margin-right:6px;">Copiar</button>
          <button class="btn-icon-action btn-edit-note" title="Editar nota">✏️</button>
          <button class="btn-icon-danger btn-delete-note" title="Eliminar nota">🗑️</button>
        </div>
      </div>
    `;

    card.querySelector('.btn-copy-note').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => showToast('📋 Copiado al portapapeles'));
    });

    card.querySelector('.btn-edit-note').addEventListener('click', () => {
      noteModalHeading.textContent = '✏️ Editar Nota';
      noteModalId.value = note.id;
      noteModalContent.value = content;
      dialogNoteModal.showModal();
    });

    card.querySelector('.btn-delete-note').addEventListener('click', () => {
      if (confirm('¿Eliminar esta nota?')) {
        storage.deleteNote(note.id);
        showToast('🗑️ Nota eliminada');
      }
    });

    notesContainer.appendChild(card);
  });
}

// Modal Nota: Abrir para nueva nota
if (btnQuickAddNote) {
  btnQuickAddNote.addEventListener('click', () => {
    noteModalHeading.textContent = '💡 Nueva Idea / Nota';
    noteModalId.value = '';
    noteModalContent.value = '';
    dialogNoteModal.showModal();
  });
}

const closeNoteModal = () => dialogNoteModal.close();
if (btnCloseNoteModal) btnCloseNoteModal.addEventListener('click', closeNoteModal);
if (btnDismissNoteModal) btnDismissNoteModal.addEventListener('click', closeNoteModal);

if (formNoteModal) {
  formNoteModal.addEventListener('submit', (e) => {
    e.preventDefault();
    const content = noteModalContent.value.trim();
    if (!content) return;

    const id = noteModalId.value;
    if (id) {
      storage.updateNote(id, content);
      showToast('✏️ Nota actualizada');
    } else {
      storage.saveNote({
        id: `note_manual_${Date.now()}`,
        content,
        created_at: new Date().toISOString()
      });
      showToast('💡 Nota guardada');
    }
    dialogNoteModal.close();
  });
}

btnClearNotes.addEventListener('click', () => {
  if (confirm('¿Deseas vaciar todas las notas e ideas?')) {
    localStorage.removeItem('organiza_local_notes');
    storage.notify();
    showToast('🗑️ Todas las notas han sido eliminadas');
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
  const customKey = localStorage.getItem('custom_openrouter_key') || '';
  inputCustomOpenRouterKey.value = customKey;

  if (customKey) {
    keyStatusText.textContent = 'Usando tu API Key personalizada';
    keyStatusBanner.className = 'sync-badge synced';
  } else {
    keyStatusText.textContent = 'Usando OpenRouter por defecto';
    keyStatusBanner.className = 'sync-badge local';
  }
}

btnSettings.addEventListener('click', () => {
  loadSettingsIntoDialog();
  dialogSettings.showModal();
});

const closeSettingsDialog = () => {
  dialogSettings.close();
};

btnCloseModal.addEventListener('click', closeSettingsDialog);
btnDismissModal.addEventListener('click', closeSettingsDialog);

btnSaveSettings.addEventListener('click', () => {
  const customKey = inputCustomOpenRouterKey.value.trim();
  if (customKey) {
    localStorage.setItem('custom_openrouter_key', customKey);
  } else {
    localStorage.removeItem('custom_openrouter_key');
  }

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
  updateSyncBadge();
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
