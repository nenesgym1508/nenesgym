-- ============================================================
-- MIGRACIÓN 011: Rutinas biblioteca (training_routines)
-- Renombra routine_templates -> training_routines (+ hijas),
-- agrega trazabilidad de "clase programada desde rutina" en
-- daily_classes, amplía source_type de client_routines, y migra
-- los class_templates existentes hacia training_routines (1 día).
-- Aplicar en: Supabase Dashboard → SQL Editor (o MCP apply_migration)
-- ============================================================

-- ── 1. Rename routine_templates y tablas hijas ────────────────
ALTER TABLE routine_templates RENAME TO training_routines;
ALTER TABLE routine_template_days RENAME TO training_routine_days;
ALTER TABLE routine_template_blocks RENAME TO training_routine_blocks;
ALTER TABLE routine_template_block_exercises RENAME TO training_routine_exercises;

-- Columnas FK renombradas para igualar el patrón ya usado en client_routine_*
ALTER TABLE training_routine_days RENAME COLUMN template_id TO routine_id;
ALTER TABLE training_routine_blocks RENAME COLUMN template_day_id TO routine_day_id;
ALTER TABLE training_routine_exercises RENAME COLUMN template_block_id TO block_id;

-- Índices
ALTER INDEX idx_routine_templates_gym_active RENAME TO idx_training_routines_gym_active;
ALTER INDEX idx_routine_template_days_template RENAME TO idx_training_routine_days_routine;
ALTER INDEX idx_routine_template_blocks_day RENAME TO idx_training_routine_blocks_day;
ALTER INDEX idx_routine_template_block_exercises_block RENAME TO idx_training_routine_exercises_block;

-- Policies RLS
ALTER POLICY "admin_all_routine_templates" ON training_routines RENAME TO "admin_all_training_routines";
ALTER POLICY "admin_all_routine_template_days" ON training_routine_days RENAME TO "admin_all_training_routine_days";
ALTER POLICY "admin_all_routine_template_blocks" ON training_routine_blocks RENAME TO "admin_all_training_routine_blocks";
ALTER POLICY "admin_all_routine_template_block_exercises" ON training_routine_exercises RENAME TO "admin_all_training_routine_exercises";

-- ── 2. Trazabilidad "clase programada desde rutina" ───────────
ALTER TABLE daily_classes
  ADD COLUMN source_routine_id UUID REFERENCES training_routines(id) ON DELETE SET NULL,
  ADD COLUMN source_routine_day_id UUID REFERENCES training_routine_days(id) ON DELETE SET NULL;

-- ── 3. Ampliar source_type de client_routines ─────────────────
ALTER TABLE client_routines DROP CONSTRAINT client_routines_source_type_check;
ALTER TABLE client_routines ADD CONSTRAINT client_routines_source_type_check
  CHECK (source_type = ANY (ARRAY['custom','template','class','client_created','training_routine']));

-- ── 4. Migrar class_templates (+ bloques/ejercicios) hacia
--       training_routines de 1 solo día ─────────────────────────
DO $$
DECLARE
  ct RECORD;
  tb RECORD;
  tbe RECORD;
  new_routine_id UUID;
  new_day_id UUID;
  new_block_id UUID;
BEGIN
  FOR ct IN SELECT * FROM class_templates LOOP
    INSERT INTO training_routines (gym_id, name, description, goal, custom_goal, level, days_per_week, notes, is_active, created_at, updated_at)
    VALUES (ct.gym_id, ct.name, NULL, ct.objective, NULL, ct.level, 1, ct.notes, ct.is_active, ct.created_at, ct.updated_at)
    RETURNING id INTO new_routine_id;

    INSERT INTO training_routine_days (routine_id, title, weekday, position)
    VALUES (new_routine_id, 'Sesión única', NULL, 0)
    RETURNING id INTO new_day_id;

    FOR tb IN SELECT * FROM template_blocks WHERE template_id = ct.id ORDER BY position LOOP
      INSERT INTO training_routine_blocks (routine_day_id, title, position)
      VALUES (new_day_id, tb.title, tb.position)
      RETURNING id INTO new_block_id;

      FOR tbe IN SELECT * FROM template_block_exercises WHERE template_block_id = tb.id ORDER BY position LOOP
        INSERT INTO training_routine_exercises (block_id, exercise_id, position, sets, reps, duration_seconds, rest_seconds, suggested_weight, notes)
        VALUES (new_block_id, tbe.exercise_id, tbe.position, tbe.sets, tbe.reps, tbe.duration_seconds, tbe.rest_seconds, tbe.suggested_weight, tbe.notes);
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
