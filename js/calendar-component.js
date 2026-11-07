/**
 * calendar-component.js
 * Componente híbrido: Calendario mensual interactivo arriba + Agenda del día seleccionado abajo.
 */

import { storage } from './storage-service.js';

export class CalendarComponent {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentDate = new Date();
    this.selectedDate = new Date(); // Fecha seleccionada por defecto: Hoy
    this.init();
  }

  init() {
    this.render();
    // Suscribirse a cambios en el almacenamiento para refrescar el calendario en vivo
    storage.subscribe(() => {
      this.render();
    });
  }

  formatDateISO(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.render();
  }

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.render();
  }

  selectDate(year, month, day) {
    this.selectedDate = new Date(year, month, day);
    this.render();
  }

  render() {
    if (!this.container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthTitle = `${monthNames[month]} ${year}`;

    // Obtener eventos y tareas para colocar indicadores
    const allEvents = storage.getEvents();
    const allTasks = storage.getTasks();

    // Mapas de fechas con eventos y tareas
    const eventsByDate = new Set(allEvents.map(e => e.date));
    const tasksByDate = new Set(allTasks.filter(t => t.due_date).map(t => t.due_date));

    // Cálculos de días del mes
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Lunes = 0
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const todayISO = this.formatDateISO(new Date());
    const selectedISO = this.formatDateISO(this.selectedDate);

    let daysHtml = '';

    // Días del mes previo
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      daysHtml += `<div class="cal-day other-month">${dayNum}</div>`;
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateISO === todayISO ? 'today' : '';
      const isSelected = dateISO === selectedISO ? 'selected' : '';
      const hasEvents = eventsByDate.has(dateISO);
      const hasTasks = tasksByDate.has(dateISO);

      let dotsHtml = '';
      if (hasEvents || hasTasks) {
        dotsHtml = `
          <div class="cal-dots">
            ${hasEvents ? '<span class="dot dot-event" title="Eventos"></span>' : ''}
            ${hasTasks ? '<span class="dot dot-task" title="Tareas"></span>' : ''}
          </div>
        `;
      }

      daysHtml += `
        <button class="cal-day ${isToday} ${isSelected}" data-year="${year}" data-month="${month}" data-day="${d}" type="button">
          <span class="day-number">${d}</span>
          ${dotsHtml}
        </button>
      `;
    }

    // Días restantes para completar las semanas en la cuadrícula
    const totalCells = firstDayIndex + totalDays;
    const remainingDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingDays; i++) {
      daysHtml += `<div class="cal-day other-month">${i}</div>`;
    }

    // Agenda del día seleccionado
    const dayEvents = allEvents.filter(e => e.date === selectedISO);
    const dayTasks = allTasks.filter(t => t.due_date === selectedISO);

    const selectedFormatted = this.selectedDate.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let agendaHtml = '';
    if (dayEvents.length === 0 && dayTasks.length === 0) {
      agendaHtml = `
        <div class="empty-agenda">
          <p>No hay eventos ni tareas programadas para este día.</p>
        </div>
      `;
    } else {
      if (dayEvents.length > 0) {
        agendaHtml += `<h4 class="agenda-subtitle">📅 Eventos y Citas</h4><ul class="agenda-events-list">`;
        dayEvents.sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00')).forEach(ev => {
          const timeLabel = ev.start_time ? (ev.end_time ? `${ev.start_time} - ${ev.end_time}` : `${ev.start_time}`) : 'Todo el día';
          agendaHtml += `
            <li class="agenda-event-item">
              <div class="event-time-badge">${timeLabel}</div>
              <div class="event-details">
                <strong>${ev.title}</strong>
                ${ev.location ? `<div class="event-location">📍 ${ev.location}</div>` : ''}
                ${ev.description ? `<p class="event-desc">${ev.description}</p>` : ''}
              </div>
              <div class="event-actions" style="display:flex; align-items:center; gap:4px;">
                <button class="btn-icon-action btn-edit-event" data-id="${ev.id}" title="Editar evento">✏️</button>
                <button class="btn-icon-danger btn-delete-event" data-id="${ev.id}" title="Eliminar evento">🗑️</button>
              </div>
            </li>
          `;
        });
        agendaHtml += `</ul>`;
      }

      if (dayTasks.length > 0) {
        agendaHtml += `<h4 class="agenda-subtitle" style="margin-top:14px;">✅ Tareas para este día</h4><ul class="agenda-tasks-list">`;
        dayTasks.forEach(tk => {
          agendaHtml += `
            <li class="agenda-task-item ${tk.completed ? 'completed' : ''}">
              <input type="checkbox" class="agenda-task-chk" data-id="${tk.id}" ${tk.completed ? 'checked' : ''}>
              <span class="task-title" style="flex:1;">${tk.title}</span>
              <span class="task-priority priority-${tk.priority}">${tk.priority}</span>
              <button class="btn-icon-danger btn-delete-agenda-task" data-id="${tk.id}" title="Eliminar tarea">🗑️</button>
            </li>
          `;
        });
        agendaHtml += `</ul>`;
      }
    }

    // Renderizado completo
    this.container.innerHTML = `
      <div class="calendar-wrapper">
        <!-- Panel del Mes (Izquierda en Desktop) -->
        <div class="calendar-month-pane">
          <div class="calendar-header">
            <button id="btnPrevMonth" class="cal-nav-btn" aria-label="Mes anterior">&larr;</button>
            <div class="cal-title-group">
              <h3 class="calendar-title">${monthTitle}</h3>
              <button id="btnCalToday" class="cal-today-btn">Hoy</button>
            </div>
            <button id="btnNextMonth" class="cal-nav-btn" aria-label="Mes siguiente">&rarr;</button>
          </div>

          <!-- Días de la semana -->
          <div class="cal-weekdays">
            <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
          </div>

          <!-- Grilla mensual -->
          <div class="cal-grid">
            ${daysHtml}
          </div>
        </div>

        <!-- Agenda del día seleccionado (Derecha en Desktop) -->
        <div class="agenda-section">
          <div class="agenda-header">
            <div>
              <span class="agenda-badge">Agenda Seleccionada</span>
              <h3 class="agenda-title">${selectedFormatted}</h3>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button id="btnAddManualEvent" class="btn btn-sm btn-outline">+ Evento</button>
              <button id="btnClearAllEvents" class="btn-link" style="font-size:0.75rem; color:var(--text-muted);">Vaciar agenda</button>
            </div>
          </div>
          <div class="agenda-content">
            ${agendaHtml}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    this.container.querySelector('#btnPrevMonth')?.addEventListener('click', () => this.prevMonth());
    this.container.querySelector('#btnNextMonth')?.addEventListener('click', () => this.nextMonth());
    this.container.querySelector('#btnCalToday')?.addEventListener('click', () => this.goToToday());

    // Clicks en días
    this.container.querySelectorAll('.cal-day:not(.other-month)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget;
        const y = parseInt(el.dataset.year);
        const m = parseInt(el.dataset.month);
        const d = parseInt(el.dataset.day);
        this.selectDate(y, m, d);
      });
    });

    // Editar evento desde la agenda
    this.container.querySelectorAll('.btn-edit-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        if (window.openEventModal) {
          window.openEventModal(id);
        }
      });
    });

    // Eliminar evento con diálogo estilizado
    this.container.querySelectorAll('.btn-delete-event').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const doDelete = () => {
          storage.deleteEvent(id);
          if (window.showToast) window.showToast('🗑️ Evento eliminado', 3000);
        };

        if (window.showConfirmDialog) {
          window.showConfirmDialog('🗑️ Eliminar Evento', '¿Deseas eliminar este evento del calendario?', 'Eliminar', doDelete);
        } else if (confirm('¿Deseas eliminar este evento?')) {
          doDelete();
        }
      });
    });

    // Vaciar todos los eventos de la agenda con diálogo estilizado
    this.container.querySelector('#btnClearAllEvents')?.addEventListener('click', () => {
      const doClear = () => {
        storage.clearAllEvents();
        if (window.showToast) window.showToast('🗑️ Todos los eventos han sido eliminados', 3000);
      };

      if (window.showConfirmDialog) {
        window.showConfirmDialog('🗑️ Vaciar Calendario', '¿Deseas vaciar todos los eventos del calendario?', 'Vaciar Todo', doClear);
      } else if (confirm('¿Deseas vaciar todos los eventos del calendario?')) {
        doClear();
      }
    });

    // Toggle tarea en agenda
    this.container.querySelectorAll('.agenda-task-chk').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.currentTarget.dataset.id;
        storage.toggleTask(id);
      });
    });

    // Eliminar tarea desde la agenda con diálogo estilizado
    this.container.querySelectorAll('.btn-delete-agenda-task').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const doDeleteTask = () => {
          storage.deleteTask(id);
          if (window.showToast) window.showToast('🗑️ Tarea eliminada', 3000);
        };

        if (window.showConfirmDialog) {
          window.showConfirmDialog('🗑️ Eliminar Tarea', '¿Deseas eliminar esta tarea?', 'Eliminar', doDeleteTask);
        } else if (confirm('¿Deseas eliminar esta tarea?')) {
          doDeleteTask();
        }
      });
    });

    // Añadir evento con modal nativo de alto contraste
    this.container.querySelector('#btnAddManualEvent')?.addEventListener('click', () => {
      if (window.openEventModal) {
        window.openEventModal(null, this.formatDateISO(this.selectedDate));
      }
    });
  }
}
