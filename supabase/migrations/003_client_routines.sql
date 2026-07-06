-- ============================================================
-- MIGRACIÓN 003: Módulo Rutinas — rutinas personales de cliente,
--               días, bloques, ejercicios, plantillas y sesiones
-- Aplicar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- Tabla: client_routines
-- ============================================================
CREATE TABLE IF NOT EXISTS client_routines (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id           UUID        NOT NULL REFERENCES gyms(id),
  client_id        UUID        REFERENCES clients(id),
  created_by       UUID        REFERENCES auth.users(id),
  created_by_role  TEXT        CHECK (created_by_role IN ('admin','client')),
  title            TEXT        NOT NULL,
  description      TEXT,
  goal             TEXT        CHECK (goal IN (
                      'fuerza','hipertrofia','cardio',
                      'tecnica','movilidad','full_body','general')),
  level            TEXT        CHECK (level IN (
                      'general','principiante','intermedio','avanzado')),
  days_per_week    INT,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('draft','active','paused','completed','archived')),
  source_type      TEXT        CHECK (source_type IN ('custom','template','class','client_created')),
  source_id        UUID,
  start_date       DATE,
  end_date         DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT client_routines_client_required_unless_draft
    CHECK (client_id IS NOT NULL OR (created_by_role = 'admin' AND status = 'draft'))
);

CREATE INDEX IF NOT EXISTS idx_client_routines_gym_client ON client_routines (gym_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_routines_client_status ON client_routines (client_id, status);

-- ============================================================
-- Tabla: client_routine_days
-- ============================================================
CREATE TABLE IF NOT EXISTS client_routine_days (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id  UUID  NOT NULL REFERENCES client_routines(id) ON DELETE CASCADE,
  title       TEXT  NOT NULL,
  weekday     TEXT  CHECK (weekday IS NULL OR weekday IN ('lun','mar','mie','jue','vie','sab','dom')),
  position    INT   NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_client_routine_days_routine ON client_routine_days (routine_id, position);

-- ============================================================
-- Tabla: client_routine_blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS client_routine_blocks (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_day_id  UUID  NOT NULL REFERENCES client_routine_days(id) ON DELETE CASCADE,
  title           TEXT  NOT NULL,
  position        INT   NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_client_routine_blocks_day ON client_routine_blocks (routine_day_id, position);

-- ============================================================
-- Tabla: client_routine_exercises
-- ============================================================
CREATE TABLE IF NOT EXISTS client_routine_exercises (
  id                UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id          UUID  NOT NULL REFERENCES client_routine_blocks(id) ON DELETE CASCADE,
  exercise_id       UUID  NOT NULL REFERENCES exercises(id),
  position          INT   NOT NULL DEFAULT 0,
  sets              INT,
  reps              INT,
  duration_seconds  INT,
  rest_seconds      INT,
  suggested_weight  TEXT,
  notes             TEXT
);
CREATE INDEX IF NOT EXISTS idx_client_routine_exercises_block ON client_routine_exercises (block_id, position);

-- ============================================================
-- Tabla: client_routine_sessions ("marcar hecho hoy" / historial)
-- ============================================================
CREATE TABLE IF NOT EXISTS client_routine_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id          UUID        NOT NULL REFERENCES gyms(id),
  client_id       UUID        NOT NULL REFERENCES clients(id),
  routine_id      UUID        NOT NULL REFERENCES client_routines(id) ON DELETE CASCADE,
  routine_day_id  UUID        REFERENCES client_routine_days(id),
  session_date    DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','skipped')),
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Una sola sesión por día por rutina (permite upsert onConflict).
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_routine_sessions_one_per_day
  ON client_routine_sessions (routine_id, session_date);
CREATE INDEX IF NOT EXISTS idx_client_routine_sessions_client_date
  ON client_routine_sessions (client_id, session_date DESC);

-- ============================================================
-- Tabla: routine_templates (plantillas reutilizables, admin-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS routine_templates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID        NOT NULL REFERENCES gyms(id),
  name           TEXT        NOT NULL,
  description    TEXT,
  goal           TEXT        CHECK (goal IN (
                    'fuerza','hipertrofia','cardio',
                    'tecnica','movilidad','full_body','general')),
  level          TEXT        CHECK (level IN (
                    'general','principiante','intermedio','avanzado')),
  days_per_week  INT,
  notes          TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_routine_templates_gym_active ON routine_templates (gym_id, is_active);

CREATE TABLE IF NOT EXISTS routine_template_days (
  id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID  NOT NULL REFERENCES routine_templates(id) ON DELETE CASCADE,
  title        TEXT  NOT NULL,
  weekday      TEXT  CHECK (weekday IS NULL OR weekday IN ('lun','mar','mie','jue','vie','sab','dom')),
  position     INT   NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_routine_template_days_template ON routine_template_days (template_id, position);

CREATE TABLE IF NOT EXISTS routine_template_blocks (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  template_day_id UUID  NOT NULL REFERENCES routine_template_days(id) ON DELETE CASCADE,
  title           TEXT  NOT NULL,
  position        INT   NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_routine_template_blocks_day ON routine_template_blocks (template_day_id, position);

CREATE TABLE IF NOT EXISTS routine_template_block_exercises (
  id                 UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  template_block_id  UUID  NOT NULL REFERENCES routine_template_blocks(id) ON DELETE CASCADE,
  exercise_id        UUID  NOT NULL REFERENCES exercises(id),
  position           INT   NOT NULL DEFAULT 0,
  sets               INT,
  reps               INT,
  duration_seconds   INT,
  rest_seconds       INT,
  suggested_weight   TEXT,
  notes              TEXT
);
CREATE INDEX IF NOT EXISTS idx_routine_template_block_exercises_block ON routine_template_block_exercises (template_block_id, position);


ALTER TABLE client_routines                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_routine_days             ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_routine_blocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_routine_exercises        ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_routine_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_templates                ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_template_days            ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_template_blocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_template_block_exercises ENABLE ROW LEVEL SECURITY;

-- ── client_routines ──────────────────────────────────────────
CREATE POLICY "admin_all_client_routines" ON client_routines FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

CREATE POLICY "client_select_own_or_assigned_routines" ON client_routines FOR SELECT
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routines.client_id AND clients.profile_id = auth.uid()));

CREATE POLICY "client_insert_own_routines" ON client_routines FOR INSERT
  WITH CHECK (
    created_by_role = 'client' AND created_by = auth.uid()
    AND gym_id = (SELECT current_gym_id())
    AND EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routines.client_id AND clients.profile_id = auth.uid())
  );

CREATE POLICY "client_update_own_routines" ON client_routines FOR UPDATE
  USING (created_by_role = 'client' AND EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routines.client_id AND clients.profile_id = auth.uid()))
  WITH CHECK (created_by_role = 'client' AND EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routines.client_id AND clients.profile_id = auth.uid()));

CREATE POLICY "client_delete_own_routines" ON client_routines FOR DELETE
  USING (created_by_role = 'client' AND EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routines.client_id AND clients.profile_id = auth.uid()));

