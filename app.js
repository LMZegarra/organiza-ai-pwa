/**
 * app.js
 * Controlador principal de OrganizaAI PWA.
 * Integra AIService, StorageService, SupabaseService y CalendarComponent.
 */

import { storage, EVENT_PALETTE, EVENT_COLORS, getNextAvailableEventColor } from './js/storage-service.js';
import { SupabaseService } from './js/supabase-client.js';
import { AIService, getLocalDateISO } from './js/ai-service.js';
import { CalendarComponent } from './js/calendar-component.js';
import { APP_CONFIG } from './js/config.js';
import { ICONS } from './js/icons.js';

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
const btnThemeToggle = document.getElementById('btnThemeToggle');
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
const eventColorPalette = document.getElementById('eventColorPalette');
const eventModalColor = document.getElementById('eventModalColor');

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
    openModalAccessible(dialogSettings);
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

// Helper para prevenir inyecciones XSS y roturas de atributos HTML
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

// Apertura de modal accesible con captura y retorno automático de foco
function openModalAccessible(dialog, initialFocusSelector = 'input:not([type="hidden"]), select, textarea, button.btn-primary') {
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const previousActiveElement = document.activeElement;
  dialog.showModal();
  const firstInteractive = dialog.querySelector(initialFocusSelector);
  if (firstInteractive) {
    setTimeout(() => firstInteractive.focus(), 60);
  }
  const onDialogClose = () => {
    dialog.removeEventListener('close', onDialogClose);
    if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
      previousActiveElement.focus();
    }
  };
  dialog.addEventListener('close', onDialogClose);
}
window.openModalAccessible = openModalAccessible;

// Diálogo de Confirmación Reutilizable con Alto Contraste (reemplazo de confirm)
function showConfirmDialog(heading, message, confirmBtnText = 'Eliminar', onConfirm) {
  if (!dialogConfirmModal) {
    if (confirm(message)) onConfirm();
    return;
  }

  confirmModalHeading.innerHTML = `${ICONS.alert} ${escapeHtml(heading || 'Confirmación')}`;
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

  openModalAccessible(dialogConfirmModal, '#btnConfirmAction');
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
  const isOnline = activeUser && SupabaseService.isConfigured();
  if (syncBadge && syncText) {
    if (isOnline) {
      syncBadge.className = 'sync-badge synced';
      syncText.textContent = 'EN LÍNEA';
      syncBadge.style.display = 'inline-flex';
    } else {
      syncBadge.className = 'sync-badge local';
      syncText.textContent = 'LOCAL';
      syncBadge.style.display = 'none'; // Quitar 'LOCAL' de la cabecera como solicitó el usuario
    }
  }
  if (accountTabBadge) {
    accountTabBadge.textContent = isOnline ? '● Nube Conectada' : '● Local';
    accountTabBadge.className = `account-tab-badge ${isOnline ? 'synced' : 'local'}`;
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
const DEFAULT_INPUT_PLACEHOLDER = '¿Qué deseas planificar u organizar hoy? (ej. Mañana a las 4pm dentista y comprar café el viernes)';

inputText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.isComposing || e.keyCode === 229 || (btnSubmitText && btnSubmitText.disabled)) return;
      organizeForm.requestSubmit();
    }
  }
});

// Conmutador de visualización de ejemplos rápidos (desktop y móvil)
if (btnToggleExamples && exampleChipsContainer) {
  btnToggleExamples.addEventListener('click', () => {
    const isHidden = exampleChipsContainer.classList.toggle('hidden-chips');
    btnToggleExamples.setAttribute('aria-expanded', !isHidden ? 'true' : 'false');
    btnToggleExamples.classList.toggle('active', !isHidden);
    btnToggleExamples.innerHTML = !isHidden
      ? `${ICONS.lightbulb} <span>Ocultar sugerencias</span>`
      : `${ICONS.lightbulb} <span>Sugerencias</span>`;
  });
}

// Expansión fluida del área de texto al enfocar en dispositivos móviles
if (inputText && inputCardSection) {
  inputText.addEventListener('focus', () => {
    inputCardSection.classList.add('expanded');
  });
  inputText.addEventListener('blur', () => {
    if (!inputText.value.trim() && !inputText.getAttribute('data-active-prompt')) {
      inputCardSection.classList.remove('expanded');
    }
  });
}

// Ajuste de altura dinámico y adaptable para textos largos sin desbordamiento ni saltos
function autoResizeInputText() {
  if (!inputText) return;
  inputText.style.height = 'auto';
  const newH = Math.min(Math.max(inputText.scrollHeight, 48), 220);
  inputText.style.height = `${newH}px`;
}

// Chips de ejemplo rápido: coloca el texto como marca de agua de fondo (placeholder)
// El usuario no tiene que borrar nada; si escribe, su texto aparece encima directamente.
document.querySelectorAll('.chip-btn').forEach(chip => {
  chip.addEventListener('click', () => {
    const wasActive = chip.classList.contains('active-chip');
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active-chip'));

    if (wasActive) {
      // Si ya estaba activo, se restaura el placeholder por defecto
      inputText.placeholder = DEFAULT_INPUT_PLACEHOLDER;
      inputText.removeAttribute('data-active-prompt');
      inputText.style.height = '';
    } else {
      // Se activa el chip y se coloca de fondo como placeholder
      chip.classList.add('active-chip');
      inputText.placeholder = chip.dataset.text;
      inputText.setAttribute('data-active-prompt', chip.dataset.text);
      inputText.value = ''; // Limpio para que la marca de agua sea visible de fondo
    }

    inputCardSection?.classList.add('expanded');
    inputText.focus();
  });
});

// Control de scroll y ocultación suave del hint visual de desplazamiento en chips
const chipsScrollHint = document.querySelector('.chips-scroll-hint');
if (exampleChipsContainer && chipsScrollHint) {
  exampleChipsContainer.addEventListener('scroll', () => {
    const isAtEnd = exampleChipsContainer.scrollLeft + exampleChipsContainer.clientWidth >= exampleChipsContainer.scrollWidth - 12;
    chipsScrollHint.style.opacity = isAtEnd ? '0' : '1';
  }, { passive: true });
}

// Si el usuario escribe manualmente, su texto toma prioridad sobre el chip y auto-expande el campo
inputText.addEventListener('input', () => {
  autoResizeInputText();
  if (inputText.value.trim().length > 0) {
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active-chip'));
  }
});

// Envío del Formulario
organizeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const rawText = inputText.value.trim();
  const activePrompt = inputText.getAttribute('data-active-prompt');
  const text = rawText || activePrompt;

  if (!text) {
    showToast('Por favor escribe algo o selecciona una sugerencia', 3000, 'warning');
    inputText.focus();
    return;
  }

  loadingIndicator.classList.remove('hidden');
  loadingText.textContent = 'Interpretando con IA y clasificando en tareas y calendario...';
  btnSubmitText.disabled = true;

  try {
    const aiResult = await AIService.processText(text);

    // Guardar en almacenamiento local y sincronizar con la nube
    storage.addBatchFromAI(aiResult, text);

    inputText.value = '';
    inputText.placeholder = DEFAULT_INPUT_PLACEHOLDER;
    inputText.removeAttribute('data-active-prompt');
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active-chip'));
    inputCardSection?.classList.remove('expanded');
    showToast('¡Organizado con éxito! Revisa tu calendario y tareas.', 3000, 'success');

    if (aiResult.calendar_events && aiResult.calendar_events.length > 0) {
      document.querySelector('.view-tab[data-target="viewCalendar"]')?.click();
    } else {
      document.querySelector('.view-tab[data-target="viewTasks"]')?.click();
    }

  } catch (err) {
    console.error('Error al procesar:', err);
    if (err.message.includes('API Key') || err.message.includes('Ajustes')) {
      openModalAccessible(dialogSettings);
    }
    showToast(err.message || 'Error al comunicarse con la IA', 4000, 'error');
  } finally {
    loadingIndicator.classList.add('hidden');
    btnSubmitText.disabled = false;
  }
});

// -------------------------------------------------------------
// Renderizado de Tareas y Filtros Rápidos
// -------------------------------------------------------------
let currentFastFilter = 'all';

function setupTaskFastFilters() {
  document.querySelectorAll('.task-fast-pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.task-fast-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFastFilter = btn.dataset.fastFilter || 'all';
      renderTasks();
      if (currentTasksViewMode === 'kanban') renderKanban();
    };
  });
}

