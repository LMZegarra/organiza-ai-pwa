/**
 * calendar-component.js
 * Componente híbrido: Calendario mensual interactivo arriba + Agenda del día seleccionado abajo.
 */

import { storage } from './storage-service.js';
import { ICONS } from './icons.js';

export class CalendarComponent {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentDate = new Date();
    this.selectedDate = new Date(); // Fecha seleccionada por defecto: Hoy
    this.viewMode = 'month'; // 'month' o 'week'
    this.touchStartX = 0;
    this.touchStartY = 0;
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

  escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  prevMonth() {
    this.prevPeriod();
  }

  nextMonth() {
    this.nextPeriod();
  }

  prevPeriod() {
    if (this.viewMode === 'month') {
      this.currentDate.setDate(1);
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    } else {
      this.selectedDate.setDate(this.selectedDate.getDate() - 7);
      this.currentDate = new Date(this.selectedDate);
    }
    this.render();
  }

  nextPeriod() {
    if (this.viewMode === 'month') {
      this.currentDate.setDate(1);
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    } else {
      this.selectedDate.setDate(this.selectedDate.getDate() + 7);
      this.currentDate = new Date(this.selectedDate);
    }
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.selectedDate = new Date();
    this.render();
  }

  selectDate(year, month, day) {
    this.selectedDate = new Date(year, month, day);
    this.currentDate = new Date(year, month, day);
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

    // Agrupar eventos por fecha para pintar cada puntito con su color correspondiente
    const eventsByDateMap = new Map();
    allEvents.forEach(ev => {
      if (!ev.date) return;
      if (!eventsByDateMap.has(ev.date)) {
        eventsByDateMap.set(ev.date, []);
      }
      eventsByDateMap.get(ev.date).push(ev);
    });

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
      daysHtml += `
        <div class="cal-day other-month" aria-hidden="true">
          <div class="cal-day-header">
            <span class="day-number">${dayNum}</span>
          </div>
        </div>
      `;
    }

    // Días del mes actual
    for (let d = 1; d <= totalDays; d++) {
      const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateISO === todayISO ? 'today' : '';
      const isSelected = dateISO === selectedISO ? 'selected' : '';
      const dayEvList = eventsByDateMap.get(dateISO) || [];
      const dayTasksList = allTasks.filter(t => t.due_date === dateISO && !t.completed);
      const hasEvents = dayEvList.length > 0;
      const hasTasks = dayTasksList.length > 0;

      // Desktop/tablet event pills
      let eventPillsHtml = '';
      if (hasEvents) {
        const maxPills = 2;
        dayEvList.slice(0, maxPills).forEach(ev => {
          const c = ev.color || '#3b82f6';
          const timePrefix = ev.start_time ? `<span class="chip-time">${ev.start_time}</span>` : '';
          eventPillsHtml += `
            <div class="cal-event-chip" style="--chip-color: ${c};" title="${this.escapeHtml((ev.start_time ? ev.start_time + ' ' : '') + ev.title)}">
              <span class="chip-color-bar" style="background-color: ${c};"></span>
              ${timePrefix}
              <span class="chip-text">${this.escapeHtml(ev.title)}</span>
            </div>
          `;
        });
        if (dayEvList.length > maxPills) {
          eventPillsHtml += `<div class="cal-more-chip">+${dayEvList.length - maxPills} más</div>`;
        }
      }

      if (hasTasks) {
        eventPillsHtml += `
          <div class="cal-task-chip" title="${dayTasksList.length} tareas pendientes">
            <span class="task-chip-icon">${ICONS.checkSquare}</span>
            <span class="task-chip-text">${dayTasksList.length} tarea${dayTasksList.length > 1 ? 's' : ''}</span>
          </div>
        `;
      }

      // Mobile compact dots
      let mobileDotsHtml = '';
      if (hasEvents || hasTasks) {
        dayEvList.slice(0, 3).forEach(ev => {
          const c = ev.color || '#3b82f6';
          mobileDotsHtml += `<span class="dot dot-event" style="background-color: ${c};"></span>`;
        });
        if (hasTasks) {
          mobileDotsHtml += `<span class="dot dot-task"></span>`;
        }
      }

      daysHtml += `
        <button class="cal-day ${isToday} ${isSelected}" data-year="${year}" data-month="${month}" data-day="${d}" type="button" aria-label="${d} de ${monthNames[month]} de ${year}" ${isToday ? 'aria-current="date"' : ''}>
          <div class="cal-day-header">
            <span class="day-number">${d}</span>
            ${isToday ? '<span class="today-badge">Hoy</span>' : ''}
          </div>
          <div class="cal-cell-body">
            <div class="cal-desktop-pills">${eventPillsHtml}</div>
            <div class="cal-mobile-dots" aria-hidden="true">${mobileDotsHtml}</div>
          </div>
        </button>
      `;
    }

