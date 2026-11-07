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
const inputCardSection = document.getElementById('inputCardSection');
const btnToggleExamples = document.getElementById('btnToggleExamples');
const exampleChipsContainer = document.getElementById('exampleChipsContainer');
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
const filterStatusGroup = document.getElementById('filterStatusGroup');
const btnQuickAddTask = document.getElementById('btnQuickAddTask');
const btnClearAllTasks = document.getElementById('btnClearAllTasks');

// Elementos de Modo de Vista y Tablero Kanban
const btnViewList = document.getElementById('btnViewList');
const btnViewKanban = document.getElementById('btnViewKanban');
const kanbanBoardElement = document.getElementById('kanbanBoardElement');
const badgeKanbanPending = document.getElementById('badgeKanbanPending');
const badgeKanbanInProgress = document.getElementById('badgeKanbanInProgress');
const badgeKanbanCompleted = document.getElementById('badgeKanbanCompleted');
const kanbanPendingZone = document.getElementById('kanbanPendingZone');
const kanbanInProgressZone = document.getElementById('kanbanInProgressZone');
const kanbanCompletedZone = document.getElementById('kanbanCompletedZone');
let currentTasksViewMode = localStorage.getItem('organiza_tasks_view_mode') || 'list';

const notesContainer = document.getElementById('notesContainer');
const btnClearNotes = document.getElementById('btnClearNotes');
const btnQuickAddNote = document.getElementById('btnQuickAddNote');
const inputSearchNotes = document.getElementById('inputSearchNotes');
let noteSearchQuery = '';

const historyListElement = document.getElementById('historyListElement');
const btnClearHistory = document.getElementById('btnClearHistory');

// Dialog Unificado de Ajustes y Cuenta
const dialogSettings = document.getElementById('dialogSettings');
const btnSettings = document.getElementById('btnSettings');
const settingsBtnLabel = document.getElementById('settingsBtnLabel');
const tabSettingsGeneral = document.getElementById('tabSettingsGeneral');
const tabSettingsAccount = document.getElementById('tabSettingsAccount');
const settingsGeneralPane = document.getElementById('settingsGeneralPane');
const settingsAccountPane = document.getElementById('settingsAccountPane');
const accountTabBadge = document.getElementById('accountTabBadge');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnDismissModal = document.getElementById('btnDismissModal');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const selectAppTheme = document.getElementById('selectAppTheme');
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

// Dialog Evento Modal
const dialogEventModal = document.getElementById('dialogEventModal');
const eventModalHeading = document.getElementById('eventModalHeading');
const formEventModal = document.getElementById('formEventModal');
const eventModalId = document.getElementById('eventModalId');
const eventModalTitle = document.getElementById('eventModalTitle');
const eventModalDate = document.getElementById('eventModalDate');
const eventModalStartTime = document.getElementById('eventModalStartTime');
const eventModalEndTime = document.getElementById('eventModalEndTime');
const eventModalLocation = document.getElementById('eventModalLocation');
const eventModalDescription = document.getElementById('eventModalDescription');
const btnCloseEventModal = document.getElementById('btnCloseEventModal');
const btnDismissEventModal = document.getElementById('btnDismissEventModal');

// Dialog Confirmación Estilizado
const dialogConfirmModal = document.getElementById('dialogConfirmModal');
const confirmModalHeading = document.getElementById('confirmModalHeading');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const btnConfirmAction = document.getElementById('btnConfirmAction');
const btnCancelConfirm = document.getElementById('btnCancelConfirm');
const btnCloseConfirmModal = document.getElementById('btnCloseConfirmModal');

