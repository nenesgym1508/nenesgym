-- Renovación acumulativa: al comprar un plan teniendo uno vigente, los días que
-- le quedaban al cliente SE SUMAN en vez de perderse.
--
-- Problema que corrige:
--   La pantalla "Expandir plan" le promete al admin, textualmente, que "se
--   sumarán N días y el nuevo vencimiento será {vencimiento actual + duración}".
--   La base hacía lo contrario: insertaba una membresía NUEVA desde hoy y dejaba
--   la anterior huérfana. El check-in toma la de end_date más lejano, así que
--   los días que el cliente ya había pagado simplemente se perdían.
--   Efecto secundario: cada renovación dejaba una membresía solapada más
--   (en producción había clientes con 9).
--
-- Se corrige tanto el cobro en efectivo como la aprobación de comprobantes,
-- para que renovar por un medio u otro dé exactamente el mismo resultado.
--
-- ⚠️ NOTA DE HISTORIAL (reconstruido 2026-08-03)
--   Estas definiciones se aplicaron a producción durante el trabajo del modo
--   offline, pero el archivo nunca llegó a `main`: quedó únicamente dentro del
--   `git stash` que revirtió esa función. Es decir, producción tenía funciones
--   cuyo código fuente no existía en el repositorio, y `024_...` (que sí está
--   versionada) depende de ellas — un entorno nuevo reconstruido desde
--   `supabase/migrations/` se habría roto.
--
--   Este archivo repone ese estado tal cual está vivo en producción. Es
--   idempotente: volver a ejecutarlo sobre la base actual no cambia nada.
--
--   Lo que NO se repone a propósito:
--     - Toda la infraestructura del modo offline (Service Worker, cola,
--       endpoint de sincronización). Ver ROADMAP_VISION.md.
--     - La versión 023 de `create_and_approve_cash_payment`, porque `024_`
--       la sustituye con una firma distinta (el identificador de idempotencia
--       pasó de obligatorio a opcional). La 024 ya hace su propio
--       `DROP FUNCTION IF EXISTS` de la firma vieja.

-- ── 1. Columnas de soporte en payments ───────────────────────────────────────
-- Vienen de la 022 (revertida). Se conservan porque `create_and_approve_cash_payment`
-- las sigue usando: `client_request_id` como llave de idempotencia opcional para
-- que reintentar un cobro no lo duplique, y `occurred_at` para poder fechar un
-- pago en su día real. Ambas son NULL en todas las filas existentes.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS client_request_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;

COMMENT ON COLUMN payments.client_request_id IS
  'Llave de idempotencia opcional. Si se envía, reintentar el mismo cobro no lo duplica.';
COMMENT ON COLUMN payments.occurred_at IS
  'Hora real en que se recibió el dinero. Si es NULL se asume created_at.';

-- UNIQUE sobre una columna nullable: en Postgres los NULL son distintos entre
-- sí, así que no estorba a las filas que no la usan.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_client_request_id_key'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_client_request_id_key UNIQUE (client_request_id);
  END IF;
END $$;

-- ── Helper compartido: aplica una compra de plan a un cliente ────────────────
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
  v_live      public.memberships%rowtype;
  v_remaining int;
  v_mem_id    uuid;
