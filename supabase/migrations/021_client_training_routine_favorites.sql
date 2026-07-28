-- Favoritos del cliente sobre rutinas públicas de la biblioteca (training_routines).
-- Tabla de marcado simple (bookmark), no una copia — la rutina original nunca
-- se toca. Mismo patrón que client_exercise_library.is_favorite, pero como
-- tabla propia porque training_routines es del gimnasio (no hay una fila por
-- cliente donde agregar la columna).

CREATE TABLE client_training_routine_favorites (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id      UUID        NOT NULL REFERENCES gyms(id),
  client_id   UUID        NOT NULL REFERENCES clients(id),
  routine_id  UUID        NOT NULL REFERENCES training_routines(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, routine_id)
);

CREATE INDEX idx_client_training_routine_favorites_client
  ON client_training_routine_favorites (client_id);

ALTER TABLE client_training_routine_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_client_training_routine_favorites" ON client_training_routine_favorites FOR ALL
  USING (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()))
  WITH CHECK (gym_id = (SELECT current_gym_id()) AND (SELECT is_admin()));

CREATE POLICY "client_select_own_routine_favorites" ON client_training_routine_favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_training_routine_favorites.client_id
        AND clients.profile_id = auth.uid()
    )
  );

-- Solo se puede marcar como favorita una rutina PÚBLICA y activa del propio
-- gimnasio (misma condición que la RLS de lectura de training_routines) —
-- evita que un cliente "favorite" un id arbitrario que ni siquiera puede ver.
CREATE POLICY "client_insert_own_routine_favorites" ON client_training_routine_favorites FOR INSERT
  WITH CHECK (
    gym_id = (SELECT current_gym_id())
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_training_routine_favorites.client_id
        AND clients.profile_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM training_routines rt
      WHERE rt.id = client_training_routine_favorites.routine_id
        AND rt.is_public = true
        AND rt.is_active = true
        AND rt.gym_id = (SELECT current_gym_id())
    )
  );

CREATE POLICY "client_delete_own_routine_favorites" ON client_training_routine_favorites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_training_routine_favorites.client_id
        AND clients.profile_id = auth.uid()
    )
  );