function renderTasks() {
  const allTasks = storage.getTasks() || [];
  const todayISO = getLocalDateISO();

  // Actualizar contadores en la barra superior de tareas y en el badge del dock
  const pendingTasks = allTasks.filter(t => !t.completed);
  if (badgeTaskCount) badgeTaskCount.textContent = pendingTasks.length;

  const badgeTasksRefined = document.getElementById('badgeTasksCountRefined');
  if (badgeTasksRefined) {
    badgeTasksRefined.textContent = `${pendingTasks.length} ${pendingTasks.length === 1 ? 'pendiente' : 'pendientes'}`;
  }

  const categoryFilter = selectCategoryFilter ? selectCategoryFilter.value : 'all';

  let filtered = allTasks;

  // 1. Filtrar por categoría
  if (categoryFilter !== 'all') {
    filtered = filtered.filter(t => (t.category || 'General').toLowerCase() === categoryFilter.toLowerCase());
  }

  // 2. Filtrar por filtro rápido (Todas, Hoy, Próximas, Completadas)
  if (currentFastFilter === 'today') {
    filtered = filtered.filter(t => {
      const d = t.dueDate || t.due_date;
      return d === todayISO;
    });
  } else if (currentFastFilter === 'upcoming') {
    filtered = filtered.filter(t => {
      const d = t.dueDate || t.due_date;
      return d && d > todayISO && !t.completed;
    });
  } else if (currentFastFilter === 'completed') {
    filtered = filtered.filter(t => t.completed);
  }

  if (filtered.length === 0) {
    const isFiltered = categoryFilter !== 'all' || currentFastFilter !== 'all';
    taskListElement.innerHTML = `
      <div class="empty-state-card contextual-empty-card">
        <div class="empty-state-icon" aria-hidden="true">${isFiltered ? '🔍' : '✨'}</div>
        <h4 class="empty-state-title">${isFiltered ? 'No encontramos tareas con estos filtros' : '¡Todo al día! No tienes tareas pendientes'}</h4>
        <p class="empty-state-desc">${isFiltered ? 'Prueba cambiando la categoría o restableciendo el filtro rápido para ver más tareas.' : 'Escribe lo que necesites hacer o crea una tarea manual para comenzar a organizarte.'}</p>
        <div class="empty-state-actions" style="display:flex; gap:8px; justify-content:center; margin-top:12px;">
          ${isFiltered ? `
            <button type="button" class="btn btn-outline btn-sm" id="btnClearTasksFilter">
              Limpiar filtros
            </button>
          ` : `
            <button type="button" class="btn btn-primary btn-sm" id="btnEmptyAddTask">
              + Crear una tarea
            </button>
            <button type="button" class="btn btn-outline btn-sm" id="btnEmptyOrganizeAI">
              Organizar con IA
            </button>
          `}
        </div>
      </div>
    `;

    taskListElement.querySelector('#btnClearTasksFilter')?.addEventListener('click', () => {
      currentFastFilter = 'all';
      document.querySelectorAll('.task-fast-pill').forEach(b => b.classList.toggle('active', b.dataset.fastFilter === 'all'));
      if (selectCategoryFilter) selectCategoryFilter.value = 'all';
      renderTasks();
      if (currentTasksViewMode === 'kanban') renderKanban();
    });

    taskListElement.querySelector('#btnEmptyAddTask')?.addEventListener('click', () => {
      openNewTaskModal();
    });

    taskListElement.querySelector('#btnEmptyOrganizeAI')?.addEventListener('click', () => {
      document.querySelector('.view-tab[data-target="viewAssistant"]')?.click();
    });

    return;
  }

  taskListElement.innerHTML = '';
  filtered.forEach(task => {
    const li = document.createElement('li');
    const isOverdue = task.due_date && task.due_date < todayISO && !task.completed;
    li.className = `task-card ${task.completed ? 'completed' : ''} priority-${task.priority || 'media'}`;
    li.innerHTML = `
      <input type="checkbox" class="task-chk" ${task.completed ? 'checked' : ''} data-id="${task.id}" aria-label="Marcar como completada">
      <div class="task-body">
        <span class="task-text">${escapeHtml(task.title)}</span>
        <div class="task-meta">
          <span class="category-tag">${escapeHtml(task.category || 'General')}</span>
          <span class="task-priority priority-${task.priority || 'media'}">${escapeHtml(task.priority || 'media')}</span>
          ${task.due_date ? `<span class="task-due">${ICONS.calendar} ${escapeHtml(task.due_date)}</span>` : ''}
          ${isOverdue ? '<span class="task-overdue-badge">¡Vencida!</span>' : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-icon-action btn-edit-task" data-id="${task.id}" title="Editar tarea" aria-label="Editar tarea">${ICONS.edit}</button>
        <button class="btn-icon-danger btn-delete-task" data-id="${task.id}" title="Eliminar tarea" aria-label="Eliminar tarea">${ICONS.trash}</button>
      </div>
    `;

    li.querySelector('.task-chk').addEventListener('change', () => {
      const willBeCompleted = !task.completed;
      storage.toggleTask(task.id);
      showToast(willBeCompleted ? '¡Tarea completada!' : 'Tarea marcada como pendiente', 2000, 'success');
    });

    li.querySelector('.btn-edit-task').addEventListener('click', () => {
      taskModalHeading.innerHTML = `${ICONS.edit} Editar Tarea`;
      taskModalId.value = task.id;
      taskModalTitle.value = task.title;
      taskModalCategory.value = task.category || 'General';
      taskModalPriority.value = task.priority || 'media';
      taskModalDueDate.value = task.due_date || task.dueDate || '';
      openModalAccessible(dialogTaskModal);
    });

    li.querySelector('.btn-delete-task').addEventListener('click', () => {
      showConfirmDialog('Eliminar Tarea', `¿Deseas eliminar la tarea "${task.title}"?`, 'Eliminar', () => {
        storage.deleteTask(task.id);
        showToast('Tarea eliminada', 3000);
      });
    });

    taskListElement.appendChild(li);
  });
}

