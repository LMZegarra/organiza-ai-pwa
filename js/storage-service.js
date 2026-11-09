/**
 * storage-service.js
 * Almacenamiento local-first con sincronización automática a Supabase y cola de borrado offline (anti-zombies).
 */

import { SupabaseService } from './supabase-client.js';

export const EVENT_PALETTE = [
  { hex: '#2563eb', name: 'Azul Real' },
  { hex: '#10b981', name: 'Verde Esmeralda' },
  { hex: '#f59e0b', name: 'Ámbar Dorado' },
  { hex: '#ef4444', name: 'Rojo Coral' },
  { hex: '#8b5cf6', name: 'Violeta' },
  { hex: '#ec4899', name: 'Rosa Fucsia' },
  { hex: '#06b6d4', name: 'Cian Turquesa' },
  { hex: '#84cc16', name: 'Verde Lima' },
  { hex: '#6366f1', name: 'Azul Índigo' },
  { hex: '#ea580c', name: 'Naranja Intenso' }
];

export const EVENT_COLORS = EVENT_PALETTE.map(c => c.hex);

export function getNextAvailableEventColor(date, existingEvents = [], currentEventId = null) {
  if (!date) return EVENT_COLORS[0];
  const sameDateEvents = existingEvents.filter(e => e.date === date && e.id !== currentEventId);
  const usedColors = new Set(sameDateEvents.map(e => (e.color || '').toLowerCase()).filter(Boolean));
  const available = EVENT_COLORS.find(c => !usedColors.has(c.toLowerCase()));
  if (available) return available;
  return EVENT_COLORS[sameDateEvents.length % EVENT_COLORS.length];
}

const STORAGE_KEYS = {
  TASKS: 'organiza_local_tasks',
  EVENTS: 'organiza_local_events',
  NOTES: 'organiza_local_notes',
  HISTORY: 'organiza_local_history',
  PENDING_DELETIONS: 'organiza_pending_deletions',
  CURRENT_USER_ID: 'organiza_current_user_id'
};

class StorageService {
  constructor() {
    this.listeners = new Set();
    this.init();
  }