// Auth y Cuenta (Supabase Auth)
const btnAuthHeader = document.getElementById('btnAuthHeader');
const authBtnText = document.getElementById('authBtnText') || settingsBtnLabel;
const dialogAuthModal = document.getElementById('dialogAuthModal') || {
  showModal: () => {
    switchSettingsTab('account');
    dialogSettings.showModal();
  },
  close: () => dialogSettings.close()
};
const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
const authProfileSection = document.getElementById('authProfileSection');
const userEmailDisplay = document.getElementById('userEmailDisplay');
const btnLogout = document.getElementById('btnLogout');
const btnDismissAuthProfile = document.getElementById('btnDismissAuthProfile');
const authFormSection = document.getElementById('authFormSection');
const tabAuthLogin = document.getElementById('tabAuthLogin');
const tabAuthSignup = document.getElementById('tabAuthSignup');
const authAlertBox = document.getElementById('authAlertBox');
const formAuth = document.getElementById('formAuth');
const inputAuthEmail = document.getElementById('inputAuthEmail');
const inputAuthPassword = document.getElementById('inputAuthPassword');
const btnSubmitAuth = document.getElementById('btnSubmitAuth');
const btnMagicLink = document.getElementById('btnMagicLink');

let authMode = 'login';
let activeUser = null;

// Feedback Visual y Notificaciones en Esquina Superior
function showToast(message, duration = 3000, type = 'info') {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification';
    document.body.appendChild(toast);
    toast.addEventListener('click', () => {
      toast.classList.remove('show');
    });
  }
  toast.className = `toast-notification ${type}`;
  toast.innerHTML = `<span class="toast-msg">${message}</span><span class="toast-close" title="Cerrar">&times;</span>`;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
window.showToast = showToast;

// Diálogo de Confirmación Reutilizable con Alto Contraste (reemplazo de confirm)
function showConfirmDialog(heading, message, confirmBtnText = 'Eliminar', onConfirm) {
  if (!dialogConfirmModal) {
    if (confirm(message)) onConfirm();
    return;
  }

  confirmModalHeading.textContent = heading || '⚠️ Confirmación';
  confirmModalMessage.textContent = message;
  btnConfirmAction.textContent = confirmBtnText;

  const cleanup = () => {
    btnConfirmAction.onclick = null;
    btnCancelConfirm.onclick = null;
    btnCloseConfirmModal.onclick = null;
    dialogConfirmModal.close();
  };

  btnConfirmAction.onclick = () => {
    cleanup();
    if (onConfirm) onConfirm();
  };
  btnCancelConfirm.onclick = cleanup;
  btnCloseConfirmModal.onclick = cleanup;

  dialogConfirmModal.showModal();
}
window.showConfirmDialog = showConfirmDialog;

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
  if (activeUser && SupabaseService.isConfigured()) {
    syncBadge.className = 'sync-badge synced';
    syncText.textContent = 'EN LINEA';
  } else {
    syncBadge.className = 'sync-badge local';
    syncText.textContent = 'LOCAL';
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

// Conmutador de visualización de ejemplos rápidos (especialmente en móvil)
if (btnToggleExamples && exampleChipsContainer) {
  btnToggleExamples.addEventListener('click', () => {
    const isShown = exampleChipsContainer.classList.toggle('show-mobile');
    btnToggleExamples.setAttribute('aria-expanded', isShown ? 'true' : 'false');
    btnToggleExamples.textContent = isShown ? '✕ Ocultar' : '💡 Ver ejemplos';
  });
}

// Expansión fluida del área de texto al enfocar en dispositivos móviles
if (inputText && inputCardSection) {
  inputText.addEventListener('focus', () => {
    inputCardSection.classList.add('expanded');
  });
  inputText.addEventListener('blur', () => {
    if (!inputText.value.trim()) {
      inputCardSection.classList.remove('expanded');
    }
  });
}

// Chips de ejemplo rápido
document.querySelectorAll('.chip-btn').forEach(chip => {
  chip.addEventListener('click', () => {
    inputText.value = chip.dataset.text;
    inputCardSection?.classList.add('expanded');
    inputText.focus();
    if (exampleChipsContainer && window.innerWidth <= 640) {
      exampleChipsContainer.classList.remove('show-mobile');
      if (btnToggleExamples) {
        btnToggleExamples.setAttribute('aria-expanded', 'false');
        btnToggleExamples.textContent = '💡 Ver ejemplos';
      }
    }
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
    inputCardSection?.classList.remove('expanded');
    showToast('✨ ¡Organizado con éxito! Revisa tu calendario y tareas.', 3000, 'success');

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
    showToast(`⚠️ ${err.message || 'Error al comunicarse con la IA'}`, 4000, 'error');
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
    li.className = `task-card ${task.completed ? 'completed' : ''} priority-${task.priority || 'media'}`;
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
      showConfirmDialog('🗑️ Eliminar Tarea', `¿Deseas eliminar la tarea "${task.title}"?`, 'Eliminar', () => {
        storage.deleteTask(task.id);
        showToast('🗑️ Tarea eliminada', 3000);
      });
    });

    taskListElement.appendChild(li);
  });
}

