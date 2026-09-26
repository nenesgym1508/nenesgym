-- Marcar o desmarcar la asistencia de un día concreto (corrección del admin).
--
-- Por qué una función y no dos consultas desde el servidor: `attendance` y
-- `memberships.used_days` tienen que moverse JUNTAS. Si se insertara la
-- asistencia y fallara el incremento (o al revés), el cliente vería un día
-- marcado en el calendario que no le descontó del plan, o al contrario. Desde
-- que los días se gastan por asistencia (Sesión 23), ese descuadre es dinero:
-- son entradas al gimnasio que alguien pagó.
--
-- Es IDEMPOTENTE en los dos sentidos: marcar un día ya marcado no suma otra
-- vez, y desmarcar uno que no existe no resta. Así un doble clic o un reintento
-- por red lenta no puede dejar el contador mal.
--
-- `used_days` se recalcula CONTANDO las filas de asistencia en vez de sumar o
-- restar uno. Es la única forma de que el contador no pueda desviarse del
-- calendario que el cliente ve, aunque quedaran descuadres de antes.

CREATE OR REPLACE FUNCTION set_attendance_for_date(
  p_client_id     uuid,
  p_membership_id uuid,
  p_date          date,
  p_attended      boolean,
  p_gym_id        uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membership   memberships%ROWTYPE;
  v_total        int;
BEGIN
  -- Bloquea la membresía: dos correcciones a la vez sobre el mismo cliente se
  -- serializan en vez de pisarse.
  SELECT * INTO v_membership
  FROM memberships
  WHERE id = p_membership_id AND client_id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La membresía no existe');
  END IF;

  IF p_date > (now() AT TIME ZONE 'America/Bogota')::date THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No se puede marcar un día futuro');
  END IF;

  IF p_date < v_membership.start_date OR p_date > v_membership.end_date THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Ese día está fuera del plan');
  END IF;

  IF p_attended THEN
    -- Una sola asistencia por día en esta corrección manual (la franja am/pm
    -- es cosa del check-in en vivo). ON CONFLICT no sirve aquí porque el
    -- índice único incluye `session`, así que se comprueba a mano.
    IF NOT EXISTS (
      SELECT 1 FROM attendance
      WHERE client_id = p_client_id AND check_in_date = p_date
    ) THEN
      INSERT INTO attendance (gym_id, client_id, membership_id, check_in_date, source, session)
      VALUES (p_gym_id, p_client_id, p_membership_id, p_date, 'admin_manual', 'am');
    END IF;
  ELSE
    DELETE FROM attendance
    WHERE client_id = p_client_id AND check_in_date = p_date;
  END IF;

  -- Recuento real, no un +1/-1: el contador queda imposible de desviar.
  SELECT count(*) INTO v_total
  FROM attendance
  WHERE membership_id = p_membership_id;

  UPDATE memberships SET used_days = v_total WHERE id = p_membership_id;

  RETURN jsonb_build_object('ok', true, 'used_days', v_total,
                            'remaining', greatest(0, v_membership.total_days - v_total));
END;
$$;

-- Solo el servidor (service-role) la llama, tras requireAdmin.
REVOKE ALL ON FUNCTION set_attendance_for_date(uuid, uuid, date, boolean, uuid) FROM PUBLIC, anon, authenticated;
