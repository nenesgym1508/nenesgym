-- ============================================================================
-- 029 — El buscador de socios: sin tildes y sin comodines sueltos.
--
-- Dos fallos reales, medidos contra 400 socios sembrados en producción y
-- borrados después.
--
-- 1) COMODINES SIN ESCAPAR. El término del admin se metía tal cual dentro de
--    '%' || p_search || '%'. Como ILIKE interpreta % y _, el resultado era:
--
--       buscar "%"    ->  devolvía los 402 socios
--       buscar "_"    ->  devolvía los 402 socios
--       buscar "50%"  ->  5 resultados en vez de 1
--
--    Se escapa \, % y _ en ese orden (la barra PRIMERO: si se escapara al
--    final, se duplicarían las barras que introducen los otros dos).
--
-- 2) SIN INSENSIBILIDAD A ACENTOS. "Munoz" no encontraba a "Muñóz". En Colombia
--    el admin teclea sin tildes casi siempre, así que el socio "no existía".
--    Se aplica unaccent() a los DOS lados: al término y a la columna. Así
--    funciona en ambas direcciones — teclear con tilde encuentra lo guardado
--    sin ella y al revés.
--
-- ⚠️ COSTE ACEPTADO: unaccent() sobre la columna impide usar un índice de texto
-- y obliga a recorrer la tabla. Es deliberado: medido con 402 socios, la
-- búsqueda tarda 223ms de los cuales ~180ms son latencia de red. Un gimnasio no
-- llega a los volúmenes donde esto importe. Si algún día llegara, la salida es
-- una columna generada `full_name_norm` con índice GIN/trigram, no revertir
-- esto.
--
-- ⚠️ unaccent() es STABLE, no IMMUTABLE (depende del diccionario instalado).
-- Por eso NO puede ir en un índice sin envolverla, y por eso esta función se
-- mantiene `stable` y no `immutable`.
--
-- El resto de la función queda EXACTAMENTE igual que en
-- migrations/admin_search_clients.sql: mismos parámetros, mismas columnas
-- devueltas, mismo SECURITY INVOKER, mismo criterio de estado. Solo cambia el
-- filtro de texto.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CÓMO COMPROBAR QUE QUEDÓ BIEN (pegar DESPUÉS, con socios ya en la base):
--
--   -- 1. Sin tildes debe encontrar al socio con tildes:
--   select full_name from admin_search_clients('Munoz', 'todos', current_date, 10, 0);
--
--   -- 2. Un "%" suelto NO debe devolver el padrón entero:
--   select count(*) from admin_search_clients('%', 'todos', current_date, 500, 0);
--   --    antes: todos los socios · ahora: solo los que llevan un % en el nombre
--
--   -- 3. Un "_" suelto, igual:
--   select count(*) from admin_search_clients('_', 'todos', current_date, 500, 0);
--
--   -- 4. Y una búsqueda normal debe seguir funcionando igual que siempre:
--   select count(*) from admin_search_clients('a', 'todos', current_date, 500, 0);
--
-- Si algo sale mal, la versión anterior de la función está en git:
--   git log --diff-filter=D --oneline -- migrations/admin_search_clients.sql
--   git show <commit>^:migrations/admin_search_clients.sql
-- Este archivo no borra ni altera ninguna tabla: solo redefine una función.
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION public.admin_search_clients(
  p_search text default null,
  p_status text default 'todos',
  p_today date default current_date,
  p_limit int default 20,
  p_offset int default 0
)
RETURNS TABLE (
  id uuid,
  auto_aprobacion boolean,
  comprobante_bloqueado boolean,
  full_name text,
  email text,
  membership jsonb,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  with q as (
    select
      case
        when p_search is null or btrim(p_search) = '' then null
        else '%' ||
             replace(
               replace(
                 replace(unaccent(btrim(p_search)), '\', '\\'),
               '%', '\%'),
             '_', '\_') ||
             '%'
      end as patron
  ),
  base as (
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
    cross join q
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
        q.patron is null
        or unaccent(p.full_name) ilike q.patron
        or unaccent(p.email) ilike q.patron
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
