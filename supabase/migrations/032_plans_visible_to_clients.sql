-- ============================================================================
-- 032 — Planes que el socio NO ve al ir a pagar.  [APLICADA 2026-09-01]
--
-- Caso real: las tarifas de estudiante. El dueño no quiere que aparezcan en la
-- lista pública —cualquiera elegiría la más barata— pero sí quiere poder
-- asignarlas a mano a quien corresponda.
--
-- La regla importante está en el código (getPlansVisibleToClient): una vez que
-- a un socio se le asignó el plan, ESE socio sí lo ve y puede renovarlo solo.
-- Sin eso, cada renovación de un estudiante tendría que pasar por el mostrador.
--
-- ⚠️ Se separa de `is_active`, que significa otra cosa: `is_active = false` es
-- un plan retirado que ya no se vende a nadie, ni siquiera el admin. Este es un
-- plan vivo y vendible, solo que no se anuncia.
-- ============================================================================

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS visible_to_clients boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.plans.visible_to_clients IS
  'false = no aparece en la lista que ve el socio al pagar. El admin sí puede asignarlo, y quien ya lo tuvo alguna vez vuelve a verlo para renovar.';