selectCategoryFilter.addEventListener('change', () => {
  renderTasks();
  if (currentTasksViewMode === 'kanban') renderKanban();
});
selectStatusFilter.addEventListener('change', renderTasks);

// -------------------------------------------------------------
// Tablero Kanban y Drag & Drop Interactivo (Fase 2)
// -------------------------------------------------------------
function setTaskViewMode(mode) {
  currentTasksViewMode = mode;
  localStorage.setItem('organiza_tasks_view_mode', mode);

  if (mode === 'kanban') {
    btnViewList?.classList.remove('active');
    btnViewKanban?.classList.add('active');
    taskListElement?.classList.add('hidden');
    kanbanBoardElement?.classList.remove('hidden');
    filterStatusGroup?.classList.add('hidden');
    renderKanban();
  } else {
    btnViewKanban?.classList.remove('active');
    btnViewList?.classList.add('active');
    kanbanBoardElement?.classList.add('hidden');
    taskListElement?.classList.remove('hidden');
    filterStatusGroup?.classList.remove('hidden');
    renderTasks();
  }
}

if (btnViewList) btnViewList.addEventListener('click', () => setTaskViewMode('list'));
if (btnViewKanban) btnViewKanban.addEventListener('click', () => setTaskViewMode('kanban'));

function moveTaskToStatus(taskId, targetStatus) {
  const allTasks = storage.getTasks();
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  if (targetStatus === 'completed') {
    task.completed = true;
    task.status = 'completed';
    showToast('✅ ¡Tarea completada!');
  } else if (targetStatus === 'in_progress') {
    task.completed = false;
    task.status = 'in_progress';
    showToast('⚡ Tarea en curso');
  } else {
    task.completed = false;
    task.status = 'pending';
    showToast('⏳ Tarea en Por Hacer');
  }

  storage.saveTask(task);
}

