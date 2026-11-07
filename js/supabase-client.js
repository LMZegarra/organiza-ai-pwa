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

  // ---- MÉTODOS DE AUTENTICACIÓN (SUPABASE AUTH) ----
  async getCurrentUser() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return null;
      return user;
    } catch {
      return null;
    }
  },

  async getSession() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data: { session }, error } = await client.auth.getSession();
      if (error || !session) return null;
      return session;
    } catch {
      return null;
    }
  },

  async signUp(email, password) {
    const client = this.getClient();
    if (!client) throw new Error('Cliente de Supabase no inicializado');
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const client = this.getClient();
    if (!client) throw new Error('Cliente de Supabase no inicializado');
    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password: password
    });
    if (error) throw error;
    return data;
  },

  async signInWithOtp(email) {
    const client = this.getClient();
    if (!client) throw new Error('Cliente de Supabase no inicializado');
    const { data, error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.origin
      }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = this.getClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    const client = this.getClient();
    if (!client) return null;
    return client.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },

  async fetchAllRemote() {
    const client = this.getClient();
    if (!client) return null;

    try {
      const user = await this.getCurrentUser();
      // Si no hay usuario autenticado, conservamos los datos locales sin pisar
      if (!user) return null;

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
          status: t.status || (t.completed ? 'completed' : 'pending'),
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
          color: e.color || null,
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
      const user = await this.getCurrentUser();
      const payload = {
        id: task.id,
        title: task.title,
        priority: task.priority,
        category: task.category,
        due_date: task.due_date,
        completed: task.completed,
        status: task.status || (task.completed ? 'completed' : 'pending'),
        updated_at: new Date().toISOString()
      };
      if (user) {
        payload.user_id = user.id;
      }
      const { error } = await client.from('organiza_tasks').upsert(payload);
      if (error && payload.status) {
        // Fallback si la columna status aún no existe en Supabase
        delete payload.status;
        await client.from('organiza_tasks').upsert(payload);
      }
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
      const user = await this.getCurrentUser();
      const payload = {
        id: event.id,
        title: event.title,
        event_date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.location,
        description: event.description,
        updated_at: new Date().toISOString()
      };
      if (event.color) {
        payload.color = event.color;
      }
      if (user) {
        payload.user_id = user.id;
      }
      const { error } = await client.from('organiza_events').upsert(payload);
      if (error && payload.color) {
        // Fallback si la columna color aún no existe en Supabase
        delete payload.color;
        await client.from('organiza_events').upsert(payload);
      }
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
      const user = await this.getCurrentUser();
      const payload = {
        id: note.id,
        content: note.content || note.text,
        created_at: note.created_at || new Date().toISOString()
      };
      if (user) {
        payload.user_id = user.id;
      }
      await client.from('organiza_notes').upsert(payload);
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