    // Días restantes para completar las semanas en la cuadrícula
    const totalCells = firstDayIndex + totalDays;
    const remainingDays = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingDays; i++) {
      daysHtml += `
        <div class="cal-day other-month" aria-hidden="true">
          <div class="cal-day-header">
            <span class="day-number">${i}</span>
          </div>
        </div>
      `;
    }

    let mainViewHtml = '';
    let currentPeriodTitle = monthTitle;

    if (this.viewMode === 'week') {
      // Calcular la semana de la fecha seleccionada
      const curr = new Date(this.selectedDate);
      const dayOfWeek = (curr.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
      const monday = new Date(curr);
      monday.setDate(curr.getDate() - dayOfWeek);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const monMonth = monthNames[monday.getMonth()];
      const sunMonth = monthNames[sunday.getMonth()];
      if (monday.getMonth() === sunday.getMonth()) {
        currentPeriodTitle = `${monday.getDate()} - ${sunday.getDate()} ${monMonth} ${monday.getFullYear()}`;
      } else {
        currentPeriodTitle = `${monday.getDate()} ${monMonth} - ${sunday.getDate()} ${sunMonth} ${sunday.getFullYear()}`;
      }

      const weekDayAbbrs = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
      let weekCardsHtml = '';

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = this.formatDateISO(d);
        const isToday = iso === todayISO ? 'today' : '';
        const isSelected = iso === selectedISO ? 'selected' : '';
        const dayEvList = eventsByDateMap.get(iso) || [];
        const dayTasksList = allTasks.filter(t => t.due_date === iso && !t.completed);

        let dayActivitiesHtml = '';
        if (dayEvList.length === 0 && dayTasksList.length === 0) {
          dayActivitiesHtml = `<span class="week-empty-day">Sin actividades</span>`;
        } else {
          dayEvList.forEach(ev => {
            const c = ev.color || '#2563eb';
            dayActivitiesHtml += `
              <div class="week-activity-pill event" style="--ev-c: ${c};" title="${this.escapeHtml(ev.title)}">
                <span class="activity-dot" style="background: ${c};"></span>
                <span class="activity-time">${ev.start_time || 'Todo el día'}</span>
                <span class="activity-title">${this.escapeHtml(ev.title)}</span>
              </div>
            `;
          });
          dayTasksList.forEach(tk => {
            dayActivitiesHtml += `
              <div class="week-activity-pill task" title="${this.escapeHtml(tk.title)}">
                <span class="activity-dot dot-task"></span>
                <span class="activity-title">${this.escapeHtml(tk.title)}</span>
              </div>
            `;
          });
        }

        weekCardsHtml += `
          <button class="cal-week-card ${isToday} ${isSelected}" data-date-iso="${iso}" type="button" aria-label="${d.getDate()} de ${monthNames[d.getMonth()]}">
            <div class="week-card-header">
              <span class="week-card-weekday">${weekDayAbbrs[i]}</span>
              <span class="week-card-num">${d.getDate()}</span>
              ${isToday ? '<span class="today-tag">Hoy</span>' : ''}
            </div>
            <div class="week-card-body">
              ${dayActivitiesHtml}
            </div>
          </button>
        `;
      }

      mainViewHtml = `
        <div class="cal-week-grid">
          ${weekCardsHtml}
        </div>
      `;
    } else {
      mainViewHtml = `
        <!-- Días de la semana -->
        <div class="cal-weekdays">
          <span>Lun</span><span>Mar</span><span>Mié</span><span>Jue</span><span>Vie</span><span>Sáb</span><span>Dom</span>
        </div>

        <!-- Grilla mensual -->
        <div class="cal-grid">
          ${daysHtml}
        </div>
      `;
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
          <div class="empty-agenda-icon" aria-hidden="true">${ICONS.calendar}</div>
          <p class="empty-agenda-title">Sin actividades programadas</p>
          <p class="empty-agenda-text">No tienes citas ni tareas registradas para esta fecha.</p>
          <button id="btnEmptyAddEvent" class="btn btn-sm btn-outline btn-empty-cta" type="button">
            ${ICONS.plus} Añadir evento para esta fecha
          </button>
        </div>
      `;
    } else {
      if (dayEvents.length > 0) {
        agendaHtml += `<h4 class="agenda-subtitle">${ICONS.calendar} Eventos y Citas</h4><ul class="agenda-events-list">`;
        dayEvents.sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00')).forEach(ev => {
          const timeLabel = ev.start_time ? (ev.end_time ? `${ev.start_time} - ${ev.end_time}` : `${ev.start_time}`) : 'Todo el día';
          const evColor = ev.color || '#2563eb';
          agendaHtml += `
            <li class="agenda-event-item" style="border-left-color: ${evColor};">
              <div class="event-time-badge" style="background-color: ${evColor}18; color: ${evColor}; border: 1px solid ${evColor}40;">
                <span class="event-badge-dot" style="background-color: ${evColor};" aria-hidden="true"></span>
                ${this.escapeHtml(timeLabel)}
              </div>
              <div class="event-details">
                <strong>${this.escapeHtml(ev.title)}</strong>
                ${ev.location ? `<div class="event-location">${ICONS.mapPin} ${this.escapeHtml(ev.location)}</div>` : ''}
                ${ev.description ? `<p class="event-desc">${this.escapeHtml(ev.description)}</p>` : ''}
              </div>
              <div class="event-actions" style="display:flex; align-items:center; gap:4px;">
                <button class="btn-icon-action btn-edit-event" data-id="${ev.id}" title="Editar evento" aria-label="Editar evento">${ICONS.edit}</button>
                <button class="btn-icon-danger btn-delete-event" data-id="${ev.id}" title="Eliminar evento" aria-label="Eliminar evento">${ICONS.trash}</button>
              </div>
            </li>
          `;
        });
        agendaHtml += `</ul>`;
      }

      if (dayTasks.length > 0) {
        agendaHtml += `<h4 class="agenda-subtitle" style="margin-top:14px;">${ICONS.checkSquare} Tareas para este día</h4><ul class="agenda-tasks-list">`;
        dayTasks.forEach(tk => {
          agendaHtml += `
            <li class="agenda-task-item ${tk.completed ? 'completed' : ''}">
              <input type="checkbox" class="agenda-task-chk" data-id="${tk.id}" ${tk.completed ? 'checked' : ''} aria-label="Marcar tarea como completada">
              <span class="task-title" style="flex:1;">${this.escapeHtml(tk.title)}</span>
              <span class="task-priority priority-${tk.priority}">${this.escapeHtml(tk.priority)}</span>
              <button class="btn-icon-danger btn-delete-agenda-task" data-id="${tk.id}" title="Eliminar tarea" aria-label="Eliminar tarea">${ICONS.trash}</button>
            </li>
          `;
        });
        agendaHtml += `</ul>`;
      }
    }

    // Renderizado completo
    this.container.innerHTML = `
      <div class="calendar-wrapper">
        <!-- Panel del Mes/Semana (Columna Principal Izquierda en Desktop) -->
        <div class="calendar-month-pane">
          <div class="calendar-header">
            <div class="cal-title-wrap">
              <h3 class="calendar-title">${currentPeriodTitle}</h3>
              <div class="cal-view-toggle-group" role="group" aria-label="Modo de vista">
                <button id="btnCalModeMonth" class="cal-view-toggle-btn ${this.viewMode === 'month' ? 'active' : ''}" type="button">Mes</button>
                <button id="btnCalModeWeek" class="cal-view-toggle-btn ${this.viewMode === 'week' ? 'active' : ''}" type="button">Semana</button>
              </div>
            </div>
            <div class="cal-header-controls">
              <div class="cal-nav-cluster" role="group" aria-label="Navegación del periodo">
                <button id="btnPrevMonth" class="cal-nav-btn" aria-label="Periodo anterior" title="Periodo anterior">${ICONS.arrowLeft}</button>
                <button id="btnCalToday" class="cal-today-btn" type="button">Hoy</button>
                <button id="btnNextMonth" class="cal-nav-btn" aria-label="Periodo siguiente" title="Periodo siguiente">${ICONS.arrowRight}</button>
              </div>
              <button id="btnAddManualEvent" class="btn btn-sm btn-primary cal-add-event-btn" title="Crear nuevo evento">
                ${ICONS.plus} <span class="cal-add-event-text">Evento</span>
              </button>
            </div>
          </div>

          ${mainViewHtml}
        </div>

        <!-- Agenda del día seleccionado (Inspector Lateral Derecho en Desktop) -->
        <div class="agenda-section">
          <div class="agenda-header">
            <div>
              <span class="agenda-badge">Agenda Seleccionada</span>
              <h3 class="agenda-title">${selectedFormatted}</h3>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <button id="btnClearAllEvents" class="btn-link" style="font-size:0.75rem; color:var(--text-muted);">Vaciar agenda</button>
            </div>
          </div>
          <div class="agenda-content">
            ${agendaHtml}
          </div>
        </div>
      </div>
    `;

    // Asignar listeners del componente
    this.attachEventListeners();
  }

  attachEventListeners() {
    const prevBtn = this.container.querySelector('#btnPrevMonth');
    const nextBtn = this.container.querySelector('#btnNextMonth');
    const todayBtn = this.container.querySelector('#btnCalToday');
    const btnModeMonth = this.container.querySelector('#btnCalModeMonth');
    const btnModeWeek = this.container.querySelector('#btnCalModeWeek');

    if (prevBtn) prevBtn.onclick = () => this.prevPeriod();
    if (nextBtn) nextBtn.onclick = () => this.nextPeriod();
    if (todayBtn) todayBtn.onclick = () => this.goToToday();

    if (btnModeMonth) {
      btnModeMonth.onclick = () => {
        this.viewMode = 'month';
        this.render();
      };
    }

    if (btnModeWeek) {
      btnModeWeek.onclick = () => {
        this.viewMode = 'week';
        this.render();
      };
    }

    // Touch Swipe en el panel del calendario
    const pane = this.container.querySelector('.calendar-month-pane');
    if (pane) {
      pane.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches[0]) {
          this.touchStartX = e.touches[0].clientX;
          this.touchStartY = e.touches[0].clientY;
        }
      }, { passive: true });

      pane.addEventListener('touchend', (e) => {
        if (e.changedTouches && e.changedTouches[0]) {
          const deltaX = e.changedTouches[0].clientX - this.touchStartX;
          const deltaY = Math.abs(e.changedTouches[0].clientY - this.touchStartY);
          if (Math.abs(deltaX) > 45 && deltaY < 40) {
            if (deltaX < 0) {
              this.nextPeriod();
            } else {
              this.prevPeriod();
            }
          }
        }
      }, { passive: true });
    }

    // Click en días de la vista semanal
    const weekCards = this.container.querySelectorAll('.cal-week-card');
    weekCards.forEach(card => {
      card.onclick = () => {
        const iso = card.dataset.dateIso;
        if (iso) {
          const [y, m, d] = iso.split('-').map(Number);
          this.selectDate(y, m - 1, d);
        }
      };
    });

    // Click en días del mes
    const dayButtons = this.container.querySelectorAll('.cal-day:not(.other-month)');
    dayButtons.forEach(btn => {
      btn.onclick = () => {
        const y = parseInt(btn.dataset.year, 10);
        const m = parseInt(btn.dataset.month, 10);
        const d = parseInt(btn.dataset.day, 10);
        this.selectDate(y, m, d);
      };
    });

    // Checkbox de tareas en la agenda diaria
    const taskCheckboxes = this.container.querySelectorAll('.agenda-task-chk');
    taskCheckboxes.forEach(chk => {
      chk.onchange = (e) => {
        const id = e.target.dataset.id;
        storage.toggleTask(id);
      };
    });

    // Botón eliminar tarea desde la agenda
    const deleteAgendaTaskBtns = this.container.querySelectorAll('.btn-delete-agenda-task');
    deleteAgendaTaskBtns.forEach(btn => {
      btn.onclick = (e) => {
        const id = btn.dataset.id;
        if (typeof window.showConfirmDialog === 'function') {
          window.showConfirmDialog('Eliminar Tarea', '¿Deseas eliminar esta tarea de la agenda y de la lista?', 'Eliminar', () => {
            storage.deleteTask(id);
            if (typeof window.showToast === 'function') window.showToast('Tarea eliminada');
          });
        } else {
          storage.deleteTask(id);
        }
      };
    });

    // Botón abrir modal para crear evento manual
    const btnAddManual = this.container.querySelector('#btnAddManualEvent');
    if (btnAddManual) {
      btnAddManual.onclick = () => {
        if (typeof window.openNewEventModalForDate === 'function') {
          window.openNewEventModalForDate(this.formatDateISO(this.selectedDate));
        }
      };
    }

    const btnEmptyAdd = this.container.querySelector('#btnEmptyAddEvent');
    if (btnEmptyAdd) {
      btnEmptyAdd.onclick = () => {
        if (typeof window.openNewEventModalForDate === 'function') {
          window.openNewEventModalForDate(this.formatDateISO(this.selectedDate));
        }
      };
    }

    // Botones de edición de eventos en la agenda
    const editEventBtns = this.container.querySelectorAll('.btn-edit-event');
    editEventBtns.forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (typeof window.openEditEventModal === 'function') {
          window.openEditEventModal(id);
        }
      };
    });

    // Botones de eliminación de eventos en la agenda
    const deleteEventBtns = this.container.querySelectorAll('.btn-delete-event');
    deleteEventBtns.forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        if (typeof window.showConfirmDialog === 'function') {
          window.showConfirmDialog('Eliminar Evento', '¿Estás seguro de eliminar este evento de tu agenda?', 'Eliminar', () => {
            storage.deleteEvent(id);
            if (typeof window.showToast === 'function') window.showToast('Evento eliminado');
          });
        } else {
          storage.deleteEvent(id);
        }
      };
    });

    // Botón vaciar todos los eventos de la agenda seleccionada
    const clearEventsBtn = this.container.querySelector('#btnClearAllEvents');
    if (clearEventsBtn) {
      clearEventsBtn.onclick = () => {
        if (typeof window.showConfirmDialog === 'function') {
          window.showConfirmDialog('Vaciar Eventos', '¿Deseas eliminar todos los eventos de tu agenda en Supabase y local?', 'Vaciar Todo', () => {
            storage.clearAllEvents();
            if (typeof window.showToast === 'function') window.showToast('Agenda vaciada');
          });
        } else {
          storage.clearAllEvents();
        }
      };
    }
  }
}