function renderKanbanCard(task, currentStatus) {
  const card = document.createElement('div');
  card.className = `kanban-card status-${currentStatus}`;
  card.draggable = true;
  card.dataset.id = task.id;
  card.dataset.status = currentStatus;

  // Botones de movimiento rápido según la columna actual
  let shiftActions = '';
  if (currentStatus === 'pending') {
    shiftActions = `
      <button class="btn-kanban-shift btn-shift-in-progress" data-id="${task.id}" title="Pasar a En Curso">⚡ Iniciar</button>
      <button class="btn-kanban-shift btn-shift-completed" data-id="${task.id}" title="Marcar completada">✅ Completar</button>
    `;
  } else if (currentStatus === 'in_progress') {
    shiftActions = `
      <button class="btn-kanban-shift btn-shift-pending" data-id="${task.id}" title="Volver a Por Hacer">⏳ Espera</button>
      <button class="btn-kanban-shift btn-shift-completed" data-id="${task.id}" title="Marcar completada">✅ Completar</button>
    `;
  } else if (currentStatus === 'completed') {
    shiftActions = `
      <button class="btn-kanban-shift btn-shift-pending" data-id="${task.id}" title="Reabrir tarea">↩️ Reabrir</button>
    `;
  }

  card.innerHTML = `
    <div class="kanban-card-title">${task.title}</div>
    <div class="kanban-card-meta">
      <span class="category-tag">${task.category || 'General'}</span>
      <span class="task-priority priority-${task.priority || 'media'}">${task.priority || 'media'}</span>
      ${task.due_date ? `<span class="task-due">📅 ${task.due_date}</span>` : ''}
    </div>
    <div class="kanban-card-actions">
      <div class="kanban-move-btns">
        ${shiftActions}
      </div>
      <div class="task-actions">
        <button class="btn-icon-action btn-edit-kanban-task" data-id="${task.id}" title="Editar tarea">✏️</button>
        <button class="btn-icon-danger btn-delete-kanban-task" data-id="${task.id}" title="Eliminar tarea">🗑️</button>
      </div>
    </div>
  `;

  // Drag and drop nativo
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  // Eventos de botones táctiles
  card.querySelector('.btn-shift-in-progress')?.addEventListener('click', () => moveTaskToStatus(task.id, 'in_progress'));
  card.querySelector('.btn-shift-completed')?.addEventListener('click', () => moveTaskToStatus(task.id, 'completed'));
  card.querySelector('.btn-shift-pending')?.addEventListener('click', () => moveTaskToStatus(task.id, 'pending'));

  card.querySelector('.btn-edit-kanban-task')?.addEventListener('click', () => {
    taskModalHeading.textContent = '✏️ Editar Tarea';
    taskModalId.value = task.id;
    taskModalTitle.value = task.title;
    taskModalCategory.value = task.category || 'General';
    taskModalPriority.value = task.priority || 'media';
    taskModalDueDate.value = task.due_date || '';
    dialogTaskModal.showModal();
  });

  card.querySelector('.btn-delete-kanban-task')?.addEventListener('click', () => {
    showConfirmDialog('🗑️ Eliminar Tarea', `¿Deseas eliminar la tarea "${task.title}"?`, 'Eliminar', () => {
      storage.deleteTask(task.id);
      showToast('🗑️ Tarea eliminada', 3000);
    });
  });

  return card;
}

function initKanbanDropZone(zoneElement, status) {
  if (!zoneElement) return;

  zoneElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    zoneElement.classList.add('drag-over');
  });

  zoneElement.addEventListener('dragleave', () => {
    zoneElement.classList.remove('drag-over');
  });

  zoneElement.addEventListener('drop', (e) => {
    e.preventDefault();
    zoneElement.classList.remove('drag-over');
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      moveTaskToStatus(taskId, status);
    }
  });
}