begin
  -- Membresía vigente a la fecha de la compra. Si hay varias (datos históricos
  -- con solapamientos), se toma la de vencimiento más lejano: el mismo criterio
  -- que usa el check-in, para no contradecirlo.
  select * into v_live
  from public.memberships m
  where m.client_id = p_client_id
    and m.status <> 'cancelled'
    and public.membership_effective_status(m, p_start_date) in ('active', 'grace')
  order by m.end_date desc
  limit 1
  for update;

  if found then
    -- Días que aún no ha consumido, con el ritmo que tenía ESA membresía.
    v_remaining := greatest(
      0,
      v_live.total_days - public.eligible_days_elapsed(
        v_live.start_date,
        p_start_date,
        case when v_live.total_days <= 20 then 5 else 6 end
      )
    );

    -- Se reinicia start_date a la fecha de la compra a propósito.
    --
    -- El ritmo semanal (5 o 6 días) se deduce de total_days: al acumular, ese
    -- número puede cruzar el umbral de 20 y cambiar el ritmo. Si se conservara
    -- el start_date original, ese ritmo nuevo se aplicaría RETROACTIVAMENTE a
    -- los días ya transcurridos y el cliente perdería tiempo que ya pagó.
    -- Reiniciando la fecha, el ritmo nuevo solo cuenta hacia adelante y el
    -- cliente conserva exactamente los días que le quedaban más los comprados.
    update public.memberships
       set total_days  = v_remaining + p_total_days,
           start_date  = p_start_date,
           -- Mismo cálculo que muestra la pantalla al admin. Si la membresía ya
           -- venció pero sigue en periodo de gracia, se cuenta desde la compra.
           end_date    = greatest(v_live.end_date, p_start_date) + p_duration_days,
           plan_id     = coalesce(p_plan_id, v_live.plan_id),
           price_cents = p_price_cents,
           grace_days  = p_grace_days,
           status      = 'active',
           updated_at  = now()
     where id = v_live.id
    returning id into v_mem_id;

    return v_mem_id;
  end if;

  -- Sin membresía vigente: se crea una nueva desde la fecha de la compra.
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

REVOKE ALL ON FUNCTION public.apply_membership_purchase(uuid, uuid, uuid, integer, integer, integer, date, integer) FROM public, anon, authenticated;

-- ── Aprobación de comprobantes (manual y por IA) ─────────────────────────────
-- Debe acumular igual que el efectivo: renovar por transferencia no puede dar
-- un resultado distinto a renovar en efectivo.
CREATE OR REPLACE FUNCTION public.approve_payment(
  p_payment_id uuid,
  p_total_days integer DEFAULT NULL::integer,
  p_duration_days integer DEFAULT NULL::integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_admin         uuid := auth.uid();
  v_pay           public.payments%rowtype;
  v_gym           public.gyms%rowtype;
  v_plan          public.plans%rowtype;
  v_mem_id        uuid;
  v_start_date    date;
  v_total_days    int;
  v_duration_days int;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'code', 'UNAUTHORIZED', 'message', 'No tienes permiso.');
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Pago no encontrado.');
  end if;
  if v_pay.status <> 'pending' then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_PROCESSED',
      'message', 'Este pago ya fue procesado.');
  end if;

  if v_pay.plan_id is not null then
    select * into v_plan from public.plans where id = v_pay.plan_id;
    v_total_days    := coalesce(p_total_days, v_plan.days);
    v_duration_days := coalesce(p_duration_days, v_plan.duration_days);
  else
    v_total_days    := coalesce(p_total_days, 30);
    v_duration_days := coalesce(p_duration_days, 30);
  end if;

  select * into v_gym from public.gyms where id = v_pay.gym_id;
  -- Si el pago trae la hora real (cobro sin conexión), se respeta.
  v_start_date := (coalesce(v_pay.occurred_at, now()) at time zone v_gym.timezone)::date;

  v_mem_id := public.apply_membership_purchase(
    v_pay.gym_id, v_pay.client_id, v_pay.plan_id,
    v_total_days, v_duration_days, v_pay.amount_cents,
    v_start_date, v_gym.grace_days
  );

  update public.payments
  set status       = 'approved',
      membership_id = v_mem_id,
      reviewed_by  = v_admin,
      reviewed_at  = now(),
      updated_at   = now()
  where id = p_payment_id;

  return jsonb_build_object(
    'ok',           true,
    'code',         'APPROVED',
    'membership_id', v_mem_id,
    'total_days',   v_total_days,
    'end_date',     (select end_date::text from public.memberships where id = v_mem_id)
  );
end;
$function$;
