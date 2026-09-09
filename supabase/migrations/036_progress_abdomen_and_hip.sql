-- ============================================================================
-- 036 — Abdomen y cadera en el seguimiento.  [APLICADA 2026-09-09]
--
-- Dos medidas opcionales más que el cliente puede registrar, junto a cintura,
-- pecho, brazo y pierna.
--
-- Van como COLUMNAS PROPIAS, no dentro del jsonb `measurements` que ya existe:
-- las medidas con columna se grafican y se comparan entre fechas sin
-- desempaquetar JSON, y eso es justo para lo que sirve esta pantalla. El jsonb
-- queda para lo que no tenga columna.
--
-- `double precision` para igualar a las cuatro que ya estaban. Nulas porque son
-- opcionales: la mayoría de registros no las traerán.
--
-- ⚠️ `bmi` es GENERATED ALWAYS y no se toca aquí. Verificado tras aplicar que
-- se sigue calculando.
-- ============================================================================

ALTER TABLE public.progress_records
  ADD COLUMN IF NOT EXISTS abdomen_cm double precision,
  ADD COLUMN IF NOT EXISTS hip_cm     double precision;

COMMENT ON COLUMN public.progress_records.abdomen_cm IS 'Perímetro abdominal en cm. Opcional.';
COMMENT ON COLUMN public.progress_records.hip_cm     IS 'Perímetro de cadera en cm. Opcional.';
