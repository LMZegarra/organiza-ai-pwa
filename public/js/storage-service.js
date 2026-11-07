/**
 * storage-service.js
 * Almacenamiento local-first con sincronización automática a Supabase.
 */

import { SupabaseService } from './supabase-client.js';

const STORAGE_KEYS = {
  TASKS: 'organiza_local_tasks',
  EVENTS: 'organiza_local_events',
  NOTES: 'organiza_local_notes',
  HISTORY: 'organiza_local_history'
};

class StorageService {
  constructor() {
    this.listeners = new Set();
    this.init();
  }

  init() {
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

  async syncWithCloud() {
    if (!SupabaseService.isConfigured()) return;

    try {
      const user = await SupabaseService.getCurrentUser();
      if (!user) return; // Si no hay sesión activa, mantener en almacenamiento local seguro

      // 1. Subir elementos locales a la cuenta de usuario en Supabase
      const localTasks = this.getTasks();
      for (const t of localTasks) {
        SupabaseService.syncTask(t);
      }
      const localEvents = this.getEvents();
      for (const e of localEvents) {
        SupabaseService.syncEvent(e);
      }
      const localNotes = this.getNotes();
      for (const n of localNotes) {
        SupabaseService.syncNote(n);
      }

      // 2. Traer datos remotos del usuario
      const remote = await SupabaseService.fetchAllRemote();
      if (!remote) return;

      if (remote.tasks && remote.tasks.length > 0) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(remote.tasks));
      }
      if (remote.calendar_events && remote.calendar_events.length > 0) {
        localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(remote.calendar_events));
      }
      if (remote.notes && remote.notes.length > 0) {
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(remote.notes));
      }

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
      if (eventType === 'INSERT') {
        if (!tasks.some(t => t.id === newRecord.id)) tasks.unshift(newRecord);
      } else if (eventType === 'UPDATE') {
        tasks = tasks.map(t => t.id === newRecord.id ? { ...t, ...newRecord } : t);
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
          description: newRecord.description
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
          description: newRecord.description
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
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
    } catch {
      return [];
    }
  }

  saveTask(task) {
    const tasks = this.getTasks();
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      tasks[existingIndex] = { ...tasks[existingIndex], ...task };
    } else {
      tasks.unshift(task);
    }
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.notify();
    SupabaseService.syncTask(task);
  }

  toggleTask(id) {
    const tasks = this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      this.notify();
      SupabaseService.syncTask(task);
    }
  }

  deleteTask(id) {
    let tasks = this.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    this.notify();
    SupabaseService.deleteTask(id);
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
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]');
    } catch {
      return [];
    }
  }

  saveEvent(event) {
    const events = this.getEvents();
    const existingIndex = events.findIndex(e => e.id === event.id);
    if (existingIndex >= 0) {
      events[existingIndex] = { ...events[existingIndex], ...event };
    } else {
      events.push(event);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify();
    SupabaseService.syncEvent(event);
  }

  deleteEvent(id) {
    let events = this.getEvents();
    events = events.filter(e => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify();
    SupabaseService.deleteEvent(id);
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

  saveNote(note) {
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
    this.notify();
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
    this.notify();
    SupabaseService.deleteNote(id);
  }

  // ---- PROCESAMIENTO BATCH DESDE IA ----
  addBatchFromAI(aiResult, originalText = '') {
    const timestamp = Date.now();

    // 1. Tareas
    if (Array.isArray(aiResult.tasks)) {
      aiResult.tasks.forEach((t, i) => {
        this.saveTask({
          id: `task_${timestamp}_${i}`,
          title: t.title,
          priority: t.priority || 'media',
          category: t.category || 'General',
          due_date: t.due_date || null,
          completed: false,
          created_at: new Date().toISOString()
        });
      });
    }

    // 2. Eventos de Calendario
    if (Array.isArray(aiResult.calendar_events)) {
      aiResult.calendar_events.forEach((e, i) => {
        this.saveEvent({
          id: `event_${timestamp}_${i}`,
          title: e.title,
          date: e.date,
          start_time: e.start_time || null,
          end_time: e.end_time || null,
          location: e.location || '',
          description: e.description || '',
          created_at: new Date().toISOString()
        });
      });
    }

    // 3. Notas
    if (Array.isArray(aiResult.notes)) {
      aiResult.notes.forEach((n, i) => {
        this.saveNote({
          id: `note_${timestamp}_${i}`,
          content: typeof n === 'string' ? n : (n.content || JSON.stringify(n)),
          created_at: new Date().toISOString()
        });
      });
    }

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
}

export const storage = new StorageService();
