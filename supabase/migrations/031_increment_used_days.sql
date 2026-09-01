-- ⚠️ TRAÍDA DESDE LA CARPETA `migrations/` DE LA RAÍZ (2026-09-01).
-- Vivía fuera de supabase/migrations/, así que un entorno reconstruido desde la
-- carpeta versionada no la habría aplicado nunca. El número no refleja su fecha
-- real (es anterior a la 029); da igual, porque es idempotente.
--
-- Función para incrementar used_days de forma atómica.
-- Evita el lost-update que ocurre cuando se usa `used_days = used_days + 1`
-- con un valor leído previamente (race condition entre check-in manual y QR).
--
-- Ejecutar una sola vez en el SQL Editor de Supabase (proyecto nqhkfqoroisszycdxwuy).

CREATE OR REPLACE FUNCTION increment_used_days(p_membership_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE memberships
  SET used_days = used_days + 1
  WHERE id = p_membership_id;
$$;