  init() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[Storage] Dispositivo volvió a estar online. Sincronizando pendientes...');
        this.syncWithCloud();
      });
    }

    if (SupabaseService.isConfigured()) {
      this.syncWithCloud();
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  // ---- COLA DE ELIMINACIONES OFFLINE (Evita resurrección de datos) ----
  getPendingDeletions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_DELETIONS) || '[]');
    } catch {
      return [];
    }
  }

  addPendingDeletion(type, id) {
    const list = this.getPendingDeletions();
    if (!list.some(item => item.type === type && item.id === id)) {
      list.push({ type, id, timestamp: Date.now() });
      localStorage.setItem(STORAGE_KEYS.PENDING_DELETIONS, JSON.stringify(list));
    }
  }

  removePendingDeletion(type, id) {
    let list = this.getPendingDeletions();
    list = list.filter(item => !(item.type === type && item.id === id));
    localStorage.setItem(STORAGE_KEYS.PENDING_DELETIONS, JSON.stringify(list));
  }

  async flushPendingDeletions() {
    const pending = this.getPendingDeletions();
    if (!pending.length || !SupabaseService.isConfigured()) return;

    for (const item of pending) {
      try {
        if (item.type === 'task') await SupabaseService.deleteTask(item.id);
        else if (item.type === 'event') await SupabaseService.deleteEvent(item.id);
        else if (item.type === 'note') await SupabaseService.deleteNote(item.id);
        this.removePendingDeletion(item.type, item.id);
      } catch (err) {
        console.warn(`[Storage] No se pudo purgar eliminación de ${item.type} ${item.id}:`, err);
      }
    }
  }

  async syncWithCloud() {
    if (!SupabaseService.isConfigured()) return;

    try {
      const user = await SupabaseService.getCurrentUser();
      if (!user) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
        return; // Si no hay sesión activa, mantener en almacenamiento local seguro
      }

      const lastUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      const isNewUserSession = !lastUserId || lastUserId !== user.id;

      if (isNewUserSession) {
        // Si inició sesión un usuario nuevo o cambió de cuenta,
        // limpiar datos residuales en el navegador para que no contaminen la nueva cuenta.
        this.clearLocalDataOnLogout();
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, user.id);
      }

      // 1. Purgar eliminaciones pendientes antes de traer datos remotos
      await this.flushPendingDeletions();

      // 2. Traer datos remotos del usuario desde Supabase (garantizado vacío para cuentas nuevas por RLS)
      const remote = await SupabaseService.fetchAllRemote();
      if (!remote) return;

      // Filtrar elementos remotos que sigan pendientes de eliminación local
      const pendingDeletions = new Set(this.getPendingDeletions().map(d => `${d.type}_${d.id}`));

      const cleanTasks = Array.isArray(remote.tasks)
        ? remote.tasks.filter(t => !pendingDeletions.has(`task_${t.id}`))
        : [];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(cleanTasks));

      const cleanEvents = Array.isArray(remote.calendar_events)
        ? remote.calendar_events.filter(e => !pendingDeletions.has(`event_${e.id}`))
        : [];
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(cleanEvents));

      const cleanNotes = Array.isArray(remote.notes)
        ? remote.notes.filter(n => !pendingDeletions.has(`note_${n.id}`))
        : [];
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(cleanNotes));

      this.notify();

      // 3. Suscribirse a cambios en tiempo real
      SupabaseService.setupRealtime((type, payload) => {
        this.handleRealtimeEvent(type, payload);
      });
    } catch (err) {
      console.warn('Error en syncWithCloud:', err);
    }
  }

  handleRealtimeEvent(type, payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    console.log(`[Realtime Sync] ${type} -> ${eventType}`);

    if (type === 'task') {
      let tasks = this.getTasks();
      const normalizeTask = (t) => ({
        ...t,
        status: t.status || (t.completed ? 'completed' : 'pending')
      });
      if (eventType === 'INSERT') {
        if (!tasks.some(t => t.id === newRecord.id)) tasks.unshift(normalizeTask(newRecord));
      } else if (eventType === 'UPDATE') {
        tasks = tasks.map(t => t.id === newRecord.id ? normalizeTask({ ...t, ...newRecord }) : t);
      } else if (eventType === 'DELETE') {
        tasks = tasks.filter(t => t.id !== oldRecord.id);
      }
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } else if (type === 'event') {
      let events = this.getEvents();
      if (eventType === 'INSERT') {
        const mapped = {
          id: newRecord.id,
          title: newRecord.title,
          date: newRecord.event_date,
          start_time: newRecord.start_time,
          end_time: newRecord.end_time,
          location: newRecord.location,
          description: newRecord.description,
          color: newRecord.color || getNextAvailableEventColor(newRecord.event_date, events, newRecord.id)
        };
        if (!events.some(e => e.id === mapped.id)) events.push(mapped);
      } else if (eventType === 'UPDATE') {
        events = events.map(e => e.id === newRecord.id ? {
          ...e,
          title: newRecord.title,
          date: newRecord.event_date,
          start_time: newRecord.start_time,
          end_time: newRecord.end_time,
          location: newRecord.location,
          description: newRecord.description,
          color: newRecord.color || e.color || '#2563eb'
        } : e);
      } else if (eventType === 'DELETE') {
        events = events.filter(e => e.id !== oldRecord.id);
      }
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    } else if (type === 'note') {
      let notes = this.getNotes();
      if (eventType === 'INSERT') {
        if (!notes.some(n => n.id === newRecord.id)) notes.unshift(newRecord);
      } else if (eventType === 'DELETE') {
        notes = notes.filter(n => n.id !== oldRecord.id);
      }
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    }

    this.notify();
  }

  // ---- TAREAS ----
  getTasks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
      return parsed.map(t => {
        if (!t.status) {
          t.status = t.completed ? 'completed' : 'pending';
        }
        return t;
      });
    } catch {
      return [];
    }
  }

  saveTask(task, notify = true) {
    const tasks = this.getTasks();
    if (!task.status) {
      task.status = task.completed ? 'completed' : 'pending';
    }
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = { ...tasks[existingIndex], ...task };
    } else {
      tasks.unshift(task);
    }
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    if (notify) this.notify();
    SupabaseService.syncTask(task);
  }

  toggleTask(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      task.status = task.completed ? 'completed' : 'pending';
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      this.notify();
      SupabaseService.syncTask(task);
    }
  }

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.addPendingDeletion('task', id);
    this.notify();
    SupabaseService.deleteTask(id).then(() => {
      this.removePendingDeletion('task', id);
    }).catch(err => {
      console.warn('Eliminación remota pendiente offline (tarea):', err);
    });
  }

  clearAllTasks() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    this.notify();
    const client = SupabaseService.getClient();
    if (client) {
      SupabaseService.getCurrentUser().then(user => {
        if (user) {
          client.from('organiza_tasks').delete().eq('user_id', user.id).then(() => {});
        }
      });
    }
  }

  // ---- EVENTOS DE CALENDARIO ----
  getEvents() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
      return parsed.map((e, idx) => {
        if (!e.color) {
          e.color = EVENT_COLORS[idx % EVENT_COLORS.length];
        }
        return e;
      });
    } catch {
      return [];
    }
  }

  saveEvent(event, notify = true) {
    const events = this.getEvents();
    if (!event.color) {
      event.color = getNextAvailableEventColor(event.date, events, event.id);
    }
    const existingIndex = events.findIndex(e => e.id === event.id);
    if (existingIndex >= 0) {
      events[existingIndex] = { ...events[existingIndex], ...event, updated_at: new Date().toISOString() };
    } else {
      events.push(event);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    if (notify) this.notify();
    SupabaseService.syncEvent(event);
  }

  deleteEvent(id) {
    let events = this.getEvents();
    events = events.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.addPendingDeletion('event', id);
    this.notify();
    SupabaseService.deleteEvent(id).then(() => {
      this.removePendingDeletion('event', id);
    }).catch(err => {
      console.warn('Eliminación remota pendiente offline (evento):', err);
    });
  }

  clearAllEvents() {
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    this.notify();
    const client = SupabaseService.getClient();
    if (client) {
      SupabaseService.getCurrentUser().then(user => {
        if (user) {
          client.from('organiza_events').delete().eq('user_id', user.id).then(() => {});
        }
      });
    }
  }

  // ---- NOTAS / IDEAS ----
  getNotes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]');
    } catch {
      return [];
    }
  }

  clearAllNotes() {
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    this.notify();
    const client = SupabaseService.getClient();
    if (client) {
      SupabaseService.getCurrentUser().then(user => {
        if (user) {
          client.from('organiza_notes').delete().eq('user_id', user.id).then(() => {});
        }
      });
    }
  }

  saveNote(note, notify = true) {
    const notes = this.getNotes();
    const existingIndex = notes.findIndex(n => n.id === note.id);
    if (existingIndex >= 0) {
      notes[existingIndex] = { ...notes[existingIndex], ...note, updated_at: new Date().toISOString() };
    } else {
      notes.unshift({
        ...note,
        created_at: note.created_at || new Date().toISOString()
      });
    }
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    if (notify) this.notify();
    SupabaseService.syncNote(note);
  }

  updateNote(id, newContent) {
    const notes = this.getNotes();
    const note = notes.find(n => n.id === id);
    if (note) {
      note.content = newContent;
      note.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
      this.notify();
      SupabaseService.syncNote(note);
    }
  }

  deleteNote(id) {
    let notes = this.getNotes();
    notes = notes.filter(n => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    this.addPendingDeletion('note', id);
    this.notify();
    SupabaseService.deleteNote(id).then(() => {
      this.removePendingDeletion('note', id);
    }).catch(err => {
      console.warn('Eliminación remota pendiente offline (nota):', err);
    });
  }

  // ---- PROCESAMIENTO BATCH DESDE IA ----
  addBatchFromAI(aiResult, originalText = '') {
    const timestamp = Date.now();
    const createdTasks = [];
    const createdEvents = [];
    const createdNotes = [];

    // 1. Tareas
    if (Array.isArray(aiResult.tasks)) {
      const currentTasks = this.getTasks();
      aiResult.tasks.forEach((t, i) => {
        const taskObj = {
          id: `task_${timestamp}_${i}`,
          title: t.title,
          priority: t.priority || 'media',
          category: t.category || 'General',
          due_date: t.due_date || null,
          status: 'pending',
          completed: false,
          created_at: new Date().toISOString()
        };
        createdTasks.push(taskObj);
        currentTasks.unshift(taskObj);
      });
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(currentTasks));
      if (createdTasks.length > 0) {
        SupabaseService.syncTasksBulk(createdTasks);
      }
    }

    // 2. Eventos de Calendario (colores distintos por día)
    if (Array.isArray(aiResult.calendar_events)) {
      const allEvents = [...this.getEvents()];
      aiResult.calendar_events.forEach((e, i) => {
        const assignedColor = e.color || getNextAvailableEventColor(e.date, allEvents);
        const eventObj = {
          id: `event_${timestamp}_${i}`,
          title: e.title,
          date: e.date,
          start_time: e.start_time || null,
          end_time: e.end_time || null,
          location: e.location || '',
          description: e.description || '',
          color: assignedColor,
          created_at: new Date().toISOString()
        };
        allEvents.push(eventObj);
        createdEvents.push(eventObj);
      });
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(allEvents));
      if (createdEvents.length > 0) {
        SupabaseService.syncEventsBulk(createdEvents);
      }
    }

    // 3. Notas
    if (Array.isArray(aiResult.notes)) {
      const currentNotes = this.getNotes();
      aiResult.notes.forEach((n, i) => {
        const noteObj = {
          id: `note_${timestamp}_${i}`,
          content: typeof n === 'string' ? n : (n.content || JSON.stringify(n)),
          created_at: new Date().toISOString()
        };
        createdNotes.push(noteObj);
        currentNotes.unshift(noteObj);
      });
      localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(currentNotes));
      if (createdNotes.length > 0) {
        SupabaseService.syncNotesBulk(createdNotes);
      }
    }

    // Emitir una sola notificación para actualizar la interfaz de golpe
    this.notify();

    // 4. Historial
    try {
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
      history.unshift({
        id: timestamp,
        date: new Date().toLocaleString(),
        rawText: originalText,
        summary: aiResult.summary || '',
        tasksCount: (aiResult.tasks || []).length,
        eventsCount: (aiResult.calendar_events || []).length,
        notesCount: (aiResult.notes || []).length
      });
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history.slice(0, 50)));
    } catch (e) {
      console.warn('Error guardando en historial:', e);
    }
  }

  clearLocalDataOnLogout() {
    localStorage.removeItem(STORAGE_KEYS.TASKS);
    localStorage.removeItem(STORAGE_KEYS.EVENTS);
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    localStorage.removeItem(STORAGE_KEYS.PENDING_DELETIONS);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    this.notify();
  }
}

export const storage = new StorageService();
