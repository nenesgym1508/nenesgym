-- ============================================================
-- MIGRACIÓN 016: Validación estricta de turnos (Mañana AM / Tarde PM)
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_client_check_in()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
BEGIN
  -- Validar autenticación
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED',
      'message', 'Debes iniciar sesión.');
  END IF;

  -- Buscar datos del cliente
  SELECT c.* INTO v_client
  FROM public.clients c
  WHERE c.profile_id = v_user;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_A_MEMBER',
      'message', 'No perteneces a ningún gimnasio.');
  END IF;

  -- Buscar datos del gimnasio
  SELECT * INTO v_gym FROM public.gyms WHERE id = v_client.gym_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_GYM',
      'message', 'Gimnasio no encontrado.');
  END IF;

  -- Calcular fecha y franja horaria según la zona horaria del gimnasio
  v_today   := (now() at time zone v_gym.timezone)::date;
  v_session := CASE WHEN extract(hour from (now() at time zone v_gym.timezone)) < 14
                    THEN 'am' ELSE 'pm' END;

  -- Validar máximo 2 ingresos por día
  SELECT count(*) INTO v_today_count
  FROM public.attendance
  WHERE client_id = v_client.id
    AND check_in_date = v_today;

  IF v_today_count >= 2 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'MAX_DAILY_EXCEEDED',
      'message', 'Ya completaste tus 2 ingresos permitidos por día (Turno Mañana y Turno Tarde).');
  END IF;

  -- Buscar última membresía activa / no cancelada
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

  -- Validar estado efectivo de membresía
  v_status := public.membership_effective_status(v_mem, v_today);

  IF v_status = 'expired' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED',
      'message', 'Tu membresía está vencida.');
  END IF;

  IF v_status = 'exhausted' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NO_DAYS',
      'message', 'No tienes días disponibles.');
  END IF;

  IF v_status = 'cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CANCELLED',
      'message', 'Tu membresía fue cancelada.');
  END IF;

  -- Intentar registrar la asistencia para la franja actual (am o pm)
  BEGIN
    INSERT INTO public.attendance (gym_id, client_id, membership_id, check_in_date, source, session)
    VALUES (v_gym.id, v_client.id, v_mem.id, v_today, 'client_self', v_session);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_THIS_SESSION',
      'message', 'Ya registraste tu ingreso del turno de la '
        || CASE WHEN v_session = 'am' THEN 'mañana. Podrás registrar tu segundo ingreso en el turno de la tarde.' ELSE 'tarde. Ya no dispones de más turnos por hoy.' END);
  END;

  -- Incrementar días usados en la membresía
  UPDATE public.memberships
  SET used_days = used_days + 1, updated_at = now()
  WHERE id = v_mem.id;

  -- Calcular días restantes
  v_remaining := greatest(0, v_mem.total_days - public.eligible_days_elapsed(
    v_mem.start_date, v_today,
    CASE WHEN v_mem.total_days <= 20 THEN 5 ELSE 6 END
  ));

  RETURN jsonb_build_object(
    'ok', true,
    'remaining_days', v_remaining
  );
END;
$$;
