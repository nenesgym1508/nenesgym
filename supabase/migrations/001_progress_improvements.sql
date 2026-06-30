-- ============================================================
-- MIGRACIÓN 001: Mejoras a progress_records + tabla progress_goals
-- Aplicar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Agregar columnas a progress_records
ALTER TABLE progress_records
  ADD COLUMN IF NOT EXISTS waist_cm FLOAT,
  ADD COLUMN IF NOT EXISTS measured_date DATE,
  ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT 'client';

-- 2. Backfill measured_date desde recorded_at en zona horaria Bogotá
UPDATE progress_records
SET measured_date = (recorded_at AT TIME ZONE 'America/Bogota')::date
WHERE measured_date IS NULL;

-- 3. Una vez rellenado, poner NOT NULL + DEFAULT para futuros registros
ALTER TABLE progress_records
  ALTER COLUMN measured_date SET NOT NULL,
  ALTER COLUMN measured_date SET DEFAULT ((now() AT TIME ZONE 'America/Bogota')::date);

-- 4. Índice por cliente + fecha para el upsert diario
CREATE INDEX IF NOT EXISTS idx_progress_records_client_date
  ON progress_records (client_id, measured_date DESC);

-- ============================================================
-- Tabla: progress_goals
-- ============================================================
CREATE TABLE IF NOT EXISTS progress_goals (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID        NOT NULL REFERENCES gyms(id),
  client_id      UUID        NOT NULL REFERENCES clients(id),
  goal_type      TEXT        NOT NULL CHECK (goal_type IN (
                   'gain_muscle','lose_fat','maintain',
                   'improve_strength','improve_consistency','general_health')),
  target_weight_kg      FLOAT,
  target_attendance_days INT,
  start_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  end_date       DATE,
  status         TEXT        NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active','completed','cancelled')),
  created_by     TEXT        NOT NULL DEFAULT 'client',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- índice para buscar objetivo activo de un cliente
CREATE INDEX IF NOT EXISTS idx_progress_goals_client_active
  ON progress_goals (client_id, status)
  WHERE status = 'active';

-- ============================================================
-- RLS: progress_records (nuevas columnas, policies existentes se mantienen)
-- ============================================================
-- Solo aplicar si las policies no existen todavía
DO $$
BEGIN
  -- Verificar si ya existe RLS habilitado (lo está desde el inicio)
  -- Las nuevas columnas no requieren cambios en policies existentes
  NULL;
END $$;

-- ============================================================
-- RLS: progress_goals
-- ============================================================
ALTER TABLE progress_goals ENABLE ROW LEVEL SECURITY;

-- Cliente lee sus propios objetivos
CREATE POLICY "client_select_own_goals"
  ON progress_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = progress_goals.client_id
        AND clients.profile_id = auth.uid()
    )
  );

-- Cliente inserta sus propios objetivos
CREATE POLICY "client_insert_own_goals"
  ON progress_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = progress_goals.client_id
        AND clients.profile_id = auth.uid()
    )
    AND gym_id = (SELECT current_gym_id())
  );

-- Cliente actualiza sus propios objetivos
CREATE POLICY "client_update_own_goals"
  ON progress_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = progress_goals.client_id
        AND clients.profile_id = auth.uid()
    )
  );

-- Admin del gym puede todo
CREATE POLICY "admin_all_goals"
  ON progress_goals FOR ALL
  USING (
    gym_id = (SELECT current_gym_id())
    AND (SELECT is_admin())
  )
  WITH CHECK (
    gym_id = (SELECT current_gym_id())
    AND (SELECT is_admin())
  );
