/**
 * supabase-client.js
 * Cliente de integración con Supabase para sincronización en tiempo real.
 */

import { APP_CONFIG } from './config.js';

let supabaseInstance = null;
let realtimeChannel = null;

export const SupabaseService = {
  getUrl() {
    return localStorage.getItem('supabase_url') || APP_CONFIG.SUPABASE_URL || '';
  },

  getAnonKey() {
    return localStorage.getItem('supabase_anon_key') || APP_CONFIG.SUPABASE_ANON_KEY || '';
  },

  isConfigured() {
    const url = this.getUrl();
    const key = this.getAnonKey();
    return Boolean(url && key && url.includes('supabase.co') && key.length > 20);
  },

  getClient() {
    if (supabaseInstance) return supabaseInstance;

    const url = this.getUrl();
    const key = this.getAnonKey();

    if (!url || !key) return null;

    try {
      if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        supabaseInstance = window.supabase.createClient(url.trim(), key.trim());
        return supabaseInstance;
      }
    } catch (e) {
      console.warn('Error inicializando cliente de Supabase:', e);
    }
    return null;
  },

  resetClient() {
    if (realtimeChannel && supabaseInstance) {
      supabaseInstance.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    supabaseInstance = null;
  },

  async testConnection(url, key) {
    const u = url || this.getUrl();
    const k = key || this.getAnonKey();

    if (!u || !k) throw new Error('Debes ingresar la URL y la Anon Key de Supabase');
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('La librería de Supabase aún no se ha cargado en el navegador');
    }

    const testClient = window.supabase.createClient(u.trim(), k.trim());
    const { data, error } = await testClient.from('organiza_tasks').select('id').limit(1);
    if (error) {
      throw new Error(`Error de conexión con Supabase: ${error.message}`);
    }
    return true;
  },

  async fetchAllRemote() {
    const client = this.getClient();
    if (!client) return null;

    try {
      const [tasksRes, eventsRes, notesRes] = await Promise.all([
        client.from('organiza_tasks').select('*').order('created_at', { ascending: false }),
        client.from('organiza_events').select('*').order('event_date', { ascending: true }),
        client.from('organiza_notes').select('*').order('created_at', { ascending: false })
      ]);

      return {
        tasks: tasksRes.data ? tasksRes.data.map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          category: t.category,
          due_date: t.due_date,
          completed: t.completed,
          created_at: t.created_at
        })) : [],
        calendar_events: eventsRes.data ? eventsRes.data.map(e => ({
          id: e.id,
          title: e.title,
          date: e.event_date,
          start_time: e.start_time,
          end_time: e.end_time,
          location: e.location,
          description: e.description,
          created_at: e.created_at
        })) : [],
        notes: notesRes.data ? notesRes.data.map(n => ({
          id: n.id,
          content: n.content,
          created_at: n.created_at
        })) : []
      };
    } catch (err) {
      console.error('Error obteniendo datos remotos de Supabase:', err);
      return null;
    }
  },

  async syncTask(task) {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.from('organiza_tasks').upsert({
        id: task.id,
        title: task.title,
        priority: task.priority,
        category: task.category,
        due_date: task.due_date,
        completed: task.completed,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Fallo syncTask:', e);
    }
  },

  async deleteTask(id) {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.from('organiza_tasks').delete().eq('id', id);
    } catch (e) {
      console.warn('Fallo deleteTask:', e);
    }
  },

  async syncEvent(event) {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.from('organiza_events').upsert({
        id: event.id,
        title: event.title,
        event_date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        description: event.description,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Fallo syncEvent:', e);
    }
  },

  async deleteEvent(id) {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.from('organiza_events').delete().eq('id', id);
    } catch (e) {
      console.warn('Fallo deleteEvent:', e);
    }
  },

  async syncNote(note) {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.from('organiza_notes').upsert({
        id: note.id,
        content: note.content || note.text,
        created_at: note.created_at || new Date().toISOString()
      });
    } catch (e) {
      console.warn('Fallo syncNote:', e);
    }
  },

  async deleteNote(id) {
    const client = this.getClient();
    if (!client) return;
    try {
      await client.from('organiza_notes').delete().eq('id', id);
    } catch (e) {
      console.warn('Fallo deleteNote:', e);
    }
  },

  setupRealtime(onRemoteChange) {
    const client = this.getClient();
    if (!client) return;

    if (realtimeChannel) {
      client.removeChannel(realtimeChannel);
    }

    realtimeChannel = client
      .channel('organiza-realtime-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organiza_tasks' }, (payload) => {
        onRemoteChange('task', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organiza_events' }, (payload) => {
        onRemoteChange('event', payload);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'organiza_notes' }, (payload) => {
        onRemoteChange('note', payload);
      })
      .subscribe((status) => {
        console.log('[Supabase Realtime] Estado canal:', status);
      });
  }
};