if (selectCategoryFilter) {
  selectCategoryFilter.addEventListener('change', () => {
    renderTasks();
    if (currentTasksViewMode === 'kanban') renderKanban();
  });
}
if (selectStatusFilter) {
  selectStatusFilter.addEventListener('change', renderTasks);
}
setupTaskFastFilters();

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
    showToast('¡Tarea completada!', 3000, 'success');
  } else if (targetStatus === 'in_progress') {
    task.completed = false;
    task.status = 'in_progress';
    showToast('Tarea en curso', 3000, 'info');
  } else {
    task.completed = false;
    task.status = 'pending';
    showToast('Tarea en Por Hacer', 3000, 'info');
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
      <button class="btn-kanban-shift btn-shift-in-progress" data-id="${task.id}" title="Pasar a En Curso">${ICONS.zap} Iniciar</button>
      <button class="btn-kanban-shift btn-shift-completed" data-id="${task.id}" title="Marcar completada">${ICONS.check} Completar</button>
    `;
  } else if (currentStatus === 'in_progress') {
    shiftActions = `
      <button class="btn-kanban-shift btn-shift-pending" data-id="${task.id}" title="Volver a Por Hacer">${ICONS.hourglass} Espera</button>
      <button class="btn-kanban-shift btn-shift-completed" data-id="${task.id}" title="Marcar completada">${ICONS.check} Completar</button>
    `;
  } else if (currentStatus === 'completed') {
    shiftActions = `
      <button class="btn-kanban-shift btn-shift-pending" data-id="${task.id}" title="Reabrir tarea">${ICONS.rotateCcw} Reabrir</button>
    `;
  }

  card.innerHTML = `
    <div class="kanban-card-title">${escapeHtml(task.title)}</div>
    <div class="kanban-card-meta">
      <span class="category-tag">${escapeHtml(task.category || 'General')}</span>
      <span class="task-priority priority-${task.priority || 'media'}">${escapeHtml(task.priority || 'media')}</span>
      ${task.due_date ? `<span class="task-due">${ICONS.calendar} ${escapeHtml(task.due_date)}</span>` : ''}
    </div>
    <div class="kanban-card-actions">
      <div class="kanban-move-btns">
        ${shiftActions}
      </div>
      <div class="task-actions">
        <button class="btn-icon-action btn-edit-kanban-task" data-id="${task.id}" title="Editar tarea" aria-label="Editar tarea">${ICONS.edit}</button>
        <button class="btn-icon-danger btn-delete-kanban-task" data-id="${task.id}" title="Eliminar tarea" aria-label="Eliminar tarea">${ICONS.trash}</button>
      </div>
    </div>
  `;

  // Drag and drop nativo para escritorio
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('dragging');
  });

  card.addEventListener('dragend', () => {
    card.classList.remove('dragging');
  });

  // Soporte táctil (Touch Drag) para arrastrar tarjetas en pantallas táctiles / celulares
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchDragging = false;
  let activeDropZone = null;

  card.addEventListener('touchstart', (e) => {
    if (e.target.closest('button')) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouchDragging = false;
  }, { passive: true });

  card.addEventListener('touchmove', (e) => {
    if (e.target.closest('button') || !e.touches[0]) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartX);
    const diffY = Math.abs(touch.clientY - touchStartY);

    if (diffX > 18 || diffY > 18) {
      isTouchDragging = true;
      card.classList.add('dragging');

      const elem = document.elementFromPoint(touch.clientX, touch.clientY);
      const zone = elem?.closest('.kanban-cards-zone');

      document.querySelectorAll('.kanban-cards-zone.drag-over').forEach(z => z.classList.remove('drag-over'));
      if (zone) {
        zone.classList.add('drag-over');
        activeDropZone = zone;
      }
    }
  }, { passive: true });

  card.addEventListener('touchend', () => {
    if (isTouchDragging) {
      card.classList.remove('dragging');
      document.querySelectorAll('.kanban-cards-zone.drag-over').forEach(z => z.classList.remove('drag-over'));

      if (activeDropZone && activeDropZone.dataset.status) {
        const targetStatus = activeDropZone.dataset.status;
        if (targetStatus !== currentStatus) {
          moveTaskToStatus(task.id, targetStatus);
        }
      }
      isTouchDragging = false;
      activeDropZone = null;
    }
  });

  // Eventos de botones táctiles
  card.querySelector('.btn-shift-in-progress')?.addEventListener('click', () => moveTaskToStatus(task.id, 'in_progress'));
  card.querySelector('.btn-shift-completed')?.addEventListener('click', () => moveTaskToStatus(task.id, 'completed'));
  card.querySelector('.btn-shift-pending')?.addEventListener('click', () => moveTaskToStatus(task.id, 'pending'));

  card.querySelector('.btn-edit-kanban-task')?.addEventListener('click', () => {
    taskModalHeading.innerHTML = `${ICONS.edit} Editar Tarea`;
    taskModalId.value = task.id;
    taskModalTitle.value = task.title;
    taskModalCategory.value = task.category || 'General';
    taskModalPriority.value = task.priority || 'media';
    taskModalDueDate.value = task.due_date || '';
    openModalAccessible(dialogTaskModal);
  });

  card.querySelector('.btn-delete-kanban-task')?.addEventListener('click', () => {
    showConfirmDialog('Eliminar Tarea', `¿Deseas eliminar la tarea "${task.title}"?`, 'Eliminar', () => {
      storage.deleteTask(task.id);
      showToast('Tarea eliminada', 3000);
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
  taskModalHeading.innerHTML = `${ICONS.plus} Nueva Tarea`;
  taskModalId.value = '';
  taskModalTitle.value = '';
  taskModalCategory.value = 'General';
  taskModalPriority.value = 'media';
  taskModalDueDate.value = '';
  openModalAccessible(dialogTaskModal);
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
    showToast('Tarea actualizada', 3000, 'success');
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
    showToast('Tarea creada', 3000, 'success');
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
      <div class="empty-state-card" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">${ICONS.lightbulb}</div>
        <h4 class="empty-state-title">${isSearching ? 'No se encontraron notas' : 'Aún no tienes ideas o notas rápidas'}</h4>
        <p class="empty-state-desc">${isSearching ? `No hay resultados para "${escapeHtml(noteSearchQuery)}".` : 'Escribe tus reflexiones, ideas sueltas o apuntes en la barra superior y la IA las archivará aquí.'}</p>
        <button type="button" class="btn btn-outline btn-sm empty-state-btn" id="btnEmptyAddNote">
          ${ICONS.plus} Crear Nota Manual
        </button>
      </div>
    `;
    notesContainer.querySelector('#btnEmptyAddNote')?.addEventListener('click', () => {
      noteModalHeading.innerHTML = `${ICONS.plus} Nueva Nota o Idea`;
      noteModalId.value = '';
      noteModalContent.value = '';
      openModalAccessible(dialogNoteModal);
    });
    return;
  }

  notesContainer.innerHTML = '';
  notes.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    const content = typeof note === 'string' ? note : (note.content || note.text || '');
    const dateFormatted = note.created_at ? new Date(note.created_at).toLocaleDateString() : '';

    card.innerHTML = `
      <p class="note-content">${escapeHtml(content)}</p>
      <div class="note-footer">
        <span>${escapeHtml(dateFormatted)}</span>
        <div class="note-card-actions">
          <button class="btn-link btn-copy-note" style="margin-right:6px;">${ICONS.copy} Copiar</button>
          <button class="btn-icon-action btn-edit-note" title="Editar nota" aria-label="Editar nota">${ICONS.edit}</button>
          <button class="btn-icon-danger btn-delete-note" title="Eliminar nota" aria-label="Eliminar nota">${ICONS.trash}</button>
        </div>
      </div>
    `;

    card.querySelector('.btn-copy-note').addEventListener('click', () => {
      navigator.clipboard.writeText(content).then(() => showToast('Copiado al portapapeles', 3000, 'info'));
    });

    card.querySelector('.btn-edit-note').addEventListener('click', () => {
      noteModalHeading.innerHTML = `${ICONS.edit} Editar Nota`;
      noteModalId.value = note.id;
      noteModalContent.value = content;
      openModalAccessible(dialogNoteModal);
    });

    card.querySelector('.btn-delete-note').addEventListener('click', () => {
      showConfirmDialog('Eliminar Nota', '¿Deseas eliminar esta idea o nota?', 'Eliminar', () => {
        storage.deleteNote(note.id);
        showToast('Nota eliminada', 3000);
      });
    });

    notesContainer.appendChild(card);
  });
}

// Modal Nota: Abrir para nueva nota
if (btnQuickAddNote) {
  btnQuickAddNote.addEventListener('click', () => {
    noteModalHeading.innerHTML = `${ICONS.lightbulb} Nueva Idea o Nota`;
    noteModalId.value = '';
    noteModalContent.value = '';
    openModalAccessible(dialogNoteModal);
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
      showToast('Nota actualizada', 3000, 'success');
    } else {
      storage.saveNote({
        id: `note_manual_${Date.now()}`,
        content,
        created_at: new Date().toISOString()
      });
      showToast('Idea guardada con éxito', 3000, 'success');
    }
    dialogNoteModal.close();
  });
}

btnClearNotes.addEventListener('click', () => {
  showConfirmDialog('Vaciar Notas', '¿Deseas vaciar todas las notas e ideas?', 'Vaciar Todo', () => {
    storage.clearAllNotes();
    showToast('Todas las notas han sido eliminadas', 3000, 'info');
  });
});

// -------------------------------------------------------------
// Modal Eventos del Calendario & Paleta de 10 Colores
// -------------------------------------------------------------
function renderColorPalette() {
  if (!eventColorPalette) return;
  eventColorPalette.innerHTML = EVENT_PALETTE.map(item => `
    <button
      type="button"
      class="color-swatch-btn"
      data-color="${item.hex}"
      title="${item.name}"
      aria-label="Color ${item.name}"
      role="radio"
      aria-checked="false"
      style="background-color: ${item.hex};"
    >
      <span class="swatch-check" aria-hidden="true">${ICONS.check}</span>
    </button>
  `).join('');

  eventColorPalette.onkeydown = (e) => {
    const swatches = Array.from(eventColorPalette.querySelectorAll('.color-swatch-btn'));
    if (!swatches.length) return;
    const currentIndex = swatches.findIndex(s => s.classList.contains('active'));
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % swatches.length;
      swatches[nextIndex].focus();
      setSelectedEventColor(swatches[nextIndex].dataset.color);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + swatches.length) % swatches.length;
      swatches[prevIndex].focus();
      setSelectedEventColor(swatches[prevIndex].dataset.color);
    }
  };

  eventColorPalette.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setSelectedEventColor(btn.dataset.color);
    });
  });
}

function setSelectedEventColor(selectedHex) {
  const normalized = (selectedHex || EVENT_COLORS[0]).toLowerCase();
  if (eventModalColor) {
    eventModalColor.value = normalized;
  }
  if (!eventColorPalette) return;
  const buttons = eventColorPalette.querySelectorAll('.color-swatch-btn');
  buttons.forEach(btn => {
    const btnColor = (btn.dataset.color || '').toLowerCase();
    const isMatch = btnColor === normalized;
    btn.classList.toggle('active', isMatch);
    btn.setAttribute('aria-checked', isMatch ? 'true' : 'false');
  });
}