function renderKanban() {
  if (!kanbanBoardElement) return;

  const allTasks = storage.getTasks();
  badgeTaskCount.textContent = allTasks.filter(t => !t.completed).length;

  const categoryFilter = selectCategoryFilter ? selectCategoryFilter.value : 'all';
  let filtered = allTasks;
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(t => t.category === categoryFilter);
  }

  const pendingList = filtered.filter(t => !t.completed && (t.status === 'pending' || !t.status));
  const inProgressList = filtered.filter(t => !t.completed && t.status === 'in_progress');
  const completedList = filtered.filter(t => t.completed || t.status === 'completed');

  if (badgeKanbanPending) badgeKanbanPending.textContent = pendingList.length;
  if (badgeKanbanInProgress) badgeKanbanInProgress.textContent = inProgressList.length;
  if (badgeKanbanCompleted) badgeKanbanCompleted.textContent = completedList.length;

  // Limpiar zonas de tarjetas
  if (kanbanPendingZone) kanbanPendingZone.innerHTML = '';
  if (kanbanInProgressZone) kanbanInProgressZone.innerHTML = '';
  if (kanbanCompletedZone) kanbanCompletedZone.innerHTML = '';

  pendingList.forEach(task => kanbanPendingZone?.appendChild(renderKanbanCard(task, 'pending')));
  inProgressList.forEach(task => kanbanInProgressZone?.appendChild(renderKanbanCard(task, 'in_progress')));
  completedList.forEach(task => kanbanCompletedZone?.appendChild(renderKanbanCard(task, 'completed')));

  // Indicadores vacíos si no hay tareas
  if (pendingList.length === 0 && kanbanPendingZone) {
    kanbanPendingZone.innerHTML = '<div style="text-align:center; padding:16px; font-size:0.75rem; color:var(--text-muted); font-style:italic;">Sin tareas pendientes</div>';
  }
  if (inProgressList.length === 0 && kanbanInProgressZone) {
    kanbanInProgressZone.innerHTML = '<div style="text-align:center; padding:16px; font-size:0.75rem; color:var(--text-muted); font-style:italic;">Arrastra aquí o pulsa Iniciar</div>';
  }
  if (completedList.length === 0 && kanbanCompletedZone) {
    kanbanCompletedZone.innerHTML = '<div style="text-align:center; padding:16px; font-size:0.75rem; color:var(--text-muted); font-style:italic;">Sin tareas completadas</div>';
  }
}

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
      showConfirmDialog('🗑️ Eliminar Nota', '¿Deseas eliminar esta idea o nota?', 'Eliminar', () => {
        storage.deleteNote(note.id);
        showToast('🗑️ Nota eliminada', 3000);
      });
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
      showToast('✏️ Nota actualizada', 3000, 'success');
    } else {
      storage.saveNote({
        id: `note_manual_${Date.now()}`,
        content,
        created_at: new Date().toISOString()
      });
      showToast('💡 Idea guardada con éxito', 3000, 'success');
    }
    dialogNoteModal.close();
  });
}

btnClearNotes.addEventListener('click', () => {
  showConfirmDialog('🗑️ Vaciar Notas', '¿Deseas vaciar todas las notas e ideas?', 'Vaciar Todo', () => {
    storage.clearAllNotes();
    showToast('🗑️ Todas las notas han sido eliminadas', 3000);
  });
});

// -------------------------------------------------------------
// Modal Eventos del Calendario
// -------------------------------------------------------------
function openEventModal(eventId = null, defaultDate = null) {
  if (!dialogEventModal) return;

  if (eventId) {
    const allEvents = storage.getEvents();
    const ev = allEvents.find(e => e.id === eventId);
    if (ev) {
      eventModalHeading.textContent = '✏️ Editar Evento';
      eventModalId.value = ev.id;
      eventModalTitle.value = ev.title || '';
      eventModalDate.value = ev.date || (calendarComponent ? calendarComponent.formatDateISO(calendarComponent.selectedDate) : '');
      eventModalStartTime.value = ev.start_time || '';
      eventModalEndTime.value = ev.end_time || '';
      eventModalLocation.value = ev.location || '';
      eventModalDescription.value = ev.description || '';
      dialogEventModal.showModal();
      return;
    }
  }

  // Nuevo evento manual
  eventModalHeading.textContent = '📅 Nuevo Evento';
  eventModalId.value = '';
  eventModalTitle.value = '';
  eventModalDate.value = defaultDate || (calendarComponent ? calendarComponent.formatDateISO(calendarComponent.selectedDate) : new Date().toISOString().split('T')[0]);
  eventModalStartTime.value = '';
  eventModalEndTime.value = '';
  eventModalLocation.value = '';
  eventModalDescription.value = '';
  dialogEventModal.showModal();
}
window.openEventModal = openEventModal;

const closeEventModal = () => dialogEventModal?.close();
if (btnCloseEventModal) btnCloseEventModal.addEventListener('click', closeEventModal);
if (btnDismissEventModal) btnDismissEventModal.addEventListener('click', closeEventModal);

