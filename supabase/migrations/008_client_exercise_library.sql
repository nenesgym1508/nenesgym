-- ============================================================
-- MIGRACIÓN 008: Biblioteca personal de ejercicios del cliente
-- Aplicar en: Supabase Dashboard → SQL Editor (o MCP apply_migration)
-- ============================================================

-- ============================================================
-- exercises: columnas de propiedad/visibilidad
-- ============================================================
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'gym'
  CHECK (visibility IN ('gym','client'));

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS owner_client_id UUID REFERENCES clients(id);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by_role TEXT NOT NULL DEFAULT 'admin'
  CHECK (created_by_role IN ('admin','client'));

-- Consistencia visibilidad/dueño. ADD CONSTRAINT no soporta IF NOT EXISTS,
-- por eso se envuelve en un DO block idempotente.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercises_visibility_owner_consistency') THEN
    ALTER TABLE exercises ADD CONSTRAINT exercises_visibility_owner_consistency CHECK (
      (visibility = 'gym'    AND owner_client_id IS NULL) OR
      (visibility = 'client' AND owner_client_id IS NOT NULL)
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exercises_owner_client
  ON exercises (owner_client_id) WHERE owner_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exercises_gym_visibility_active
  ON exercises (gym_id, visibility, is_active);

-- ============================================================
-- Tabla: client_exercise_library
-- ============================================================
CREATE TABLE IF NOT EXISTS client_exercise_library (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       UUID        NOT NULL REFERENCES gyms(id),
  client_id    UUID        NOT NULL REFERENCES clients(id),
  exercise_id  UUID        NOT NULL REFERENCES exercises(id),
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  is_favorite  BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_client_exercise_library_client_active
  ON client_exercise_library (client_id, is_active);

ALTER TABLE client_exercise_library ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS: exercises — reemplazar policy de lectura compartida (005)
-- para que un ejercicio 'client' solo sea visible para su dueño.
-- ============================================================
DROP POLICY IF EXISTS "select_exercises_authenticated" ON exercises;
CREATE POLICY "select_exercises_authenticated" ON exercises FOR SELECT
  USING (
    gym_id = (SELECT current_gym_id())
    AND (
      visibility = 'gym'
      OR EXISTS (
        SELECT 1 FROM clients
        WHERE clients.id = exercises.owner_client_id
          AND clients.profile_id = auth.uid()
      )
    )
  );

-- INSERT: el cliente solo puede crear ejercicios propios.
CREATE POLICY "client_insert_own_exercises" ON exercises FOR INSERT
  WITH CHECK (
    gym_id = (SELECT current_gym_id())
    AND visibility = 'client'
    AND created_by_role = 'client'
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = exercises.owner_client_id AND clients.profile_id = auth.uid()
    )
  );

-- UPDATE: solo sus propios ejercicios; el WITH CHECK impide "soltar" la
-- propiedad (cambiar visibility a 'gym') o reasignarla a otro cliente.
CREATE POLICY "client_update_own_exercises" ON exercises FOR UPDATE
  USING (
    gym_id = (SELECT current_gym_id())
    AND visibility = 'client'
    AND EXISTS (SELECT 1 FROM clients WHERE clients.id = exercises.owner_client_id AND clients.profile_id = auth.uid())
  )
  WITH CHECK (
    gym_id = (SELECT current_gym_id())
    AND visibility = 'client'
    AND created_by_role = 'client'
    AND EXISTS (SELECT 1 FROM clients WHERE clients.id = exercises.owner_client_id AND clients.profile_id = auth.uid())
  );

-- DELETE: se define por simetría/consistencia de RLS con el resto del
-- esquema, pero la capa de aplicación NO la usa (se prefiere is_active=false
-- por el mismo riesgo de FK RESTRICT que ya evita el admin con toggleExerciseAction).
CREATE POLICY "client_delete_own_exercises" ON exercises FOR DELETE
  USING (
    gym_id = (SELECT current_gym_id())
    AND visibility = 'client'
    AND EXISTS (SELECT 1 FROM clients WHERE clients.id = exercises.owner_client_id AND clients.profile_id = auth.uid())
  );

-- ============================================================
-- RLS: client_exercise_library
-- ============================================================
CREATE POLICY "admin_all_client_exercise_library" ON client_exercise_library FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

CREATE POLICY "client_select_own_library" ON client_exercise_library FOR SELECT
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_exercise_library.client_id AND clients.profile_id = auth.uid()));

-- El EXISTS sobre exercises evita que un cliente inserte en su biblioteca
-- el exercise_id de un ejercicio privado de OTRO cliente adivinando el UUID.
CREATE POLICY "client_insert_own_library" ON client_exercise_library FOR INSERT
  WITH CHECK (
    gym_id = (SELECT current_gym_id())
    AND EXISTS (SELECT 1 FROM clients WHERE clients.id = client_exercise_library.client_id AND clients.profile_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM exercises e
      WHERE e.id = client_exercise_library.exercise_id
        AND e.gym_id = (SELECT current_gym_id())
        AND (
          e.visibility = 'gym'
          OR EXISTS (SELECT 1 FROM clients c2 WHERE c2.id = e.owner_client_id AND c2.profile_id = auth.uid())
        )
    )
  );

CREATE POLICY "client_update_own_library" ON client_exercise_library FOR UPDATE
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_exercise_library.client_id AND clients.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_exercise_library.client_id AND clients.profile_id = auth.uid()));

CREATE POLICY "client_delete_own_library" ON client_exercise_library FOR DELETE
  USING (EXISTS (SELECT 1 FROM clients WHERE clients.id = client_exercise_library.client_id AND clients.profile_id = auth.uid()));
