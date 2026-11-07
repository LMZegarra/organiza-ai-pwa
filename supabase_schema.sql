-- Esquema de Tablas para OrganizaAI PWA (Supabase Postgres)
-- Copia y pega este script en el Editor SQL de tu proyecto en Supabase (https://supabase.com)

-- 1. Tabla de Tareas (tasks)
CREATE TABLE IF NOT EXISTS organiza_tasks (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  priority TEXT DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja')),
  category TEXT DEFAULT 'General',
  due_date DATE,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columna user_id en tablas preexistentes
ALTER TABLE organiza_tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Índices para consultar por usuario, estado y fecha de vencimiento
CREATE INDEX IF NOT EXISTS idx_organiza_tasks_user_id ON organiza_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_organiza_tasks_due_date ON organiza_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_organiza_tasks_completed ON organiza_tasks(completed);

-- 2. Tabla de Eventos de Calendario (calendar_events)
CREATE TABLE IF NOT EXISTS organiza_events (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columna user_id en tablas preexistentes
ALTER TABLE organiza_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- Índices para búsqueda rápida por usuario y fecha de evento
CREATE INDEX IF NOT EXISTS idx_organiza_events_user_id ON organiza_events(user_id);
CREATE INDEX IF NOT EXISTS idx_organiza_events_date ON organiza_events(event_date);

-- 3. Tabla de Notas / Ideas Clave
CREATE TABLE IF NOT EXISTS organiza_notes (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Asegurar columna user_id en tablas preexistentes
ALTER TABLE organiza_notes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_organiza_notes_user_id ON organiza_notes(user_id);

-- 4. Habilitar Seguridad a Nivel de Fila (RLS) Estricta por Usuario
ALTER TABLE organiza_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE organiza_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE organiza_notes ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores si existían
DROP POLICY IF EXISTS "Permitir todo a usuarios anonimos en tareas" ON organiza_tasks;
DROP POLICY IF EXISTS "Permitir todo a usuarios anonimos en eventos" ON organiza_events;
DROP POLICY IF EXISTS "Permitir todo a usuarios anonimos en notas" ON organiza_notes;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan sus tareas" ON organiza_tasks;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan sus eventos" ON organiza_events;
DROP POLICY IF EXISTS "Usuarios autenticados gestionan sus notas" ON organiza_notes;

-- Políticas de aislamiento total por usuario (siguiendo directrices de seguridad Supabase)
CREATE POLICY "Usuarios autenticados gestionan sus tareas" ON organiza_tasks
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Usuarios autenticados gestionan sus eventos" ON organiza_events
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Usuarios autenticados gestionan sus notas" ON organiza_notes
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- 5. Habilitar Publicación en Tiempo Real (Replication) para suscripciones WebSockets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'organiza_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organiza_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'organiza_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organiza_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'organiza_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE organiza_notes;
  END IF;
END $$;