function openEventModal(eventId = null, defaultDate = null, prefill = null) {
  if (!dialogEventModal) return;

  const allEvents = storage.getEvents();
  const eventModalAllDay = document.getElementById('eventModalAllDay');
  const eventDetailsAdvanced = document.getElementById('eventDetailsAdvanced');

  if (eventId) {
    const ev = allEvents.find(e => e.id === eventId);
    if (ev) {
      eventModalHeading.innerHTML = `${ICONS.edit} Editar Evento`;
      eventModalId.value = ev.id;
      eventModalTitle.value = ev.title || '';
      eventModalDate.value = ev.date || (calendarComponent ? calendarComponent.formatDateISO(calendarComponent.selectedDate) : '');
      eventModalStartTime.value = ev.start_time || '';
      eventModalEndTime.value = ev.end_time || '';
      eventModalLocation.value = ev.location || '';
      eventModalDescription.value = ev.description || '';
      setSelectedEventColor(ev.color || EVENT_COLORS[0]);

      const isAllDay = !ev.start_time && !ev.end_time;
      if (eventModalAllDay) {
        eventModalAllDay.checked = isAllDay;
        eventModalStartTime.disabled = isAllDay;
        if (eventModalEndTime) eventModalEndTime.disabled = isAllDay;
      }

      if (eventDetailsAdvanced) {
        eventDetailsAdvanced.open = !!(ev.location || ev.end_time || ev.description);
      }

      openModalAccessible(dialogEventModal);
      return;
    }
  }

  // Nuevo evento manual o prellenado desde propuesta IA
  const targetDate = prefill?.date || defaultDate || (calendarComponent ? calendarComponent.formatDateISO(calendarComponent.selectedDate) : getLocalDateISO());
  eventModalHeading.innerHTML = `${ICONS.plus} Nuevo Evento`;
  eventModalId.value = '';
  eventModalTitle.value = prefill?.title || '';
  eventModalDate.value = targetDate;
  eventModalStartTime.value = prefill?.startTime || '';
  eventModalEndTime.value = prefill?.endTime || '';
  eventModalLocation.value = prefill?.location || '';
  eventModalDescription.value = prefill?.description || '';

  const isAllDay = prefill ? (!prefill.startTime && !prefill.endTime) : false;
  if (eventModalAllDay) {
    eventModalAllDay.checked = isAllDay;
    eventModalStartTime.disabled = isAllDay;
    if (eventModalEndTime) eventModalEndTime.disabled = isAllDay;
  }

  // Por defecto colapsado para creación rápida a menos que se hayan prellenado opciones avanzadas
  if (eventDetailsAdvanced) {
    eventDetailsAdvanced.open = !!(prefill?.location || prefill?.endTime || prefill?.description);
  }

  // Asignar automáticamente un color diferente disponible en la misma fecha
  const nextColor = getNextAvailableEventColor(targetDate, allEvents);
  setSelectedEventColor(prefill?.color || nextColor);

  openModalAccessible(dialogEventModal);
}
window.openEventModal = openEventModal;
window.openNewEventModalForDate = (date) => openEventModal(null, date);
window.openEditEventModal = (id) => openEventModal(id);

// Manejador del checkbox "Todo el día"
const eventModalAllDay = document.getElementById('eventModalAllDay');
if (eventModalAllDay) {
  eventModalAllDay.addEventListener('change', () => {
    const isAllDay = eventModalAllDay.checked;
    if (eventModalStartTime) eventModalStartTime.disabled = isAllDay;
    if (eventModalEndTime) eventModalEndTime.disabled = isAllDay;
    if (isAllDay) {
      if (eventModalStartTime) eventModalStartTime.value = '';
      if (eventModalEndTime) eventModalEndTime.value = '';
    }
  });
}

if (eventModalDate) {
  eventModalDate.addEventListener('change', () => {
    // Si es un nuevo evento, sugerir el siguiente color disponible al cambiar la fecha
    if (!eventModalId.value && eventModalDate.value) {
      const nextColor = getNextAvailableEventColor(eventModalDate.value, storage.getEvents());
      setSelectedEventColor(nextColor);
    }
  });
}

const closeEventModal = () => dialogEventModal?.close();
if (btnCloseEventModal) btnCloseEventModal.addEventListener('click', closeEventModal);
if (btnDismissEventModal) btnDismissEventModal.addEventListener('click', closeEventModal);

if (formEventModal) {
  formEventModal.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = eventModalTitle.value.trim();
    const date = eventModalDate.value;
    if (!title || !date) return;

    const isAllDay = eventModalAllDay ? eventModalAllDay.checked : false;
    const startTime = isAllDay ? null : (eventModalStartTime.value || null);
    const endTime = isAllDay ? null : (eventModalEndTime.value || null);

    if (startTime && endTime && endTime < startTime) {
      showToast('La hora de fin debe ser posterior a la de inicio', 3500, 'error');
      eventModalEndTime.focus();
      return;
    }

    const btnSave = document.getElementById('btnSaveEventModal');
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = 'Guardando…';
    }

    try {
      const id = eventModalId.value;
      const color = eventModalColor ? (eventModalColor.value || EVENT_COLORS[0]) : EVENT_COLORS[0];
      const eventData = {
        id: id || `event_manual_${Date.now()}`,
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        location: eventModalLocation.value.trim() || '',
        description: eventModalDescription.value.trim() || '',
        color,
        created_at: new Date().toISOString()
      };

      storage.saveEvent(eventData);
      closeEventModal();
      showToast(id ? 'Evento actualizado con éxito' : 'Evento guardado con éxito', 3000, 'success');
      if (calendarComponent) {
        calendarComponent.render();
      }
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = 'Guardar Evento';
      }
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
      <div class="empty-state-card">
        <div class="empty-state-icon">${ICONS.folder}</div>
        <h4 class="empty-state-title">Historial de entradas vacío</h4>
        <p class="empty-state-desc">Cada vez que organices una nota o mensaje con la IA, guardaremos el registro aquí para que puedas reutilizar el texto con un solo clic.</p>
      </div>
    `;
    return;
  }

  historyListElement.innerHTML = '';
  history.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <span class="history-date-badge">${ICONS.clock} ${escapeHtml(item.date)}</span>
        <span class="history-stats-pill">${ICONS.checkSquare} ${item.tasksCount} tareas &bull; ${ICONS.calendar} ${item.eventsCount} eventos</span>
      </div>
      <div class="history-quote-box">&ldquo;${escapeHtml(item.rawText)}&rdquo;</div>
      <div class="history-card-footer">
        <span class="history-summary-text">${ICONS.sparkles} ${escapeHtml(item.summary || 'Procesado con IA')}</span>
        <button class="btn btn-sm btn-outline btn-reuse-prompt" data-idx="${idx}" title="Cargar este texto en el campo principal">
          ${ICONS.rotateCcw} Reutilizar texto
        </button>
      </div>
    `;

    card.querySelector('.btn-reuse-prompt').addEventListener('click', (e) => {
      e.stopPropagation();
      inputText.value = item.rawText;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      inputCardSection?.classList.add('expanded');
      inputText.focus();
      showToast('Texto cargado en la barra superior', 2000, 'info');
    });

    historyListElement.appendChild(card);
  });
}

btnClearHistory.addEventListener('click', () => {
  showConfirmDialog('Limpiar Historial', '¿Deseas limpiar todo el historial de entradas procesadas?', 'Limpiar', () => {
    localStorage.removeItem('organiza_local_history');
    renderHistory();
    showToast('Historial limpiado correctamente', 3000);
  });
});

// -------------------------------------------------------------
// Controlador de Tema Visual (Royal Blue 600 / Dark Deep Slate Void)
// -------------------------------------------------------------
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('organiza_theme', theme);
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#080d1a' : '#f8fafc');
  }
  if (selectAppTheme && selectAppTheme.value !== theme) {
    selectAppTheme.value = theme;
  }
  const sunIcon = document.querySelector('.theme-icon-sun');
  const moonIcon = document.querySelector('.theme-icon-moon');
  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    } else {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    }
  }
}

// Inicializar listener de cambio de tema con vista previa en vivo
if (selectAppTheme) {
  selectAppTheme.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
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
  switchSettingsTab('account'); // Abre siempre 'Mi Cuenta' por defecto
  loadSettingsIntoDialog();
  clearAuthAlert();
  openModalAccessible(dialogSettings);
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

  showToast('Ajustes guardados correctamente', 3000, 'success');
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
    openModalAccessible(dialogSettings);
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
        showToast('¡Sesión iniciada con éxito!', 3000, 'success');
        closeAuthModal();
      } else {
        const data = await SupabaseService.signUp(email, password);
        if (data?.user && !data?.session) {
          setAuthAlert('Te enviamos un enlace de confirmación a tu correo. Por favor revísalo.', 'success');
        } else {
          showToast('¡Cuenta creada y sesión iniciada!', 3000, 'success');
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
      setAuthAlert('Enlace mágico enviado. Revisa tu bandeja de entrada para acceder directamente.', 'success');
    } catch (err) {
      setAuthAlert(err.message || 'No se pudo enviar el enlace mágico.');
    } finally {
      btnMagicLink.disabled = false;
      btnMagicLink.innerHTML = `${ICONS.mail} Enviar enlace mágico al correo`;
    }
  });
}

