-- ============================================================================
-- 039 — Marcar como NO PAGADO a un cliente que YA tiene su plan.
--
-- El caso: clientes dados de alta antes de que existiera el cobro a crédito, o
-- cualquiera al que se le activó el plan marcándolo "Pagado" por error. Hasta
-- ahora la deuda solo podía nacer al vender (`create_unpaid_plan`), así que
-- esos casos no tenían forma de corregirse.
--
-- ⚠️ NO llama a `apply_membership_purchase`, a diferencia de
-- `create_unpaid_plan`. El cliente YA tiene sus días; esto solo anota que el
-- dinero no entró. Si se reutilizara aquella función, cada corrección de estado
-- le regalaría un plan entero de días.
--
-- La deuda se engancha a su membresía vigente (y al plan de esa membresía) para
-- que el registro diga de qué venta viene. Si no tiene ninguna, se admite
-- igualmente: puede deber el plan que se le acaba de vencer.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_client_debt(
  p_client_id    uuid,
  p_amount_cents integer,
  p_request_id   uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_gym_id uuid;
  v_mem    public.memberships%rowtype;
  v_id     uuid;
begin
  if not public.is_admin() then
    raise exception 'Sin permisos';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'El monto debe ser mayor que cero';
  end if;

  select gym_id into v_gym_id from public.clients where id = p_client_id;
  if v_gym_id is null then
    raise exception 'Cliente no encontrado';
  end if;
  if v_gym_id <> (select public.current_gym_id()) then
    raise exception 'Cliente de otro gimnasio';
  end if;

  -- Membresía de vencimiento más lejano: el mismo criterio que usa el check-in.
  select * into v_mem
    from public.memberships
   where client_id = p_client_id and status <> 'cancelled'
   order by end_date desc
   limit 1;

  insert into public.client_plan_debts(client_id, membership_id, plan_id, amount_cents, request_id)
  values (p_client_id, v_mem.id, v_mem.plan_id, p_amount_cents, p_request_id)
  on conflict (request_id) do nothing
  returning id into v_id;

  -- Sin id = era un reintento del mismo clic. Idempotente, no es un error.
  return jsonb_build_object('ok', true, 'duplicada', v_id is null);
end;
$function$;

-- ⚠️ Nombrar `anon` explícitamente: REVOKE FROM PUBLIC no le quita el EXECUTE
-- que los privilegios por defecto de Supabase le conceden (ver migración 038).
REVOKE ALL ON FUNCTION public.add_client_debt(uuid, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_client_debt(uuid, integer, uuid) TO authenticated;
