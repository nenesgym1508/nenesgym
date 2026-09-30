-- ============================================================================
-- 043 — Dos entradas el mismo día gastan UN solo día del plan.
--
-- El gimnasio permite dos ingresos por día (turno mañana y turno tarde). Desde
-- que los días del plan se gastan por asistencia (Sesiones 23 y 25), cada
-- ingreso restaba un día: quien entrenaba mañana y tarde gastaba dos días de
-- su plan en una sola fecha. Decisión del dueño (2026-09-30): el mismo día
-- cuenta UNA vez.
--
-- Se conservan las dos filas de `attendance` (el turno sigue quedando
-- registrado y el tope de 2 por día sigue igual); lo que cambia es cuánto se
-- descuenta. Por eso `used_days` pasa a significar "DÍAS DISTINTOS con
-- asistencia", no "filas de asistencia".
--
-- Auditoría previa en producción: 448 filas, 81 membresías, NINGUNA con dos
-- entradas el mismo día. No hay datos que reparar.
--
-- También hay que tocar `manualCheckInAction` (TypeScript), que llama a
-- increment_used_days en cada registro del admin.
-- ============================================================================


-- ── 1. Registro del cliente ─────────────────────────────────────────────────
-- Igual que la 042 salvo el incremento condicional y el cálculo final.
CREATE OR REPLACE FUNCTION public.process_client_check_in()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user        uuid := auth.uid();
  v_gym         public.gyms%rowtype;
  v_client      public.clients%rowtype;
  v_mem         public.memberships%rowtype;
  v_today       date;
  v_session     text;
  v_status      public.membership_status;
  v_remaining   int;
  v_today_count int;
  v_used_after  int;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED',
      'message', 'Debes iniciar sesión.');
  END IF;

  SELECT c.* INTO v_client
  FROM public.clients c
  WHERE c.profile_id = v_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_A_MEMBER',
      'message', 'No perteneces a ningún gimnasio.');
  END IF;

  SELECT * INTO v_gym FROM public.gyms WHERE id = v_client.gym_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_GYM',
      'message', 'Gimnasio no encontrado.');
  END IF;

  v_today   := (now() at time zone v_gym.timezone)::date;
  v_session := CASE WHEN extract(hour from (now() at time zone v_gym.timezone)) < 14
                    THEN 'am' ELSE 'pm' END;

  SELECT count(*) INTO v_today_count
  FROM public.attendance
  WHERE client_id = v_client.id
    AND check_in_date = v_today;

  IF v_today_count >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MAX_DAILY_EXCEEDED',
      'message', 'Ya completaste tus 2 ingresos permitidos por día (Turno Mañana y Turno Tarde).');
  END IF;

  SELECT * INTO v_mem
  FROM public.memberships m
  WHERE m.client_id = v_client.id
    AND m.gym_id    = v_gym.id
    AND m.status   <> 'cancelled'
  ORDER BY m.end_date DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_MEMBERSHIP',
      'message', 'No tienes una membresía activa.');
  END IF;

  v_status := public.membership_effective_status(v_mem, v_today);

  -- ⚠️ El segundo turno del día NO gasta día, así que tampoco debe bloquearse
  -- por "sin días": si ya entró hoy, el día ya está pagado. Sin esta
  -- excepción, quien gastara su último día en la mañana no podría volver en la
  -- tarde de ese mismo día.
  IF v_status = 'exhausted' AND v_today_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_DAYS',
      'message', 'No tienes días disponibles.');
  END IF;

  IF v_status = 'expired' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED',
      'message', 'Tu membresía está vencida.');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CANCELLED',
      'message', 'Tu membresía fue cancelada.');
  END IF;

  BEGIN
    INSERT INTO public.attendance (gym_id, client_id, membership_id, check_in_date, source, session)
    VALUES (v_gym.id, v_client.id, v_mem.id, v_today, 'client_self', v_session);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_THIS_SESSION',
      'message', 'Ya registraste tu ingreso del turno de la '
        || CASE WHEN v_session = 'am' THEN 'mañana. Podrás registrar tu segundo ingreso en el turno de la tarde.' ELSE 'tarde. Ya no dispones de más turnos por hoy.' END);
  END;

  -- Solo el PRIMER ingreso del día gasta un día del plan.
  v_used_after := v_mem.used_days;
  IF v_today_count = 0 THEN
    UPDATE public.memberships
    SET used_days = used_days + 1, updated_at = now()
    WHERE id = v_mem.id;
    v_used_after := v_used_after + 1;
  END IF;

  v_remaining := greatest(0, v_mem.total_days - v_used_after);

  RETURN jsonb_build_object(
    'ok', true,
    'remaining_days', v_remaining
  );
END;
$$;


-- ── 2. Corrector de asistencias del admin ───────────────────────────────────
-- Igual que la 040 salvo el recuento: días DISTINTOS, no filas.
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
  SELECT * INTO v_membership
  FROM memberships
  WHERE id = p_membership_id AND client_id = p_client_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'La membresia no existe');
  END IF;

  IF p_date > (now() AT TIME ZONE 'America/Bogota')::date THEN
    RETURN jsonb_build_object('ok', false, 'message', 'No se puede marcar un dia futuro');
  END IF;

  IF p_date < v_membership.start_date OR p_date > v_membership.end_date THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Ese dia esta fuera del plan');
  END IF;

  IF p_attended THEN
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

  -- Días distintos, no filas: mañana + tarde del mismo día cuentan uno.
  SELECT count(DISTINCT check_in_date) INTO v_total
  FROM attendance
  WHERE membership_id = p_membership_id;

  UPDATE memberships SET used_days = v_total WHERE id = p_membership_id;

  RETURN jsonb_build_object('ok', true, 'used_days', v_total,
                            'remaining', greatest(0, v_membership.total_days - v_total));
END;
$$;

REVOKE ALL ON FUNCTION set_attendance_for_date(uuid, uuid, date, boolean, uuid) FROM PUBLIC, anon, authenticated;
