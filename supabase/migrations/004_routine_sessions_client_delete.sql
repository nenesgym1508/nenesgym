-- ============================================================
-- MIGRACIÓN 004: Permitir a clientes desmarcar su sesión de HOY
-- ============================================================
CREATE POLICY "client_delete_own_sessions_today" ON client_routine_sessions FOR DELETE
  USING (
    session_date = CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = client_routine_sessions.client_id
        AND clients.profile_id = auth.uid()
    )
  );
