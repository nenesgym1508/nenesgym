-- Biblioteca de rutinas pública: el admin puede marcar una rutina de la
-- biblioteca (training_routines) como visible para todos los clientes del
-- gimnasio. No se crea ninguna tabla nueva — solo un flag y permisos de
-- SOLO LECTURA para clientes sobre lo que ya existe.

ALTER TABLE training_routines
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- RLS: training_routines y sus hijos — nueva policy de lectura para
-- clientes autenticados, además (no en reemplazo) de admin_all_* (FOR ALL).
-- Requiere is_public = true, is_active = true (una rutina archivada no debe
-- verse en la biblioteca aunque siga marcada como pública) y mismo gimnasio.
-- ============================================================

CREATE POLICY "client_select_public_training_routines" ON training_routines FOR SELECT
  USING (
    is_public = true
    AND is_active = true
    AND gym_id = (SELECT current_gym_id())
  );

CREATE POLICY "client_select_public_training_routine_days" ON training_routine_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_routines rt
      WHERE rt.id = training_routine_days.routine_id
        AND rt.is_public = true
        AND rt.is_active = true
        AND rt.gym_id = (SELECT current_gym_id())
    )
  );

CREATE POLICY "client_select_public_training_routine_blocks" ON training_routine_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_routine_days rtd
      JOIN training_routines rt ON rt.id = rtd.routine_id
      WHERE rtd.id = training_routine_blocks.routine_day_id
        AND rt.is_public = true
        AND rt.is_active = true
        AND rt.gym_id = (SELECT current_gym_id())
    )
  );

CREATE POLICY "client_select_public_training_routine_exercises" ON training_routine_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM training_routine_blocks rtb
      JOIN training_routine_days rtd ON rtd.id = rtb.routine_day_id
      JOIN training_routines rt ON rt.id = rtd.routine_id
      WHERE rtb.id = training_routine_exercises.block_id
        AND rt.is_public = true
        AND rt.is_active = true
        AND rt.gym_id = (SELECT current_gym_id())
    )
  );