if (formEventModal) {
  formEventModal.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = eventModalTitle.value.trim();
    const date = eventModalDate.value;
    if (!title || !date) return;

    const id = eventModalId.value;
    const eventData = {
      id: id || `event_manual_${Date.now()}`,
      title,
      date,
      start_time: eventModalStartTime.value || null,
      end_time: eventModalEndTime.value || null,
      location: eventModalLocation.value.trim() || '',
      description: eventModalDescription.value.trim() || '',
      created_at: new Date().toISOString()
    };

    storage.saveEvent(eventData);
    closeEventModal();
    showToast(id ? '✏️ Evento actualizado con éxito' : '📅 Evento guardado con éxito', 3000, 'success');
    if (calendarComponent) {
      calendarComponent.render();
    }
  });
}

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
  showConfirmDialog('🗑️ Limpiar Historial', '¿Deseas limpiar todo el historial de entradas procesadas?', 'Limpiar', () => {
    localStorage.removeItem('organiza_local_history');
    renderHistory();
    showToast('📂 Historial limpiado correctamente', 3000);
  });
});

// -------------------------------------------------------------
// Controlador de Tema Visual (design-tokens.json: Soft Blue / Oscuro Celeste)
// -------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('organiza_theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#08101c' : '#f0f9ff');
  }
}

// Inicializar listener de cambio de tema con vista previa en vivo
if (selectAppTheme) {
  selectAppTheme.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
}

// -------------------------------------------------------------
// Modal de Ajustes (Native <dialog>)
// -------------------------------------------------------------
function loadSettingsIntoDialog() {
  const customKey = localStorage.getItem('custom_openrouter_key') || '';
  inputCustomOpenRouterKey.value = customKey;

  const currentTheme = localStorage.getItem('organiza_theme') || 'light';
  if (selectAppTheme) {
    selectAppTheme.value = currentTheme;
  }

  if (customKey) {
    keyStatusText.textContent = 'Usando tu API Key personalizada';
    keyStatusBanner.className = 'sync-badge synced';
  } else {
    keyStatusText.textContent = 'Usando OpenRouter por defecto';
    keyStatusBanner.className = 'sync-badge local';
  }
}

// Alternar Pestañas del Modal Unificado de Ajustes y Cuenta
function switchSettingsTab(tabName) {
  if (tabName === 'account') {
    tabSettingsAccount?.classList.add('active');
    tabSettingsGeneral?.classList.remove('active');
    tabSettingsAccount?.setAttribute('aria-selected', 'true');
    tabSettingsGeneral?.setAttribute('aria-selected', 'false');
    settingsAccountPane?.classList.remove('hidden');
    settingsGeneralPane?.classList.add('hidden');
  } else {
    tabSettingsGeneral?.classList.add('active');
    tabSettingsAccount?.classList.remove('active');
    tabSettingsGeneral?.setAttribute('aria-selected', 'true');
    tabSettingsAccount?.setAttribute('aria-selected', 'false');
    settingsGeneralPane?.classList.remove('hidden');
    settingsAccountPane?.classList.add('hidden');
  }
}

if (tabSettingsGeneral) tabSettingsGeneral.addEventListener('click', () => switchSettingsTab('general'));
if (tabSettingsAccount) tabSettingsAccount.addEventListener('click', () => switchSettingsTab('account'));

btnSettings.addEventListener('click', () => {
  loadSettingsIntoDialog();
  clearAuthAlert();
  dialogSettings.showModal();
});

const closeSettingsDialog = () => {
  dialogSettings.close();
};

const closeAuthModal = closeSettingsDialog;

if (btnCloseModal) btnCloseModal.addEventListener('click', closeSettingsDialog);
if (btnDismissModal) btnDismissModal.addEventListener('click', closeSettingsDialog);
if (btnDismissAuthProfile) btnDismissAuthProfile.addEventListener('click', closeSettingsDialog);