-- ── client_routine_days ──────────────────────────────────────
CREATE POLICY "admin_all_client_routine_days" ON client_routine_days FOR ALL
  USING (EXISTS (SELECT 1 FROM client_routines cr WHERE cr.id = client_routine_days.routine_id AND cr.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM client_routines cr WHERE cr.id = client_routine_days.routine_id AND cr.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())));

CREATE POLICY "client_select_own_or_assigned_routine_days" ON client_routine_days FOR SELECT
  USING (EXISTS (SELECT 1 FROM client_routines cr JOIN clients c ON c.id = cr.client_id WHERE cr.id = client_routine_days.routine_id AND c.profile_id = auth.uid()));

CREATE POLICY "client_insert_own_routine_days" ON client_routine_days FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM client_routines cr JOIN clients c ON c.id = cr.client_id WHERE cr.id = client_routine_days.routine_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

CREATE POLICY "client_update_own_routine_days" ON client_routine_days FOR UPDATE
  USING (EXISTS (SELECT 1 FROM client_routines cr JOIN clients c ON c.id = cr.client_id WHERE cr.id = client_routine_days.routine_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM client_routines cr JOIN clients c ON c.id = cr.client_id WHERE cr.id = client_routine_days.routine_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

CREATE POLICY "client_delete_own_routine_days" ON client_routine_days FOR DELETE
  USING (EXISTS (SELECT 1 FROM client_routines cr JOIN clients c ON c.id = cr.client_id WHERE cr.id = client_routine_days.routine_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

-- ── client_routine_blocks (mismo patrón, un nivel más abajo) ─
CREATE POLICY "admin_all_client_routine_blocks" ON client_routine_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id WHERE crd.id = client_routine_blocks.routine_day_id AND cr.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id WHERE crd.id = client_routine_blocks.routine_day_id AND cr.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())));

CREATE POLICY "client_select_own_or_assigned_routine_blocks" ON client_routine_blocks FOR SELECT
  USING (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crd.id = client_routine_blocks.routine_day_id AND c.profile_id = auth.uid()));

