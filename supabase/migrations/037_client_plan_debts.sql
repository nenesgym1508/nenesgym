-- Debt is separate from receipt review: granting days is not collecting money.
create table public.client_plan_debts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  plan_id uuid references public.plans(id) on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  request_id uuid not null unique,
  payment_id uuid references public.payments(id) on delete set null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.client_plan_debts enable row level security;
create index on public.client_plan_debts(client_id) where paid_at is null;

create function public.admin_client_debts(p_client_ids uuid[])
returns table(id uuid, client_id uuid, amount_cents integer)
language sql security definer set search_path = public as $$
  select d.id, d.client_id, d.amount_cents from public.client_plan_debts d
  where public.is_admin() and d.client_id = any(p_client_ids) and d.paid_at is null;
$$;

create function public.create_unpaid_plan(p_client_id uuid, p_amount_cents integer,
  p_total_days integer, p_duration_days integer, p_request_id uuid, p_plan_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_gym public.gyms%rowtype;
  v_id uuid;
  v_mem uuid;
begin
  if not public.is_admin() then raise exception 'Sin permisos'; end if;
  if p_amount_cents is null or p_amount_cents < 0 or p_total_days is null
    or p_duration_days is null or p_total_days not between 1 and 400
    or p_duration_days not between 1 and 400 then raise exception 'Datos del plan inválidos'; end if;
  perform 1 from public.clients where id = p_client_id for update;
  if not found then raise exception 'Cliente no encontrado'; end if;
  select g.* into v_gym from public.gyms g join public.clients c on c.gym_id = g.id where c.id = p_client_id;
  if p_plan_id is not null and not exists(select 1 from public.plans where id = p_plan_id and gym_id = v_gym.id)
    then raise exception 'Plan inválido'; end if;
  insert into public.client_plan_debts(client_id, plan_id, amount_cents, request_id)
    values(p_client_id, p_plan_id, p_amount_cents, p_request_id)
    on conflict(request_id) do nothing returning id into v_id;
  if v_id is null then return jsonb_build_object('ok', true); end if;
  v_mem := public.apply_membership_purchase(v_gym.id, p_client_id, p_plan_id,
    p_total_days, p_duration_days, p_amount_cents, (now() at time zone v_gym.timezone)::date, v_gym.grace_days);
  update public.client_plan_debts set membership_id = v_mem where id = v_id;
  return jsonb_build_object('ok', true);
end;
$$;

create function public.settle_client_debt(p_debt_id uuid, p_method text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_debt public.client_plan_debts%rowtype;
  v_payment uuid;
begin
  if not public.is_admin() then raise exception 'Sin permisos'; end if;
  if p_method is null or p_method not in ('cash','transfer','nequi','daviplata','other') then raise exception 'Método inválido'; end if;
  select * into v_debt from public.client_plan_debts where id = p_debt_id for update;
  if not found then raise exception 'Deuda no encontrada'; end if;
  if v_debt.paid_at is not null then return jsonb_build_object('ok', true); end if;
  insert into public.payments(gym_id, client_id, plan_id, membership_id, amount_cents,
    method, status, client_request_id, occurred_at, reviewed_by, reviewed_at, note)
  select c.gym_id, c.id, v_debt.plan_id, v_debt.membership_id, v_debt.amount_cents,
    p_method::public.payment_method, 'approved', v_debt.request_id, now(), auth.uid(), now(), 'Pago de saldo pendiente; días otorgados previamente'
  from public.clients c where c.id = v_debt.client_id returning id into v_payment;
  update public.client_plan_debts set paid_at = now(), payment_id = v_payment where id = p_debt_id;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_client_debts(uuid[]), public.create_unpaid_plan(uuid,integer,integer,integer,uuid,uuid), public.settle_client_debt(uuid,text) from public;
grant execute on function public.admin_client_debts(uuid[]), public.create_unpaid_plan(uuid,integer,integer,integer,uuid,uuid), public.settle_client_debt(uuid,text) to authenticated;