btnSaveSettings.addEventListener('click', () => {
  const customKey = inputCustomOpenRouterKey.value.trim();
  if (customKey) {
    localStorage.setItem('custom_openrouter_key', customKey);
  } else {
    localStorage.removeItem('custom_openrouter_key');
  }

  if (selectAppTheme) {
    applyTheme(selectAppTheme.value);
  }

  showToast('⚙️ Ajustes guardados correctamente');
  closeSettingsDialog();
});

// -------------------------------------------------------------
// Controlador de Autenticación de Usuarios (Supabase Auth)
// -------------------------------------------------------------
function setAuthAlert(msg, type = 'error') {
  authAlertBox.textContent = msg;
  authAlertBox.className = `auth-alert ${type}`;
  authAlertBox.classList.remove('hidden');
}

function clearAuthAlert() {
  authAlertBox.textContent = '';
  authAlertBox.className = 'auth-alert hidden';
}

function updateAuthUI(user) {
  activeUser = user;
  updateSyncBadge();

  if (user && user.email) {
    const shortName = user.email.split('@')[0];
    if (settingsBtnLabel) settingsBtnLabel.textContent = shortName;
    if (btnSettings) btnSettings.title = `Ajustes y Cuenta (${user.email})`;
    if (userEmailDisplay) userEmailDisplay.textContent = user.email;
    if (accountTabBadge) {
      accountTabBadge.textContent = '● Conectado';
      accountTabBadge.className = 'account-tab-badge connected';
    }
    authProfileSection?.classList.remove('hidden');
    authFormSection?.classList.add('hidden');
  } else {
    if (settingsBtnLabel) settingsBtnLabel.textContent = 'Ajustes';
    if (btnSettings) btnSettings.title = 'Ajustes y Cuenta';
    if (userEmailDisplay) userEmailDisplay.textContent = '';
    if (accountTabBadge) {
      accountTabBadge.textContent = '● Local';
      accountTabBadge.className = 'account-tab-badge';
    }
    authProfileSection?.classList.add('hidden');
    authFormSection?.classList.remove('hidden');
  }
}

// Abrir modal unificado en pestaña de Cuenta (retrocompatibilidad)
if (btnAuthHeader) {
  btnAuthHeader.addEventListener('click', () => {
    switchSettingsTab('account');
    clearAuthAlert();
    dialogSettings.showModal();
  });
}

// Alternar pestañas Login / Signup
if (tabAuthLogin && tabAuthSignup) {
  tabAuthLogin.addEventListener('click', () => {
    authMode = 'login';
    tabAuthLogin.classList.add('active');
    tabAuthSignup.classList.remove('active');
    btnSubmitAuth.textContent = 'Ingresar';
    clearAuthAlert();
  });

  tabAuthSignup.addEventListener('click', () => {
    authMode = 'signup';
    tabAuthSignup.classList.add('active');
    tabAuthLogin.classList.remove('active');
    btnSubmitAuth.textContent = 'Crear Cuenta';
    clearAuthAlert();
  });
}

// Enviar formulario (Login / Registro)
if (formAuth) {
  formAuth.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAuthAlert();

    const email = inputAuthEmail.value.trim();
    const password = inputAuthPassword.value;

    if (!email || !password) {
      setAuthAlert('Por favor completa todos los campos.');
      return;
    }

    btnSubmitAuth.disabled = true;
    btnSubmitAuth.textContent = 'Procesando...';

    try {
      if (authMode === 'login') {
        await SupabaseService.signIn(email, password);
        showToast('👋 ¡Sesión iniciada con éxito!');
        closeAuthModal();
      } else {
        const data = await SupabaseService.signUp(email, password);
        if (data?.user && !data?.session) {
          setAuthAlert('📧 Te enviamos un enlace de confirmación a tu correo. Por favor revísalo.', 'success');
        } else {
          showToast('🎉 ¡Cuenta creada y sesión iniciada!');
          closeAuthModal();
        }
      }
    } catch (err) {
      console.warn('Error en auth:', err);
      setAuthAlert(err.message || 'Error en la autenticación.');
    } finally {
      btnSubmitAuth.disabled = false;
      btnSubmitAuth.textContent = authMode === 'login' ? 'Ingresar' : 'Crear Cuenta';
    }
  });
}

