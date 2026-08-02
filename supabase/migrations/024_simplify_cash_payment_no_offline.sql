-- Se revierte el modo offline (decisión: no vale la pena la complejidad/riesgo
-- para esta entrega). Se CONSERVAN dos arreglos de la 022/023 que no son del
-- offline, son bugs reales de dinero que ya existían antes:
--   1. El cobro en efectivo era de 2 pasos no atómicos (insertar pago + luego
--      aprobar aparte) — un corte a la mitad podía dejar pagos huérfanos, y
--      reintentar podía duplicar pago+membresía.
--   2. Renovar un plan creaba una membresía nueva en paralelo y perdía los
--      días que le quedaban al cliente (ya había membresías solapadas reales
--      en producción por esto). apply_membership_purchase() ya lo corrigió.
--
-- Este archivo solo AJUSTA create_and_approve_cash_payment: el identificador
-- de idempotencia (client_request_id) era para que la cola offline pudiera
-- reintentar sin cobrar dos veces. Sin cola, nadie va a generarlo ni pasarlo
-- — se hace opcional (autogenerado si no llega) para que el llamador normal
-- no tenga que preocuparse por él. apply_membership_purchase() y
-- approve_payment() NO cambian: ya están bien como quedaron.

-- El orden de parámetros cambia (el identificador de idempotencia pasa de
-- obligatorio-primero a opcional-al-final). Postgres identifica una función
-- por su nombre + secuencia de TIPOS, así que reordenar tipos crea una
-- sobrecarga nueva en vez de reemplazar la existente — hay que borrar la
-- firma vieja explícitamente primero, si no quedarían las dos conviviendo.
DROP FUNCTION IF EXISTS public.create_and_approve_cash_payment(uuid, uuid, integer, text, timestamptz, uuid, integer, integer);

CREATE OR REPLACE FUNCTION public.create_and_approve_cash_payment(
  p_client_id         uuid,
  p_amount_cents      integer,
  p_method            text,
  p_client_request_id uuid    DEFAULT NULL,
  p_occurred_at       timestamptz DEFAULT NULL,
  p_plan_id           uuid    DEFAULT NULL,
  p_total_days        integer DEFAULT NULL,
  p_duration_days     integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_admin          uuid := auth.uid();
  v_gym            public.gyms%rowtype;
  v_plan           public.plans%rowtype;
  v_pay            public.payments%rowtype;
  v_gym_id         uuid;
  v_request_id     uuid;
  v_payment_id     uuid;
  v_mem_id         uuid;
  v_today          date;
  v_start_date     date;
  v_total_days     int;
  v_duration_days  int;
  v_needs_review   boolean := false;
  v_review_reason  text := null;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED',
      'message', 'No tienes permiso.', 'retryable', false);
  end if;

  if p_method is null or p_method not in ('cash','transfer','nequi','daviplata','other') then
    return jsonb_build_object('ok', false, 'code', 'INVALID_METHOD',
      'message', 'Método de pago inválido.', 'retryable', false);
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_AMOUNT',
      'message', 'Monto inválido.', 'retryable', false);
  end if;

  select gym_id into v_gym_id from public.clients where id = p_client_id;
  if v_gym_id is null then
    return jsonb_build_object('ok', false, 'code', 'CLIENT_NOT_FOUND',
      'message', 'El cliente ya no existe.', 'retryable', false);
  end if;

  select * into v_gym from public.gyms where id = v_gym_id;
  v_today := (now() at time zone v_gym.timezone)::date;

  v_start_date := (coalesce(p_occurred_at, now()) at time zone v_gym.timezone)::date;
  if v_start_date > v_today then
    v_start_date   := v_today;
    v_needs_review := true;
    v_review_reason := 'Fecha del dispositivo en el futuro; se usó la fecha de hoy.';
  end if;

  -- Sin cola offline nadie pasa un identificador propio: se genera aquí. La
  -- protección real contra duplicados vuelve a ser, como siempre, no reintentar
  -- una operación que ya se completó.
  v_request_id := coalesce(p_client_request_id, gen_random_uuid());

  insert into public.payments (
    gym_id, client_id, plan_id, amount_cents, method, status,
    client_request_id, occurred_at
  ) values (
    v_gym_id, p_client_id, p_plan_id, p_amount_cents, p_method::payment_method, 'pending',
    v_request_id, coalesce(p_occurred_at, now())
  )
  on conflict (client_request_id) do nothing
  returning id into v_payment_id;

  if v_payment_id is null then
    select * into v_pay from public.payments
      where client_request_id = v_request_id
      for update;

    if not found then
      return jsonb_build_object('ok', false, 'code', 'CONFLICT',
        'message', 'No se pudo resolver la operación, intenta de nuevo.', 'retryable', true);
    end if;

    if v_pay.status = 'approved' then
      return jsonb_build_object('ok', true, 'code', 'ALREADY_APPLIED',
        'payment_id', v_pay.id, 'membership_id', v_pay.membership_id, 'duplicate', true);
    end if;

    if v_pay.status = 'rejected' then
      return jsonb_build_object('ok', false, 'code', 'ALREADY_REJECTED',
        'message', 'Este pago fue rechazado previamente.', 'retryable', false);
    end if;

    v_payment_id := v_pay.id;
  end if;

  if p_plan_id is not null then
    select * into v_plan from public.plans where id = p_plan_id;
    if not found then
      return jsonb_build_object('ok', false, 'code', 'PLAN_NOT_FOUND',
        'message', 'El plan ya no existe.', 'retryable', false);
    end if;
    v_total_days    := coalesce(p_total_days, v_plan.days);
    v_duration_days := coalesce(p_duration_days, v_plan.duration_days);
  else
    v_total_days    := coalesce(p_total_days, 30);
    v_duration_days := coalesce(p_duration_days, 30);
  end if;

  -- Acumula sobre la membresía vigente si la hay; si no, crea una nueva.
  v_mem_id := public.apply_membership_purchase(
    v_gym_id, p_client_id, p_plan_id,
    v_total_days, v_duration_days, p_amount_cents,
    v_start_date, v_gym.grace_days
  );

  update public.payments
     set status        = 'approved',
         membership_id = v_mem_id,
         reviewed_by   = v_admin,
         reviewed_at   = now(),
         updated_at    = now(),
         note          = case when v_needs_review
                           then coalesce(note || ' | ', '') || 'REVISAR: ' || v_review_reason
                           else note end
   where id = v_payment_id;

  return jsonb_build_object(
    'ok',            true,
    'code',          'APPROVED',
    'payment_id',    v_payment_id,
    'membership_id', v_mem_id,
    'total_days',    (select total_days from public.memberships where id = v_mem_id),
    'end_date',      (select end_date::text from public.memberships where id = v_mem_id)
  );
end;
$function$;
