-- ============================================================================
-- 044 — Finanzas: ingresos y egresos que NO son cobros de planes.
--
-- La pestaña Pagos → Finanzas resume el mes del gimnasio. Los cobros de planes
-- ya viven en `payments` y se suman desde ahí: NO se copian aquí, para que no
-- haya dos fuentes del mismo dinero que puedan descuadrarse. Esta tabla guarda
-- solo lo que el dueño anota a mano: venta de bebidas, arriendo, servicios,
-- pago a entrenadores, compra de equipos…
--
-- Solo el admin del gimnasio lee y escribe (RLS). A diferencia de
-- `client_plan_debts`, aquí sí hay policy: el acceso directo es el camino
-- normal, no hace falta pasar por funciones SECURITY DEFINER.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.finance_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id       uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('income', 'expense')),
  concept      text NOT NULL CHECK (char_length(btrim(concept)) BETWEEN 1 AND 120),
  -- Centavos, como el resto del proyecto (payments.amount_cents). Tope en
  -- 1.000 millones de pesos: un error de dedo con ceros de más no debe poder
  -- convertir el balance del mes en un número absurdo.
  amount_cents bigint NOT NULL CHECK (amount_cents > 0 AND amount_cents <= 100000000000),
  occurred_on  date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Bogota')::date),
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- El panel siempre consulta "este gimnasio, este mes".
CREATE INDEX IF NOT EXISTS finance_entries_gym_month_idx
  ON public.finance_entries (gym_id, occurred_on DESC);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_finance_entries" ON public.finance_entries;
CREATE POLICY "admin_all_finance_entries" ON public.finance_entries
  FOR ALL
  USING      (gym_id = (SELECT public.current_gym_id()) AND (SELECT public.is_admin()))
  WITH CHECK (gym_id = (SELECT public.current_gym_id()) AND (SELECT public.is_admin()));

-- Lección de la migración 038: REVOKE ... FROM PUBLIC no le quita el permiso a
-- `anon` en Supabase. Hay que nombrarlo.
REVOKE ALL ON public.finance_entries FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.finance_entries TO authenticated;
