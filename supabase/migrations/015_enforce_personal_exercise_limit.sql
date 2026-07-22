-- ============================================================
-- MIGRACIÓN 015: Trigger para límite atómico de 15 ejercicios personales por cliente
-- ============================================================

CREATE OR REPLACE FUNCTION check_client_personal_exercise_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Solo evaluar si es un ejercicio personal activo creado por un cliente
  IF NEW.visibility = 'client' AND NEW.owner_client_id IS NOT NULL AND NEW.is_active = TRUE THEN
    
    -- Bloqueo explícito del registro del cliente para sincronizar solicitudes concurrentes
    PERFORM id FROM clients WHERE id = NEW.owner_client_id FOR UPDATE;

    SELECT COUNT(*) INTO current_count
    FROM exercises
    WHERE owner_client_id = NEW.owner_client_id
      AND visibility = 'client'
      AND is_active = TRUE;

    IF current_count >= 15 THEN
      RAISE EXCEPTION 'Has alcanzado el límite máximo de 15 ejercicios personales activos.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_personal_exercise_limit ON exercises;
CREATE TRIGGER trg_check_personal_exercise_limit
  BEFORE INSERT ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION check_client_personal_exercise_limit();
