-- 1. Reemplazar la restricción check de origen en asistencia
ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_source_check;
ALTER TABLE public.attendance ADD CONSTRAINT attendance_source_check CHECK (source = ANY (ARRAY['qr'::text, 'manual'::text, 'client_self'::text, 'admin_manual'::text]));

-- 2. Crear función de check-in directo de cliente (self-check-in)
CREATE OR REPLACE FUNCTION public.process_client_check_in()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user    uuid := auth.uid();
  v_gym     public.gyms%rowtype;
  v_client  public.clients%rowtype;
  v_mem     public.memberships%rowtype;
  v_today   date;
  v_session text;
  v_status  public.membership_status;
  v_remaining int;
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

  -- Intentar registrar la asistencia
  BEGIN
    INSERT INTO public.attendance (gym_id, client_id, membership_id, check_in_date, source, session)
    VALUES (v_gym.id, v_client.id, v_mem.id, v_today, 'client_self', v_session);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_TODAY',
      'message', 'Ya registraste tu ingreso de la '
        || CASE WHEN v_session = 'am' THEN 'mañana' ELSE 'tarde' END || '.');
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
    'ok',             true,
    'code',           'CHECKED_IN',
    'message',        'Ingreso registrado correctamente.',
    'remaining_days', v_remaining,
    'period',         v_status::text
  );
END;
$$;