CREATE POLICY "client_insert_own_routine_blocks" ON client_routine_blocks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crd.id = client_routine_blocks.routine_day_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

CREATE POLICY "client_update_own_routine_blocks" ON client_routine_blocks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crd.id = client_routine_blocks.routine_day_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crd.id = client_routine_blocks.routine_day_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

CREATE POLICY "client_delete_own_routine_blocks" ON client_routine_blocks FOR DELETE
  USING (EXISTS (SELECT 1 FROM client_routine_days crd JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crd.id = client_routine_blocks.routine_day_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

-- ── client_routine_exercises (mismo patrón, un nivel más abajo) ─
CREATE POLICY "admin_all_client_routine_exercises" ON client_routine_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id WHERE crb.id = client_routine_exercises.block_id AND cr.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id WHERE crb.id = client_routine_exercises.block_id AND cr.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())));

CREATE POLICY "client_select_own_or_assigned_routine_exercises" ON client_routine_exercises FOR SELECT
  USING (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crb.id = client_routine_exercises.block_id AND c.profile_id = auth.uid()));

CREATE POLICY "client_insert_own_routine_exercises" ON client_routine_exercises FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crb.id = client_routine_exercises.block_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

CREATE POLICY "client_update_own_routine_exercises" ON client_routine_exercises FOR UPDATE
  USING (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crb.id = client_routine_exercises.block_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crb.id = client_routine_exercises.block_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

CREATE POLICY "client_delete_own_routine_exercises" ON client_routine_exercises FOR DELETE
  USING (EXISTS (SELECT 1 FROM client_routine_blocks crb JOIN client_routine_days crd ON crd.id = crb.routine_day_id JOIN client_routines cr ON cr.id = crd.routine_id JOIN clients c ON c.id = cr.client_id WHERE crb.id = client_routine_exercises.block_id AND cr.created_by_role = 'client' AND c.profile_id = auth.uid()));

-- ── client_routine_sessions ───────────────────────────────────
CREATE POLICY "admin_all_client_routine_sessions" ON client_routine_sessions FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

CREATE POLICY "client_select_own_sessions" ON client_routine_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routine_sessions.client_id AND clients.profile_id = auth.uid()));

-- El cliente puede marcar "hecho hoy" en rutinas propias Y asignadas (no se
-- exige created_by_role='client' aquí — solo que la rutina sea de ese cliente).
CREATE POLICY "client_insert_own_sessions" ON client_routine_sessions FOR INSERT
  WITH CHECK (
    gym_id = (SELECT current_gym_id())
    AND EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routine_sessions.client_id AND clients.profile_id = auth.uid())
    AND EXISTS (SELECT 1 FROM client_routines cr WHERE cr.id = client_routine_sessions.routine_id AND cr.client_id = client_routine_sessions.client_id)
  );

CREATE POLICY "client_update_own_sessions" ON client_routine_sessions FOR UPDATE
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routine_sessions.client_id AND clients.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_routine_sessions.client_id AND clients.profile_id = auth.uid()));

-- ── routine_templates y descendientes: solo admin ─────────────
CREATE POLICY "admin_all_routine_templates" ON routine_templates FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

CREATE POLICY "admin_all_routine_template_days" ON routine_template_days FOR ALL
  USING (EXISTS (SELECT 1 FROM routine_templates rt WHERE rt.id = routine_template_days.template_id AND rt.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM routine_templates rt WHERE rt.id = routine_template_days.template_id AND rt.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())));

CREATE POLICY "admin_all_routine_template_blocks" ON routine_template_blocks FOR ALL
  USING (EXISTS (SELECT 1 FROM routine_template_days rtd JOIN routine_templates rt ON rt.id = rtd.template_id WHERE rtd.id = routine_template_blocks.template_day_id AND rt.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM routine_template_days rtd JOIN routine_templates rt ON rt.id = rtd.template_id WHERE rtd.id = routine_template_blocks.template_day_id AND rt.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())));

CREATE POLICY "admin_all_routine_template_block_exercises" ON routine_template_block_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM routine_template_blocks rtb JOIN routine_template_days rtd ON rtd.id = rtb.template_day_id JOIN routine_templates rt ON rt.id = rtd.template_id WHERE rtb.id = routine_template_block_exercises.template_block_id AND rt.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())))
  WITH CHECK (EXISTS (SELECT 1 FROM routine_template_blocks rtb JOIN routine_template_days rtd ON rtd.id = rtb.template_day_id JOIN routine_templates rt ON rt.id = rtd.template_id WHERE rtb.id = routine_template_block_exercises.template_block_id AND rt.gym_id = (SELECT current_gym_id()) AND (SELECT is_admin())));