// Cerrar Sesión
if (btnLogout) {
  btnLogout.addEventListener('click', async () => {
    try {
      await SupabaseService.signOut();
      storage.clearLocalDataOnLogout();
      showToast('Sesión cerrada. Modo local reiniciado.', 3000);
      closeAuthModal();
    } catch (err) {
      showToast('Error cerrando sesión: ' + err.message, 3000, 'error');
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
// PANTALLA INICIO PERSONAL (De Mockup WhatsApp 6.56.10 PM y e rv .jpeg)
// -------------------------------------------------------------
let selectedHomeDateISO = getLocalDateISO();
let selectedHomeCategoryFilter = 'all';
let dateCarouselInitialized = false;
let dateCarouselScrollTimeout = null;

function updateDateCarouselScales() {
  const viewport = document.getElementById('dateCarouselViewport');
  const track = document.getElementById('dateCarouselTrack');
  if (!viewport || !track) return null;

  const viewportRect = viewport.getBoundingClientRect();
  const viewportCenter = viewportRect.left + viewportRect.width / 2;
  const cards = track.querySelectorAll('.date-carousel-item');
  let closestCard = null;
  let minDistance = Infinity;

  cards.forEach(card => {
    const cardRect = card.getBoundingClientRect();
    const cardCenter = cardRect.left + cardRect.width / 2;
    const dist = Math.abs(viewportCenter - cardCenter);

    if (dist < minDistance) {
      minDistance = dist;
      closestCard = card;
    }

    // Física fluida de Cover Flow (escala entre 1.14 en el centro y 0.91 en la periferia)
    const norm = Math.min(dist / 80, 1);
    const scale = 1.14 - (norm * 0.23);
    const opacity = 1.0 - (norm * 0.35);

    card.style.transform = `scale(${scale.toFixed(3)})`;
    card.style.opacity = opacity.toFixed(3);

    if (dist < 30) {
      card.classList.add('active');
      card.classList.remove('is-neighbor');
      card.setAttribute('aria-selected', 'true');
    } else if (dist < 80) {
      card.classList.remove('active');
      card.classList.add('is-neighbor');
      card.setAttribute('aria-selected', 'false');
    } else {
      card.classList.remove('active');
      card.classList.remove('is-neighbor');
      card.setAttribute('aria-selected', 'false');
    }
  });

  return closestCard;
}

function centerCarouselOnItem(item, smooth = true) {
  const viewport = document.getElementById('dateCarouselViewport');
  if (!viewport || !item) return;
  const targetScrollLeft = item.offsetLeft - (viewport.clientWidth / 2) + (item.offsetWidth / 2);
  viewport.scrollTo({
    left: targetScrollLeft,
    behavior: smooth ? 'smooth' : 'instant'
  });
}

function initCoverFlowDateCarousel() {
  const viewport = document.getElementById('dateCarouselViewport');
  const track = document.getElementById('dateCarouselTrack');
  if (!viewport || !track) return;

  track.innerHTML = '';
  const today = new Date();
  const dayAbbrs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const allEvents = storage.getEvents() || [];
  const allTasks = storage.getTasks() || [];

  // Rango continuo: 30 días en el pasado hasta 30 días en el futuro (61 días continuos)
  const rangeStart = -30;
  const rangeEnd = 30;

  for (let offset = rangeStart; offset <= rangeEnd; offset++) {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    const iso = getLocalDateISO(d);
    const isSelected = iso === selectedHomeDateISO;

    const hasEvents = allEvents.some(e => e.date === iso);
    const hasTasks = allTasks.some(t => (t.dueDate === iso || t.due_date === iso));

    const item = document.createElement('button');
    item.type = 'button';
    item.className = `date-carousel-item ${isSelected ? 'active' : ''}`;
    item.setAttribute('role', 'tab');
    item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
    item.dataset.dateIso = iso;

    item.innerHTML = `
      <span class="carousel-day-name">${dayAbbrs[d.getDay()]}</span>
      <span class="carousel-day-num">${d.getDate()}</span>
      <div class="carousel-day-indicators" aria-hidden="true">
        ${hasEvents ? '<span class="carousel-dot dot-blue" title="Eventos agendados"></span>' : ''}
        ${hasTasks ? '<span class="carousel-dot dot-green" title="Tareas pendientes"></span>' : ''}
        ${!hasEvents && !hasTasks ? '<span class="carousel-dot dot-orange" style="opacity:0.2;"></span>' : ''}
      </div>
    `;

    item.addEventListener('click', () => {
      centerCarouselOnItem(item, true);
    });

    track.appendChild(item);
  }

  // Scroll listener optimizado con requestAnimationFrame
  let ticking = false;
  viewport.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateDateCarouselScales();
        ticking = false;
      });
      ticking = true;
    }

    clearTimeout(dateCarouselScrollTimeout);
    dateCarouselScrollTimeout = setTimeout(() => {
      const closest = updateDateCarouselScales();
      if (closest && closest.dataset.dateIso && closest.dataset.dateIso !== selectedHomeDateISO) {
        selectedHomeDateISO = closest.dataset.dateIso;
        renderHomeActivities();
        if (window.calendarComponent && typeof window.calendarComponent.selectDate === 'function') {
          window.calendarComponent.selectDate(selectedHomeDateISO);
        }
      }
    }, 120);
  }, { passive: true });

  // Soporte de accesibilidad por teclado (flechas izquierda / derecha)
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const currentActive = track.querySelector('.date-carousel-item.active') || track.querySelector(`[data-date-iso="${selectedHomeDateISO}"]`);
      if (currentActive) {
        const target = e.key === 'ArrowLeft' ? currentActive.previousElementSibling : currentActive.nextElementSibling;
        if (target) {
          centerCarouselOnItem(target, true);
        }
      }
    }
  });

  // Centrar en selectedHomeDateISO al montar
  setTimeout(() => {
    const initialCard = track.querySelector(`[data-date-iso="${selectedHomeDateISO}"]`);
    if (initialCard) {
      centerCarouselOnItem(initialCard, false);
      updateDateCarouselScales();
    }
  }, 40);

  dateCarouselInitialized = true;
}

