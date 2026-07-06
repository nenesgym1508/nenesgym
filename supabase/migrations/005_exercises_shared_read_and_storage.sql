-- ============================================================
-- MIGRACIÓN 005: Políticas de lectura compartida para ejercicios y storage
-- ============================================================

-- exercises
DROP POLICY IF EXISTS "select_exercises_authenticated" ON exercises;
CREATE POLICY "select_exercises_authenticated" ON exercises FOR SELECT
  USING (gym_id = (SELECT current_gym_id()));

-- storage.objects (bucket exercises)
DROP POLICY IF EXISTS "exercises_public_select" ON storage.objects;
CREATE POLICY "exercises_public_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'exercises');

DROP POLICY IF EXISTS "exercises_authenticated_upload" ON storage.objects;
CREATE POLICY "exercises_authenticated_upload" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'exercises');

DROP POLICY IF EXISTS "exercises_admin_update" ON storage.objects;
CREATE POLICY "exercises_admin_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'exercises' AND is_admin())
  WITH CHECK (bucket_id = 'exercises' AND is_admin());

DROP POLICY IF EXISTS "exercises_admin_delete" ON storage.objects;
CREATE POLICY "exercises_admin_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'exercises' AND is_admin());
