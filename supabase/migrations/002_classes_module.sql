-- ============================================================
-- MIGRACIÓN 002: Módulo Clases — ejercicios, clases diarias,
--               bloques y plantillas
-- Aplicar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- ============================================================
-- Tabla: exercises (biblioteca de ejercicios del gimnasio)
-- ============================================================
CREATE TABLE IF NOT EXISTS exercises (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id         UUID        NOT NULL REFERENCES gyms(id),
  name           TEXT        NOT NULL,
  muscle_group   TEXT        CHECK (muscle_group IN (
                   'pecho','espalda','pierna','hombro',
                   'biceps','triceps','abdomen','cardio',
                   'movilidad','full_body')),
  equipment      TEXT        CHECK (equipment IN (
                   'peso_corporal','mancuernas','barra','maquina',
                   'polea','banda','caminadora','bicicleta','otro')),
  exercise_type  TEXT        CHECK (exercise_type IN (
                   'fuerza','cardio','movilidad','estiramiento','tecnica')),
  instructions   TEXT,
  media_url      TEXT,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exercises_gym_active
  ON exercises (gym_id, is_active, muscle_group);

-- ============================================================
-- Tabla: daily_classes (clases diarias preparadas por el admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_classes (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                      UUID        NOT NULL REFERENCES gyms(id),
  title                       TEXT        NOT NULL,
  class_date                  DATE        NOT NULL,
  objective                   TEXT        CHECK (objective IN (
                                'fuerza','hipertrofia','cardio',
                                'tecnica','movilidad','full_body','general')),
  level                       TEXT        CHECK (level IN (
                                'general','principiante','intermedio','avanzado')),
  estimated_duration_minutes  INT,
  status                      TEXT        NOT NULL DEFAULT 'draft'
                                          CHECK (status IN ('draft','published','archived')),
  notes                       TEXT,
  created_by                  UUID        REFERENCES auth.users(id),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_classes_gym_date
  ON daily_classes (gym_id, class_date DESC);

-- ============================================================
-- Tabla: class_blocks (bloques de una clase)
-- ============================================================
CREATE TABLE IF NOT EXISTS class_blocks (
  id              UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_class_id  UUID   NOT NULL REFERENCES daily_classes(id) ON DELETE CASCADE,
  title           TEXT   NOT NULL,
  position        INT    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_class_blocks_class
  ON class_blocks (daily_class_id, position);

-- ============================================================
-- Tabla: class_block_exercises (ejercicios dentro de un bloque)
-- ============================================================
CREATE TABLE IF NOT EXISTS class_block_exercises (
  id               UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id         UUID   NOT NULL REFERENCES class_blocks(id) ON DELETE CASCADE,
  exercise_id      UUID   NOT NULL REFERENCES exercises(id),
  position         INT    NOT NULL DEFAULT 0,
  sets             INT,
  reps             INT,
  duration_seconds INT,
  rest_seconds     INT,
  suggested_weight TEXT,
  notes            TEXT
);

CREATE INDEX IF NOT EXISTS idx_class_block_exercises_block
  ON class_block_exercises (block_id, position);

-- ============================================================
-- Tabla: class_templates (plantillas reutilizables)
-- ============================================================
CREATE TABLE IF NOT EXISTS class_templates (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id                      UUID        NOT NULL REFERENCES gyms(id),
  name                        TEXT        NOT NULL,
  objective                   TEXT        CHECK (objective IN (
                                'fuerza','hipertrofia','cardio',
                                'tecnica','movilidad','full_body','general')),
  level                       TEXT        CHECK (level IN (
                                'general','principiante','intermedio','avanzado')),
  estimated_duration_minutes  INT,
  notes                       TEXT,
  is_active                   BOOLEAN     NOT NULL DEFAULT true,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_class_templates_gym_active
  ON class_templates (gym_id, is_active);

-- ============================================================
-- Tabla: template_blocks
-- ============================================================
CREATE TABLE IF NOT EXISTS template_blocks (
  id           UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  UUID   NOT NULL REFERENCES class_templates(id) ON DELETE CASCADE,
  title        TEXT   NOT NULL,
  position     INT    NOT NULL DEFAULT 0
);

-- ============================================================
-- Tabla: template_block_exercises
-- ============================================================
CREATE TABLE IF NOT EXISTS template_block_exercises (
  id                   UUID   PRIMARY KEY DEFAULT gen_random_uuid(),
  template_block_id    UUID   NOT NULL REFERENCES template_blocks(id) ON DELETE CASCADE,
  exercise_id          UUID   NOT NULL REFERENCES exercises(id),
  position             INT    NOT NULL DEFAULT 0,
  sets                 INT,
  reps                 INT,
  duration_seconds     INT,
  rest_seconds         INT,
  suggested_weight     TEXT,
  notes                TEXT
);

-- ============================================================
-- RLS — Todas las tablas del módulo Clases: solo admin del gym
-- ============================================================

ALTER TABLE exercises              ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_blocks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_block_exercises  ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_blocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_block_exercises ENABLE ROW LEVEL SECURITY;

-- exercises
CREATE POLICY "admin_all_exercises" ON exercises FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

-- daily_classes
CREATE POLICY "admin_all_daily_classes" ON daily_classes FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

-- class_blocks (acceso via daily_class)
CREATE POLICY "admin_all_class_blocks" ON class_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM daily_classes dc
      WHERE dc.id = class_blocks.daily_class_id
        AND dc.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM daily_classes dc
      WHERE dc.id = class_blocks.daily_class_id
        AND dc.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  );

-- class_block_exercises (acceso via block → daily_class)
CREATE POLICY "admin_all_class_block_exercises" ON class_block_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM class_blocks cb
      JOIN daily_classes dc ON dc.id = cb.daily_class_id
      WHERE cb.id = class_block_exercises.block_id
        AND dc.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_blocks cb
      JOIN daily_classes dc ON dc.id = cb.daily_class_id
      WHERE cb.id = class_block_exercises.block_id
        AND dc.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  );

-- class_templates
CREATE POLICY "admin_all_class_templates" ON class_templates FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

-- template_blocks
CREATE POLICY "admin_all_template_blocks" ON template_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM class_templates ct
      WHERE ct.id = template_blocks.template_id
        AND ct.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM class_templates ct
      WHERE ct.id = template_blocks.template_id
        AND ct.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  );

-- template_block_exercises
CREATE POLICY "admin_all_template_block_exercises" ON template_block_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM template_blocks tb
      JOIN class_templates ct ON ct.id = tb.template_id
      WHERE tb.id = template_block_exercises.template_block_id
        AND ct.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM template_blocks tb
      JOIN class_templates ct ON ct.id = tb.template_id
      WHERE tb.id = template_block_exercises.template_block_id
        AND ct.gym_id = (SELECT current_gym_id())
        AND (SELECT is_admin())
    )
  );