function renderHomeActivities() {
  const homeDateSubtitle = document.getElementById('homeDateSubtitle');
  const homeStatsCountHeading = document.getElementById('homeStatsCountHeading');
  const donutSegmentCompleted = document.getElementById('donutSegmentCompleted');
  const donutSegmentProgress = document.getElementById('donutSegmentProgress');
  const donutSegmentPending = document.getElementById('donutSegmentPending');
  const donutPercentText = document.getElementById('donutPercentText');
  const legendCompletedText = document.getElementById('legendCompletedText');
  const legendProgressText = document.getElementById('legendProgressText');
  const legendPendingText = document.getElementById('legendPendingText');
  const homeTasksList = document.getElementById('homeTasksList');
  const homeUpcomingEventsList = document.getElementById('homeUpcomingEventsList');

  // Formato de fecha en español de la fecha seleccionada
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  
  if (homeDateSubtitle && selectedHomeDateISO) {
    const [y, m, d] = selectedHomeDateISO.split('-').map(Number);
    const selDateObj = new Date(y, m - 1, d);
    homeDateSubtitle.textContent = `${dayNames[selDateObj.getDay()]}, ${selDateObj.getDate()} de ${monthNames[selDateObj.getMonth()]}`;
  }

  // Tareas reales del usuario desde StorageService
  const allTasks = storage.getTasks() || [];
  const todayISO = getLocalDateISO();

  // Filtrado por fecha o categoría
  let tasksToShow = allTasks;
  if (selectedHomeCategoryFilter !== 'all') {
    tasksToShow = tasksToShow.filter(t => (t.category || 'General').toLowerCase() === selectedHomeCategoryFilter.toLowerCase());
  }

  // Estadísticas honestas basadas 100% en datos reales del usuario
  const completedCount = allTasks.filter(t => t.completed).length;
  const inProgressCount = allTasks.filter(t => !t.completed && t.status === 'in_progress').length;
  const pendingCount = allTasks.filter(t => !t.completed && t.status !== 'in_progress').length;
  const totalTasks = allTasks.length;
  const percentCompleted = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  if (homeStatsCountHeading) {
    homeStatsCountHeading.textContent = totalTasks > 0
      ? `${totalTasks} ${totalTasks === 1 ? 'tarea' : 'tareas'} registradas`
      : 'Sin tareas pendientes';
  }
  if (donutPercentText) {
    donutPercentText.textContent = `${percentCompleted}%`;
  }
  if (legendCompletedText) {
    legendCompletedText.innerHTML = `<strong>${completedCount} ${completedCount === 1 ? 'tarea' : 'tareas'}</strong> completadas`;
  }
  if (legendProgressText) {
    legendProgressText.innerHTML = `<strong>${inProgressCount} ${inProgressCount === 1 ? 'tarea' : 'tareas'}</strong> en progreso`;
  }
  if (legendPendingText) {
    legendPendingText.innerHTML = `<strong>${pendingCount} ${pendingCount === 1 ? 'tarea' : 'tareas'}</strong> por hacer`;
  }

  // Cálculo SVG Donut
  const circumference = 2 * Math.PI * 40; // 251.32
  if (totalTasks > 0) {
    const completedDash = (completedCount / totalTasks) * circumference;
    const progressDash = (inProgressCount / totalTasks) * circumference;
    const pendingDash = (pendingCount / totalTasks) * circumference;

    if (donutSegmentCompleted) {
      donutSegmentCompleted.setAttribute('stroke-dasharray', `${completedDash} ${circumference}`);
      donutSegmentCompleted.setAttribute('stroke-dashoffset', '0');
    }
    if (donutSegmentProgress) {
      donutSegmentProgress.setAttribute('stroke-dasharray', `${progressDash} ${circumference}`);
      donutSegmentProgress.setAttribute('stroke-dashoffset', `${-completedDash}`);
    }
    if (donutSegmentPending) {
      donutSegmentPending.setAttribute('stroke-dasharray', `${pendingDash} ${circumference}`);
      donutSegmentPending.setAttribute('stroke-dashoffset', `${-(completedDash + progressDash)}`);
    }
  } else {
    if (donutSegmentCompleted) donutSegmentCompleted.setAttribute('stroke-dasharray', `0 ${circumference}`);
    if (donutSegmentProgress) donutSegmentProgress.setAttribute('stroke-dasharray', `0 ${circumference}`);
    if (donutSegmentPending) donutSegmentPending.setAttribute('stroke-dasharray', `0 ${circumference}`);
  }

  // Renderizar tarjetas de tareas
  if (homeTasksList) {
    homeTasksList.innerHTML = '';
    
    if (tasksToShow.length > 0) {
      tasksToShow.forEach((task, idx) => {
        const accentClasses = ['accent-green', 'accent-blue', 'accent-orange', 'accent-purple'];
        const accentClass = accentClasses[idx % accentClasses.length];
        const isOverdue = task.dueDate && task.dueDate < todayISO && !task.completed;

        const card = document.createElement('div');
        card.className = `home-task-card ${accentClass} ${task.completed ? 'completed' : ''}`;
        card.innerHTML = `
          <div class="home-task-main">
            <span class="home-task-title">${escapeHtml(task.title)}</span>
            <div class="home-task-meta-row">
              <span class="home-task-time-pill">${task.dueDate || 'Sin fecha'}</span>
              ${isOverdue ? '<span class="task-overdue-badge">¡Vencida!</span>' : ''}
              <span class="home-task-category-tag">${escapeHtml(task.category || 'General')}</span>
            </div>
          </div>
          <button type="button" class="home-task-check-btn ${task.completed ? 'checked' : ''}" title="${task.completed ? 'Marcar pendiente' : 'Marcar completada'}" aria-label="Cambiar estado">
            ✓
          </button>
        `;

        card.querySelector('.home-task-check-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          const btn = e.currentTarget;
          btn.classList.toggle('checked');
          storage.saveTask({ ...task, completed: !task.completed });
        });

        card.addEventListener('click', () => {
          taskModalId.value = task.id;
          taskModalTitle.value = task.title;
          taskModalCategory.value = task.category || 'General';
          taskModalPriority.value = task.priority || 'media';
          taskModalDueDate.value = task.dueDate || task.due_date || '';
          taskModalHeading.innerHTML = `${ICONS.pencil} Editar Tarea`;
          openModalAccessible(dialogTaskModal);
        });
        homeTasksList.appendChild(card);
      });
    } else {
      homeTasksList.innerHTML = `
        <div class="empty-home-tasks-card">
          <span class="empty-home-tasks-icon" aria-hidden="true">✨</span>
          <h4 class="empty-home-tasks-title">¡Todo al día!</h4>
          <p class="empty-home-tasks-desc">No tienes tareas pendientes ${selectedHomeCategoryFilter !== 'all' ? `en la categoría ${escapeHtml(selectedHomeCategoryFilter)}` : 'registradas'}.</p>
          <button type="button" class="empty-home-tasks-btn" id="btnHomeAddTask">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            + Nueva Tarea
          </button>
        </div>
      `;
      document.getElementById('btnHomeAddTask')?.addEventListener('click', () => {
        openNewTaskModal(selectedHomeDateISO);
      });
    }
  }

  // Renderizar eventos próximos
  if (homeUpcomingEventsList) {
    homeUpcomingEventsList.innerHTML = '';
    const allEvents = storage.getEvents() || [];

    if (allEvents.length > 0) {
      const sortedEvents = [...allEvents].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      sortedEvents.slice(0, 4).forEach(ev => {
        const evCard = document.createElement('div');
        evCard.className = 'home-event-card';
        evCard.innerHTML = `
          <div class="home-event-header">
            <div class="home-event-title-group">
              <span class="home-event-tag-badge" style="background:${ev.color || '#2563eb'}">📅</span>
              <h4>${escapeHtml(ev.title)}</h4>
            </div>
            <span class="home-event-time-badge">${ev.startTime ? `${ev.startTime} ${ev.endTime ? '- ' + ev.endTime : ''}` : 'Todo el día'}</span>
          </div>
          ${ev.description ? `<p class="home-event-desc">${escapeHtml(ev.description)}</p>` : ''}
          ${ev.location ? `<a href="${ev.location.startsWith('http') ? ev.location : '#'}" target="_blank" rel="noopener" class="home-event-link-pill">🔗 ${escapeHtml(ev.location)}</a>` : ''}
        `;
        evCard.addEventListener('click', () => openEventModal(ev.id));
        homeUpcomingEventsList.appendChild(evCard);
      });
    } else {
      homeUpcomingEventsList.innerHTML = `
        <div class="empty-home-tasks-card">
          <span class="empty-home-tasks-icon" aria-hidden="true">📅</span>
          <h4 class="empty-home-tasks-title">Sin eventos próximos</h4>
          <p class="empty-home-tasks-desc">No tienes eventos agendados en tu calendario.</p>
          <button type="button" class="empty-home-tasks-btn" id="btnHomeAddEvent">
            <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            + Añadir Evento
          </button>
        </div>
      `;
      document.getElementById('btnHomeAddEvent')?.addEventListener('click', () => {
        window.openNewEventModalForDate(selectedHomeDateISO);
      });
    }
  }
}

function openNewTaskModal(defaultDueDate = '') {
  taskModalId.value = '';
  taskModalTitle.value = '';
  taskModalCategory.value = 'General';
  taskModalPriority.value = 'media';
  taskModalDueDate.value = defaultDueDate || '';
  taskModalHeading.innerHTML = `${ICONS.pencil} Nueva Tarea`;
  openModalAccessible(dialogTaskModal);
}
window.openNewTaskModal = openNewTaskModal;

function renderHome() {
  const homeGreetingTitle = document.getElementById('homeGreetingTitle');
  const btnHomeProfile = document.getElementById('btnHomeProfile');
  const btnHomeSearch = document.getElementById('btnHomeSearch');
  const btnHomeViewAllTasks = document.getElementById('btnHomeViewAllTasks');
  const btnHomeViewCalendar = document.getElementById('btnHomeViewCalendar');

  // Saludo contextual basado en la hora del día y usuario real
  const today = new Date();
  const hour = today.getHours();
  let timeGreeting = 'Buenos días';
  if (hour >= 12 && hour < 19) timeGreeting = 'Buenas tardes';
  else if (hour >= 19 || hour < 6) timeGreeting = 'Buenas noches';
  
  const currentUser = SupabaseService.getCurrentUser();
  let greetingText = timeGreeting;
  if (currentUser) {
    const raw = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || (currentUser.email ? currentUser.email.split('@')[0] : '');
    if (raw) {
      greetingText = `${timeGreeting}, ${escapeHtml(raw.charAt(0).toUpperCase() + raw.slice(1))}`;
    }
  }

  if (homeGreetingTitle) {
    homeGreetingTitle.innerHTML = `${greetingText} <span class="greeting-wave" aria-hidden="true">👋</span>`;
  }

  // Inicializar o refrescar el Carrusel de Fechas Cover Flow
  if (!dateCarouselInitialized) {
    initCoverFlowDateCarousel();
  } else {
    // Refrescar indicadores si cambiaron eventos/tareas
    const track = document.getElementById('dateCarouselTrack');
    if (track) {
      const allEvents = storage.getEvents() || [];
      const allTasks = storage.getTasks() || [];
      track.querySelectorAll('.date-carousel-item').forEach(item => {
        const iso = item.dataset.dateIso;
        if (!iso) return;
        const hasEvents = allEvents.some(e => e.date === iso);
        const hasTasks = allTasks.some(t => (t.dueDate === iso || t.due_date === iso));
        const ind = item.querySelector('.carousel-day-indicators');
        if (ind) {
          ind.innerHTML = `
            ${hasEvents ? '<span class="carousel-dot dot-blue" title="Eventos agendados"></span>' : ''}
            ${hasTasks ? '<span class="carousel-dot dot-green" title="Tareas pendientes"></span>' : ''}
            ${!hasEvents && !hasTasks ? '<span class="carousel-dot dot-orange" style="opacity:0.2;"></span>' : ''}
          `;
        }
      });
      updateDateCarouselScales();
    }
  }

  // Renderizar las actividades (tareas y eventos)
  renderHomeActivities();

  // Conectar acciones de cabecera y botones de navegación
  if (btnHomeProfile) {
    btnHomeProfile.onclick = () => {
      if (dialogSettings) openModalAccessible(dialogSettings);
    };
  }
  if (btnHomeSearch) {
    btnHomeSearch.onclick = () => {
      document.querySelector('.view-tab[data-target="viewTasks"]')?.click();
      const searchBox = document.getElementById('inputSearchNotes');
      if (searchBox) searchBox.focus();
    };
  }
  if (btnHomeViewAllTasks) {
    btnHomeViewAllTasks.onclick = () => {
      document.querySelector('.view-tab[data-target="viewTasks"]')?.click();
    };
  }
  if (btnHomeViewCalendar) {
    btnHomeViewCalendar.onclick = () => {
      document.querySelector('.view-tab[data-target="viewCalendar"]')?.click();
    };
  }

  // Filtros de categoría de Home
  document.querySelectorAll('.home-pill').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.home-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedHomeCategoryFilter = btn.dataset.filter || 'all';
      renderHomeActivities();
    };
  });
}

