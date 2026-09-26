-- Saldos pendientes de todo el gimnasio, en UNA sola llamada.
--
-- `admin_client_debts(p_client_ids)` obliga a conocer los ids de los clientes,
-- y eso encadenaba dos viajes a la base en `/admin/clientes`: primero la
-- búsqueda, después los saldos. Esa cascada es lo que el profesor notaba como
-- "las pestañas se quedan cargando".
--
-- Resolverlo desde el servidor con un `select` a `client_plan_debts` NO es
-- opción: la tabla tiene RLS activado y **cero policies** (migración 037), así
-- que se lee solo por funciones SECURITY DEFINER. Un select directo devuelve
-- 0 filas SIN error — la app enseñaría "sin deudas" a quien debe dinero.
--
-- Esta función hace el join contra `clients` por dentro, así que el servidor
-- pide los saldos en paralelo con todo lo demás, sin saber a quién consultar.

CREATE OR REPLACE FUNCTION public.admin_gym_debts()
RETURNS TABLE(id uuid, client_id uuid, amount_cents integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.client_id, d.amount_cents
  FROM public.client_plan_debts d
  JOIN public.clients c ON c.id = d.client_id
  WHERE public.is_admin()
    AND c.gym_id = public.current_gym_id()
    AND d.paid_at IS NULL;
$$;

-- Mismo criterio que el resto de funciones de deuda (migraciones 037 y 038):
-- nunca `anon`, solo sesiones autenticadas — y dentro la función exige is_admin().
REVOKE ALL ON FUNCTION public.admin_gym_debts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_gym_debts() TO authenticated;
