-- ============================================================
-- MIGRACIÓN 014: RLS de Storage para el bucket exercises (Gym vs Personal)
-- ============================================================

-- Lectura pública para todas las imágenes del bucket exercises
DROP POLICY IF EXISTS "exercises_public_select" ON storage.objects;
CREATE POLICY "exercises_public_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'exercises');

-- Inserción: Admin global o Cliente sólo en su carpeta personal client/{clientId}/...
DROP POLICY IF EXISTS "exercises_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "exercises_admin_insert" ON storage.objects;
CREATE POLICY "exercises_admin_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exercises' AND (
      is_admin() OR (
        (name LIKE 'client/%') AND
        (storage.foldername(name))[2] = (
          SELECT c.id::text FROM clients c WHERE c.profile_id = auth.uid() LIMIT 1
        )
      )
    )
  );

-- Modificación: Admin global o Cliente sólo en su carpeta personal client/{clientId}/...
DROP POLICY IF EXISTS "exercises_admin_update" ON storage.objects;
CREATE POLICY "exercises_admin_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'exercises' AND (
      is_admin() OR (
        (name LIKE 'client/%') AND
        (storage.foldername(name))[2] = (
          SELECT c.id::text FROM clients c WHERE c.profile_id = auth.uid() LIMIT 1
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'exercises' AND (
      is_admin() OR (
        (name LIKE 'client/%') AND
        (storage.foldername(name))[2] = (
          SELECT c.id::text FROM clients c WHERE c.profile_id = auth.uid() LIMIT 1
        )
      )
    )
  );

-- Eliminación: Admin global o Cliente sólo en su carpeta personal client/{clientId}/...
DROP POLICY IF EXISTS "exercises_admin_delete" ON storage.objects;
CREATE POLICY "exercises_admin_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'exercises' AND (
      is_admin() OR (
        (name LIKE 'client/%') AND
        (storage.foldername(name))[2] = (
          SELECT c.id::text FROM clients c WHERE c.profile_id = auth.uid() LIMIT 1
        )
      )
    )
  );
