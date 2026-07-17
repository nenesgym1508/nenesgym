-- Búsqueda + filtro de estado + paginación de clientes (panel admin) en Postgres.
-- Reemplaza la carga completa de la tabla clients (que no escala) por una consulta
-- paginada con conteo total en una sola llamada.
--
-- SECURITY INVOKER: se ejecuta con los permisos y las políticas RLS del usuario que
-- la llama (el admin). NO usar SECURITY DEFINER: eso saltaría RLS.
--
-- El estado "activo" aquí es date-based (membresía no cancelada cuya vigencia +
-- días de gracia aún no vence). El badge exacto por tarjeta lo sigue calculando el
-- front en JS (computeEffectiveStatus). En casos borde (plan agotado por días hábiles
-- transcurridos) el badge puede diferir de este filtro; es intencional para mantener
-- el SQL simple y robusto.
--
-- Parámetros:
--   p_search  texto libre (nombre o email, ilike). null = sin filtro de texto.
--   p_status  'todos' | 'activos' | 'sin_membresia'
--   p_today   fecha "hoy" en la zona del gimnasio (YYYY-MM-DD), la calcula el server.
--   p_limit / p_offset  paginación.

create or replace function admin_search_clients(
  p_search text default null,
  p_status text default 'todos',
  p_today date default current_date,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  auto_aprobacion boolean,
  comprobante_bloqueado boolean,
  full_name text,
  email text,
  membership jsonb,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      c.id,
      c.auto_aprobacion,
      c.comprobante_bloqueado,
      p.full_name,
      p.email,
      lm.membership,
      lm.is_active
    from clients c
    join profiles p on p.id = c.profile_id and p.role = 'client'
    left join lateral (
      select
        jsonb_build_object(
          'status', m.status,
          'total_days', m.total_days,
          'used_days', m.used_days,
          'start_date', m.start_date,
          'end_date', m.end_date,
          'grace_days', m.grace_days,
          'plan', case when pl.id is null then null
                       else jsonb_build_object('name', pl.name, 'days', pl.days) end
        ) as membership,
        (m.status <> 'cancelled' and p_today <= (m.end_date::date + m.grace_days)) as is_active
      from memberships m
      left join plans pl on pl.id = m.plan_id
      where m.client_id = c.id and m.status <> 'cancelled'
      order by m.end_date desc
      limit 1
    ) lm on true
    where
      (
        p_search is null
        or p.full_name ilike '%' || p_search || '%'
        or p.email ilike '%' || p_search || '%'
      )
      and (
        p_status = 'todos'
        or (p_status = 'activos' and coalesce(lm.is_active, false))
        or (p_status = 'sin_membresia' and not coalesce(lm.is_active, false))
      )
  )
  select
    base.id,
    base.auto_aprobacion,
    base.comprobante_bloqueado,
    base.full_name,
    base.email,
    base.membership,
    count(*) over() as total_count
  from base
  order by base.full_name asc nulls last
  offset greatest(p_offset, 0)
  limit greatest(p_limit, 1);
$$;
