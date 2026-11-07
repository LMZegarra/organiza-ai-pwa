-- Esquema de Tablas para OrganizaAI PWA (Supabase Postgres)
-- Copia y pega este script en el Editor SQL de tu proyecto en Supabase (https://supabase.com)

-- 1. Tabla de Tareas (tasks)
CREATE TABLE IF NOT EXISTS organiza_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja')),
  category TEXT DEFAULT 'General',
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultar por estado y fecha de vencimiento
CREATE INDEX IF NOT EXISTS idx_organiza_tasks_due_date ON organiza_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_organiza_tasks_completed ON organiza_tasks(completed);

-- 2. Tabla de Eventos de Calendario (calendar_events)
CREATE TABLE IF NOT EXISTS organiza_events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsqueda rápida por fecha de evento
CREATE INDEX IF NOT EXISTS idx_organiza_events_date ON organiza_events(event_date);

-- 3. Tabla de Notas / Ideas Clave
CREATE TABLE IF NOT EXISTS organiza_notes (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar Seguridad a Nivel de Fila (RLS) y Políticas para Acceso Anónimo con Anon Key
ALTER TABLE organiza_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE organiza_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organiza_notes ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura pública con la Anon Key (para uso personal o compartido)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a usuarios anonimos en tareas') THEN
    CREATE POLICY "Permitir todo a usuarios anonimos en tareas" ON organiza_tasks FOR ALL USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a usuarios anonimos en eventos') THEN
    CREATE POLICY "Permitir todo a usuarios anonimos en eventos" ON organiza_events FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir todo a usuarios anonimos en notas') THEN
    CREATE POLICY "Permitir todo a usuarios anonimos en notas" ON organiza_notes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Habilitar Publicación en Tiempo Real (Replication) para suscripciones WebSockets
ALTER PUBLICATION supabase_realtime ADD TABLE organiza_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE organiza_events;
ALTER PUBLICATION supabase_realtime ADD TABLE organiza_notes;