// -------------------------------------------------------------
// ASISTENTE CONVERSACIONAL (Rediseño Inteligente y Ergonómico)
// -------------------------------------------------------------
function setupChatAssistant() {
  const chatInputText = document.getElementById('chatInputText');
  const btnChatSend = document.getElementById('btnChatSend');
  const btnClearChat = document.getElementById('btnClearChat');
  const chatMessageStream = document.getElementById('chatMessageStream');
  const chatTypingIndicator = document.getElementById('chatTypingIndicator');
  const btnChatVoiceTrigger = document.getElementById('btnChatVoiceTrigger');
  const chatSuggestionsContainer = document.getElementById('chatSuggestionsContainer');

  if (!btnChatSend || !chatInputText) return;

  // Sugerencias interactivas compactas
  function bindSuggestionChips() {
    document.querySelectorAll('.chat-pill-chip, .chat-suggest-chip').forEach(chip => {
      chip.onclick = () => {
        const prompt = chip.dataset.prompt;
        if (prompt) {
          chatInputText.value = prompt;
          handleChatSubmit();
        }
      };
    });
  }
  bindSuggestionChips();

  // Limpiar / reiniciar conversación
  if (btnClearChat) {
    btnClearChat.onclick = () => {
      if (!chatMessageStream) return;
      chatMessageStream.innerHTML = `
        <div class="chat-bubble-row bot-row initial-welcome-row">
          <div class="bot-avatar-mini" aria-hidden="true">✦</div>
          <div class="chat-bubble bot-bubble">
            <p class="bot-welcome-main"><strong>Hola, ¿qué organizamos hoy?</strong></p>
            <p class="bot-welcome-sub">Puedo ayudarte a planificar eventos, tareas y actividades a partir de texto libre o voz.</p>
          </div>
        </div>
      `;
      if (chatSuggestionsContainer) {
        chatSuggestionsContainer.style.display = 'block';
      }
      showToast('Conversación reiniciada', 2000, 'info');
    };
  }

  // Dictado por voz desde el chat
  if (btnChatVoiceTrigger) {
    btnChatVoiceTrigger.onclick = () => {
      openVoiceDictationCapsule((text) => {
        chatInputText.value = text;
        handleChatSubmit();
      });
    };
  }

  // Enviar mensaje en el chat
  async function handleChatSubmit() {
    const text = chatInputText.value.trim();
    if (!text) return;

    // Minimizar la barra de sugerencias cuando empieza la conversación activa
    if (chatSuggestionsContainer) {
      chatSuggestionsContainer.style.display = 'none';
    }

    // 1. Agregar burbuja de usuario
    const userRow = document.createElement('div');
    userRow.className = 'chat-bubble-row user-row';
    userRow.innerHTML = `
      <div class="chat-bubble user-bubble">
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    chatMessageStream.appendChild(userRow);
    chatInputText.value = '';
    chatMessageStream.scrollTop = chatMessageStream.scrollHeight;

    // 2. Mostrar indicador de escritura
    if (chatTypingIndicator) {
      chatTypingIndicator.classList.remove('hidden');
      chatMessageStream.appendChild(chatTypingIndicator);
      chatMessageStream.scrollTop = chatMessageStream.scrollHeight;
    }

    try {
      const result = await AIService.processText(text);

      if (chatTypingIndicator) {
        chatTypingIndicator.classList.add('hidden');
      }

      // 3. Crear respuesta de IA estructurada
      const botRow = document.createElement('div');
      botRow.className = 'chat-bubble-row bot-row';

      const taskCount = result.tasks?.length || 0;
      const eventCount = result.calendar_events?.length || 0;
      const noteCount = result.notes?.length || 0;

      let replyMsg = `¡He analizado tu mensaje! Detecté: `;
      const parts = [];
      if (eventCount > 0) parts.push(`${eventCount} ${eventCount === 1 ? 'evento' : 'eventos'}`);
      if (taskCount > 0) parts.push(`${taskCount} ${taskCount === 1 ? 'tarea' : 'tareas'}`);
      if (noteCount > 0) parts.push(`${noteCount} ${noteCount === 1 ? 'idea' : 'ideas'}`);
      replyMsg += parts.join(', ') || 'elementos para estructurar';
      replyMsg += `. Revisa las actividades propuestas a continuación:`;

      botRow.innerHTML = `
        <div class="bot-avatar-mini" aria-hidden="true">✦</div>
        <div class="chat-bubble bot-bubble">
          <p>${replyMsg}</p>
        </div>
      `;
      chatMessageStream.appendChild(botRow);

      // Si hay eventos o tareas, crear tarjeta interactiva de propuesta con Editar / Confirmar / Descartar
      if (eventCount > 0 || taskCount > 0) {
        const firstEvent = result.calendar_events?.[0];
        const firstTask = result.tasks?.[0];
        const title = firstEvent?.title || firstTask?.title || 'Compromiso detectado';
        const date = firstEvent?.date || firstTask?.dueDate || getLocalDateISO();
        const time = firstEvent?.startTime ? `${firstEvent.startTime} ${firstEvent.endTime ? '- ' + firstEvent.endTime : ''}` : (firstTask?.dueDate ? `Para ${firstTask.dueDate}` : 'Sin hora fijada');

        const proposalCard = document.createElement('div');
        proposalCard.className = 'chat-proposal-card';
        proposalCard.innerHTML = `
          <div class="proposal-card-header">
            <div class="proposal-type-badge">
              <span class="proposal-type-icon">${eventCount > 0 ? '📅' : '✓'}</span>
              <span class="proposal-type-text">${eventCount > 0 ? 'Evento Propuesto' : 'Tarea Propuesta'}</span>
            </div>
            <span class="proposal-time-tag">${date}</span>
          </div>
          <div class="proposal-card-body">
            <h4 class="proposal-title">${escapeHtml(title)}</h4>
            <p class="proposal-desc">${firstEvent?.description ? escapeHtml(firstEvent.description) : (firstTask?.category ? `Categoría: ${escapeHtml(firstTask.category)}` : 'Generado automáticamente por el motor de IA.')}</p>
            <div class="proposal-meta-pills">
              <span class="meta-pill">⏱ ${time}</span>
              ${firstEvent?.location ? `<span class="meta-pill">📍 ${escapeHtml(firstEvent.location)}</span>` : ''}
              ${firstTask?.priority ? `<span class="meta-pill">Prioridad ${firstTask.priority}</span>` : ''}
            </div>
          </div>
          <div class="proposal-card-actions">
            <button type="button" class="btn-proposal btn-proposal-reject" title="Descartar propuesta">
              <span>✕</span> Descartar
            </button>
            <button type="button" class="btn-proposal btn-proposal-edit" title="Personalizar detalles">
              <span>✎</span> Editar
            </button>
            <button type="button" class="btn-proposal btn-proposal-accept" title="Guardar en tu agenda">
              <span>✓</span> Confirmar
            </button>
          </div>
        `;

        // Acción: Confirmar y Guardar
        const btnAccept = proposalCard.querySelector('.btn-proposal-accept');
        const btnReject = proposalCard.querySelector('.btn-proposal-reject');
        const btnEdit = proposalCard.querySelector('.btn-proposal-edit');

        btnAccept.addEventListener('click', () => {
          btnAccept.disabled = true;
          btnAccept.textContent = 'Guardando…';
          try {
            storage.addBatchFromAI(result, text);
            showToast('¡Guardado exitosamente en tu calendario y tareas!', 3000, 'success');
            btnAccept.textContent = '✓ Guardado en tu agenda';
            btnAccept.style.background = '#059669';
            btnReject.style.display = 'none';
            btnEdit.style.display = 'none';
          } catch (err) {
            btnAccept.disabled = false;
            btnAccept.textContent = 'Reintentar';
            showToast('Error al guardar la actividad', 3000, 'error');
          }
        });

        // Acción: Editar
        btnEdit.addEventListener('click', () => {
          if (eventCount > 0 && firstEvent) {
            openEventModal(null, date, {
              title: firstEvent.title,
              date: firstEvent.date,
              startTime: firstEvent.startTime,
              endTime: firstEvent.endTime,
              location: firstEvent.location,
              description: firstEvent.description,
              color: '#2563eb'
            });
          } else if (firstTask) {
            openNewTaskModal(firstTask.dueDate || date, firstTask.title);
          }
        });

        // Acción: Descartar
        btnReject.addEventListener('click', () => {
          proposalCard.style.opacity = '0.45';
          proposalCard.style.pointerEvents = 'none';
          proposalCard.querySelector('.proposal-card-actions').innerHTML = `
            <span style="font-size:0.78rem; font-weight:600; color:var(--text-muted);">✕ Propuesta descartada</span>
          `;
          showToast('Propuesta descartada', 2000, 'info');
        });

        chatMessageStream.appendChild(proposalCard);
      }

      chatMessageStream.scrollTop = chatMessageStream.scrollHeight;
    } catch (err) {
      console.error('Chat error:', err);
      if (chatTypingIndicator) chatTypingIndicator.classList.add('hidden');
      const errRow = document.createElement('div');
      errRow.className = 'chat-bubble-row bot-row';
      errRow.innerHTML = `
        <div class="bot-avatar-mini" aria-hidden="true">✦</div>
        <div class="chat-bubble bot-bubble">
          <p>Ocurrió un error al interpretar tu solicitud. Intenta con un texto más claro o revisa tu conexión.</p>
        </div>
      `;
      chatMessageStream.appendChild(errRow);
      chatMessageStream.scrollTop = chatMessageStream.scrollHeight;
    }
  }

  btnChatSend.addEventListener('click', handleChatSubmit);
  chatInputText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  });
}

// -------------------------------------------------------------
// DICTADO POR VOZ FLOTANTE (Screen G de e rgr er .jpeg)
// -------------------------------------------------------------
let voiceTimerInterval = null;
let voiceSeconds = 0;
let voiceRecognitionInstance = null;
let onVoiceSubmitCallback = null;

function openVoiceDictationCapsule(onComplete) {
  const capsule = document.getElementById('voiceDictationCapsule');
  const timer = document.getElementById('voiceRecordingTimer');
  const transcript = document.getElementById('voiceTranscriptText');
  const btnCancel = document.getElementById('btnVoiceCancel');
  const btnSubmit = document.getElementById('btnVoiceSubmit');

  if (!capsule) return;
  capsule.classList.remove('hidden');
  onVoiceSubmitCallback = onComplete;

  voiceSeconds = 0;
  if (timer) timer.textContent = '0:00';
  if (transcript) transcript.textContent = 'Escuchando tu voz... Habla con naturalidad.';

  // Iniciar temporizador
  if (voiceTimerInterval) clearInterval(voiceTimerInterval);
  voiceTimerInterval = setInterval(() => {
    voiceSeconds++;
    const mins = Math.floor(voiceSeconds / 60);
    const secs = String(voiceSeconds % 60).padStart(2, '0');
    if (timer) timer.textContent = `${mins}:${secs}`;
  }, 1000);

  // Iniciar SpeechRecognition si está soportado en el navegador
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      voiceRecognitionInstance = new SpeechRecognition();
      voiceRecognitionInstance.lang = 'es-ES';
      voiceRecognitionInstance.continuous = true;
      voiceRecognitionInstance.interimResults = true;

      voiceRecognitionInstance.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript && transcript) {
          transcript.textContent = currentTranscript;
        }
      };

      voiceRecognitionInstance.onerror = (e) => {
        console.warn('SpeechRecognition error:', e);
        if (transcript && transcript.textContent.includes('Escuchando')) {
          transcript.textContent = 'Programar sesión de gimnasio hoy a las 21:00';
        }
      };

      voiceRecognitionInstance.start();
    } catch (e) {
      console.warn('SpeechRecognition no pudo iniciarse:', e);
      if (transcript) transcript.textContent = 'Programar sesión de gimnasio hoy a las 21:00';
    }
  } else {
    // Demostración de alta fidelidad según mockup e rgr er .jpeg
    setTimeout(() => {
      if (transcript) transcript.textContent = 'Programar sesión de gimnasio hoy a las 21:00';
    }, 1500);
  }

  function closeVoice() {
    capsule.classList.add('hidden');
    if (voiceTimerInterval) clearInterval(voiceTimerInterval);
    if (voiceRecognitionInstance) {
      try { voiceRecognitionInstance.stop(); } catch(e) {}
    }
  }

  if (btnCancel) {
    btnCancel.onclick = closeVoice;
  }

  if (btnSubmit) {
    btnSubmit.onclick = () => {
      const text = transcript ? transcript.textContent : '';
      closeVoice();
      if (onVoiceSubmitCallback && text && !text.includes('Escuchando')) {
        onVoiceSubmitCallback(text);
      } else if (text && !text.includes('Escuchando')) {
        // Enviar al input principal
        if (inputText) {
          inputText.value = text;
          if (btnSubmitText) btnSubmitText.click();
        }
      }
    };
  }
}

function setupVoiceDictation() {
  const btnVoiceCancel = document.getElementById('btnVoiceCancel');
  if (btnVoiceCancel) {
    btnVoiceCancel.onclick = () => {
      const capsule = document.getElementById('voiceDictationCapsule');
      if (capsule) capsule.classList.add('hidden');
      if (voiceTimerInterval) clearInterval(voiceTimerInterval);
    };
  }
}

// -------------------------------------------------------------
// BOTÓN FLOTANTE CENTRAL (+) Y ACCIONES RÁPIDAS
// -------------------------------------------------------------
function setupQuickActionSheet() {
  const btnDockAdd = document.getElementById('btnDockAdd');
  const dialogQuickActionSheet = document.getElementById('dialogQuickActionSheet');
  const btnCloseQuickActionSheet = document.getElementById('btnCloseQuickActionSheet');
  const btnActionOpenAssistant = document.getElementById('btnActionOpenAssistant');
  const btnActionNewEvent = document.getElementById('btnActionNewEvent');
  const btnActionNewTask = document.getElementById('btnActionNewTask');
  const btnActionNewNote = document.getElementById('btnActionNewNote');
  const btnActionVoiceDictate = document.getElementById('btnActionVoiceDictate');

  if (btnDockAdd && dialogQuickActionSheet) {
    btnDockAdd.addEventListener('click', () => {
      openModalAccessible(dialogQuickActionSheet);
    });
  }

  if (btnCloseQuickActionSheet && dialogQuickActionSheet) {
    btnCloseQuickActionSheet.addEventListener('click', () => {
      dialogQuickActionSheet.close();
    });
  }

  if (btnActionOpenAssistant) {
    btnActionOpenAssistant.addEventListener('click', () => {
      dialogQuickActionSheet.close();
      document.querySelector('.view-tab[data-target="viewAssistant"]')?.click();
      const chatInput = document.getElementById('chatInputText');
      if (chatInput) chatInput.focus();
    });
  }

  if (btnActionNewEvent) {
    btnActionNewEvent.addEventListener('click', () => {
      dialogQuickActionSheet.close();
      openEventModal();
    });
  }

  if (btnActionNewTask) {
    btnActionNewTask.addEventListener('click', () => {
      dialogQuickActionSheet.close();
      taskModalId.value = '';
      taskModalTitle.value = '';
      taskModalCategory.value = 'General';
      taskModalPriority.value = 'media';
      taskModalDueDate.value = '';
      taskModalHeading.innerHTML = `${ICONS.pencil} Nueva Tarea`;
      openModalAccessible(dialogTaskModal);
    });
  }

  if (btnActionNewNote) {
    btnActionNewNote.addEventListener('click', () => {
      dialogQuickActionSheet.close();
      noteModalId.value = '';
      noteModalContent.value = '';
      noteModalHeading.innerHTML = `${ICONS.bulb} Nueva Idea o Nota`;
      openModalAccessible(dialogNoteModal);
    });
  }

  if (btnActionVoiceDictate) {
    btnActionVoiceDictate.addEventListener('click', () => {
      dialogQuickActionSheet.close();
      openVoiceDictationCapsule((text) => {
        document.querySelector('.view-tab[data-target="viewAssistant"]')?.click();
        const chatInput = document.getElementById('chatInputText');
        if (chatInput) {
          chatInput.value = text;
          document.getElementById('btnChatSend')?.click();
        }
      });
    });
  }
}

// -------------------------------------------------------------
// Registro en el Store y Actualizaciones Globales
// -------------------------------------------------------------
storage.subscribe(() => {
  renderHome();
  renderTasks();
  if (currentTasksViewMode === 'kanban') {
    renderKanban();
  }
  renderNotes();
  renderHistory();
  updateSyncBadge();
});

// Limpieza forzada destructiva removida para proteger datos de usuarios.

if (btnClearAllTasks) {
  btnClearAllTasks.addEventListener('click', () => {
    showConfirmDialog('Vaciar Tareas', '¿Deseas eliminar todas las tareas de la lista y el tablero?', 'Vaciar Todo', () => {
      storage.clearAllTasks();
      showToast('Todas las tareas han sido eliminadas', 3000, 'info');
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

// Cierre accesible de modales al pulsar en el fondo exterior (Light Dismiss)
const dialogQuickActionSheet = document.getElementById('dialogQuickActionSheet');
[dialogSettings, dialogTaskModal, dialogEventModal, dialogNoteModal, dialogConfirmModal, dialogQuickActionSheet].forEach(dlg => {
  if (!dlg) return;
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) {
      dlg.close();
    }
  });
});

updateSyncBadge();
renderHome();
renderTasks();
setTaskViewMode(currentTasksViewMode);
renderNotes();
renderHistory();
renderColorPalette();
setupChatAssistant();
setupVoiceDictation();
setupQuickActionSheet();

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
