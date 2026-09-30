-- ============================================================================
-- 042 — La BASE también cuenta los días por asistencia, no por calendario.
--
-- EL FALLO. En la Sesión 23 el cálculo de días pasó a `total_days - used_days`
-- en la APP, pero tres funciones de la base siguieron restando días de
-- calendario (`eligible_days_elapsed`). Antes coincidían porque las dos
-- contaban igual de mal; desde entonces se contradicen:
--
--   · La app le muestra al cliente "8 entrenamientos restantes".
--   · Al tocar "Registrar", `process_client_check_in` pregunta a
--     `membership_effective_status`, que responde 'exhausted', y el cliente ve
--     "No tienes días disponibles".
--
-- Medido contra producción el 2026-09-30: 17 de 87 membresías activas estaban
-- bloqueadas así. El registro manual del admin no lo sufría porque valida en
-- TypeScript (computeEffectiveStatus), que ya estaba corregido.
--
-- Esta migración deja las tres funciones con la misma regla que la app:
--
--   1. membership_effective_status  → espejo exacto de computeEffectiveStatus
--      (src/lib/membership-status.ts). Arregla el bloqueo, y de paso todo lo
--      que la use (incluida la selección de la membresía viva al renovar).
--   2. process_client_check_in      → los días restantes que devuelve.
--   3. apply_membership_purchase    → los días que se arrastran al renovar.
-- ============================================================================


-- ── 1. Estado efectivo ──────────────────────────────────────────────────────
-- Mismos nombres de parámetro (m, p_today) y mismo tipo de retorno: así
-- CREATE OR REPLACE conserva todo lo que depende de ella.
CREATE OR REPLACE FUNCTION public.membership_effective_status(
  m       public.memberships,
  p_today date
)
RETURNS public.membership_status
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN m.status = 'cancelled'                                  THEN 'cancelled'::public.membership_status
    -- Las entradas se agotan por ASISTENCIA: faltar no gasta días.
    WHEN m.used_days >= m.total_days                             THEN 'exhausted'::public.membership_status
    -- La vigencia manda: aunque sobren días, la fecha corta.
    WHEN p_today <= m.end_date                                   THEN 'active'::public.membership_status
    WHEN p_today <= m.end_date + coalesce(m.grace_days, 0)       THEN 'grace'::public.membership_status
    ELSE                                                              'expired'::public.membership_status
  END;
$$;


-- ── 2. Registro de entrada del cliente ──────────────────────────────────────
-- Idéntica a la 016 salvo el cálculo de `v_remaining` al final.
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

  BEGIN
    INSERT INTO public.attendance (gym_id, client_id, membership_id, check_in_date, source, session)
    VALUES (v_gym.id, v_client.id, v_mem.id, v_today, 'client_self', v_session);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_THIS_SESSION',
      'message', 'Ya registraste tu ingreso del turno de la '
        || CASE WHEN v_session = 'am' THEN 'mañana. Podrás registrar tu segundo ingreso en el turno de la tarde.' ELSE 'tarde. Ya no dispones de más turnos por hoy.' END);
  END;

  UPDATE public.memberships
  SET used_days = used_days + 1, updated_at = now()
  WHERE id = v_mem.id;

  -- Restantes = comprados − usados, contando la entrada que se acaba de
  -- registrar (v_mem se leyó antes del UPDATE).
  v_remaining := greatest(0, v_mem.total_days - (v_mem.used_days + 1));

  RETURN jsonb_build_object(
    'ok', true,
    'remaining_days', v_remaining
  );
END;
$$;


-- ── 3. Renovación / compra de plan ──────────────────────────────────────────
-- Idéntica a la 034 salvo cómo se arrastran los días.
--
-- ⚠️ `used_days` NO se reinicia al acumular, y no puede: `set_attendance_for_date`
-- (migración 040) lo recalcula contando las filas de `attendance` de ESTA
-- membresía, que siguen ahí. Por eso el total nuevo tiene que INCLUIR lo ya
-- usado. Con la fórmula antigua (restantes + nuevos) y el modelo por
-- asistencia, lo usado se habría restado dos veces:
--
--     plan 16, usó 7, le quedan 9, renueva 16
--       antigua: total = 9 + 16 = 25, usados 7 → la app muestra 18   ✗ pierde 7
--       nueva:   total = 7 + 9 + 16 = 32, usados 7 → muestra 25       ✓
--
-- Los días sobrantes solo se arrastran si la membresía seguía VIGENTE. Si ya
-- estaba en gracia (pasada su fecha), se pierden: es la regla acordada, "la
-- vigencia manda". Con el modelo por calendario eso ocurría solo, porque al
-- final del mes el cálculo ya daba ~0.
CREATE OR REPLACE FUNCTION public.apply_membership_purchase(
  p_gym_id        uuid,
  p_client_id     uuid,
  p_plan_id       uuid,
  p_total_days    integer,
  p_duration_days integer,
  p_price_cents   integer,
  p_start_date    date,
  p_grace_days    integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_live           public.memberships%rowtype;
  v_remaining      int;
  v_mem_id         uuid;
  v_dias_actuales  int;
  v_reetiquetar    boolean;
begin
  select * into v_live
  from public.memberships m
  where m.client_id = p_client_id
    and m.status <> 'cancelled'
    and public.membership_effective_status(m, p_start_date) in ('active', 'grace')
  order by m.end_date desc
  limit 1
  for update;

  if found then
    v_remaining := case
      when p_start_date <= v_live.end_date
        then greatest(0, v_live.total_days - v_live.used_days)
      else 0
    end;

    select days into v_dias_actuales from public.plans where id = v_live.plan_id;

    v_reetiquetar := p_plan_id is not null
                     and coalesce(p_total_days, 0) >= coalesce(v_dias_actuales, 0);

    update public.memberships
       set total_days  = v_live.used_days + v_remaining + p_total_days,
           start_date  = p_start_date,
           end_date    = greatest(v_live.end_date, p_start_date) + p_duration_days,
           plan_id     = case when v_reetiquetar then p_plan_id else v_live.plan_id end,
           price_cents = case when v_reetiquetar then p_price_cents else v_live.price_cents end,
           grace_days  = p_grace_days,
           status      = 'active',
           updated_at  = now()
     where id = v_live.id
    returning id into v_mem_id;

    return v_mem_id;
  end if;

  insert into public.memberships (
    gym_id, client_id, plan_id, total_days,
    start_date, end_date, price_cents, grace_days
  ) values (
    p_gym_id, p_client_id, p_plan_id, p_total_days,
    p_start_date, p_start_date + p_duration_days - 1, p_price_cents, p_grace_days
  )
  returning id into v_mem_id;

  return v_mem_id;
end;
$function$;

REVOKE ALL ON FUNCTION public.apply_membership_purchase(uuid, uuid, uuid, integer, integer, integer, date, integer)
  FROM public, anon, authenticated;
