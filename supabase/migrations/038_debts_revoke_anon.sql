-- ============================================================================
-- 038 — Quitarle a `anon` el EXECUTE sobre las funciones de deuda.
--       [APLICADA 2026-09-11]
--
-- ⚠️ EL GOTCHA, y vale para toda función nueva de este proyecto:
--    `REVOKE ALL ... FROM PUBLIC` NO BASTA en Supabase.
--
-- El proyecto tiene privilegios por defecto que conceden EXECUTE a `anon`,
-- `authenticated` y `service_role` sobre cada función nueva del esquema
-- `public`. Esa concesión es EXPLÍCITA para el rol `anon`, y revocar de PUBLIC
-- no la toca: PUBLIC es el pseudo-rol de "todos", no la lista de roles.
--
-- La 037 solo revocó de PUBLIC. Comprobado tras aplicarla:
--     proacl = postgres=X | anon=X | authenticated=X | service_role=X
-- y un cliente anónimo podía invocar admin_client_debts sin error.
--
-- FUGA REAL NO HABÍA: las tres funciones comprueban `is_admin()` por dentro
-- (admin_client_debts devuelve cero filas, las otras dos lanzan excepción).
-- Pero dejar la puerta abierta significa que basta tocar el guardia interno
-- para convertirlo en fuga. Se cierra la puerta además del guardia.
--
-- Las migraciones 026 y 027 ya nombraban `anon` expresamente. Esta se alinea
-- con esa convención.
-- ============================================================================

REVOKE ALL ON FUNCTION public.admin_client_debts(uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_unpaid_plan(uuid, integer, integer, integer, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.settle_client_debt(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_client_debts(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_unpaid_plan(uuid, integer, integer, integer, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.settle_client_debt(uuid, text) TO authenticated;
