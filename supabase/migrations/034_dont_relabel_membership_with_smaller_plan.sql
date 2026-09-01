-- ============================================================================
-- 034 — Un plan más pequeño ya no reetiqueta la membresía.
--
-- EL FALLO. Al acumular, `apply_membership_purchase` hacía:
--
--     plan_id     = coalesce(p_plan_id, v_live.plan_id),
--     price_cents = p_price_cents,
--
-- es decir, el ÚLTIMO plan cobrado se quedaba como el plan de la membresía,
-- fuera cual fuera su tamaño. Medido contra producción con un cliente
-- desechable:
--
--   antes de cobrar:  "Mensual estudiante (20 días)"  ·  $80.000  ·  20 días
--   se cobra 1 día suelto encima
--   después:          "Día suelto"                    ·  $6.000   ·  21 días
--
-- Los días y el vencimiento suman bien (+1 y +1, correcto). Lo que estaba mal
-- era la ETIQUETA: el cliente que pagó un mes aparecía en el listado como "Día
-- suelto", y el precio guardado pasaba de 80.000 a 6.000.
--
-- No es un caso rebuscado: el botón "Pago 1 día" del listado de clientes está
-- siempre a un toque, junto a "Expandir plan".
--
-- LA REGLA NUEVA. El plan y el precio solo se reescriben si el plan que entra
-- es de MÁS o IGUAL tamaño que el que ya figura:
--
--   · 1 día sobre un mensual   -> suma el día, NO toca la etiqueta.   (el fallo)
--   · mensual sobre 1 día      -> reetiqueta a mensual.               (correcto)
--   · mensual sobre mensual    -> reetiqueta, es la renovación normal.
--
-- Lo demás de la función queda EXACTAMENTE igual: mismos días acumulados, mismo
-- reinicio de start_date, mismo cálculo de end_date. Solo cambian dos campos.
-- ============================================================================

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
    v_remaining := greatest(
      0,
      v_live.total_days - public.eligible_days_elapsed(
        v_live.start_date,
        p_start_date,
        case when v_live.total_days <= 20 then 5 else 6 end
      )
    );

    -- ¿De cuántos días es el plan que figura ahora en la membresía?
    -- Si no hay plan (compra suelta), cuenta como 0 y cualquiera lo reetiqueta.
    select days into v_dias_actuales from public.plans where id = v_live.plan_id;

    v_reetiquetar := p_plan_id is not null
                     and coalesce(p_total_days, 0) >= coalesce(v_dias_actuales, 0);

    -- start_date se reinicia a la fecha de compra a propósito: el ritmo semanal
    -- (5 o 6 días) se deduce de total_days y al acumular puede cruzar el umbral
    -- de 20. Conservando la fecha original, ese ritmo nuevo se aplicaría
    -- RETROACTIVAMENTE y el cliente perdería tiempo ya pagado.
    update public.memberships
       set total_days  = v_remaining + p_total_days,
           start_date  = p_start_date,
           end_date    = greatest(v_live.end_date, p_start_date) + p_duration_days,
           -- Solo si el plan que entra no es más pequeño que el que ya está.
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