// Magic Link
if (btnMagicLink) {
  btnMagicLink.addEventListener('click', async () => {
    clearAuthAlert();
    const email = inputAuthEmail.value.trim();
    if (!email) {
      setAuthAlert('Ingresa tu correo para enviarte el enlace mágico.');
      inputAuthEmail.focus();
      return;
    }

    btnMagicLink.disabled = true;
    btnMagicLink.textContent = 'Enviando enlace...';

    try {
      await SupabaseService.signInWithOtp(email);
      setAuthAlert('📬 Enlace mágico enviado. Revisa tu bandeja de entrada para acceder directamente.', 'success');
    } catch (err) {
      setAuthAlert(err.message || 'No se pudo enviar el enlace mágico.');
    } finally {
      btnMagicLink.disabled = false;
      btnMagicLink.textContent = '✉️ Enviar enlace mágico al correo';
    }
  });
}

// Cerrar Sesión
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await SupabaseService.signOut();
      showToast('Sesión cerrada. Modo local activo.', 3000);
      closeAuthModal();
    } catch (err) {
      showToast('⚠️ Error cerrando sesión: ' + err.message, 3000, 'error');
    }
  });
}

// Suscripción al estado de Auth
if (SupabaseService.isConfigured()) {
  SupabaseService.onAuthStateChange(async (event, session) => {
    console.log('[Supabase Auth Event]', event);
    const user = session?.user || null;
    updateAuthUI(user);

    if (user) {
      // Sincronizar inmediatamente datos de la cuenta
      await storage.syncWithCloud();
    }
  });

  // Consultar sesión existente al arrancar
  SupabaseService.getCurrentUser().then(user => {
    updateAuthUI(user);
    if (user) {
      storage.syncWithCloud();
    }
  });
}

// -------------------------------------------------------------
// Registro en el Store y Actualizaciones Globales
// -------------------------------------------------------------
storage.subscribe(() => {
  renderTasks();
  if (currentTasksViewMode === 'kanban') {
    renderKanban();
  }
  renderNotes();
  renderHistory();
  updateSyncBadge();
});

// Limpieza automática única de ideas, eventos y tareas de prueba anteriores
const CLEANUP_KEY = 'organiza_cleanup_all_test_data_v2';
if (!localStorage.getItem(CLEANUP_KEY)) {
  storage.clearAllTasks();
  storage.clearAllEvents();
  storage.clearAllNotes();
  localStorage.removeItem('organiza_local_history');
  localStorage.setItem(CLEANUP_KEY, 'true');
  console.log('[Cleanup v2] Todas las tareas, eventos e ideas de prueba antiguos eliminados.');
}

if (btnClearAllTasks) {
  btnClearAllTasks.addEventListener('click', () => {
    showConfirmDialog('🗑️ Vaciar Tareas', '¿Deseas eliminar todas las tareas de la lista y el tablero?', 'Vaciar Todo', () => {
      storage.clearAllTasks();
      showToast('🗑️ Todas las tareas han sido eliminadas', 3000);
    });
  });
}

// Inicialización de Zonas Drag & Drop de Kanban
if (kanbanPendingZone) initKanbanDropZone(kanbanPendingZone, 'pending');
if (kanbanInProgressZone) initKanbanDropZone(kanbanInProgressZone, 'in_progress');
if (kanbanCompletedZone) initKanbanDropZone(kanbanCompletedZone, 'completed');

// Carga Inicial de Tema y Vistas
const initialTheme = localStorage.getItem('organiza_theme') || 'light';
applyTheme(initialTheme);
if (selectAppTheme) {
  selectAppTheme.value = initialTheme;
}

updateSyncBadge();
renderTasks();
setTaskViewMode(currentTasksViewMode);
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
