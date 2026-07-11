-- ============================================================
-- MIGRACIÓN 009: Uso recomendado del ejercicio dentro de una rutina
-- (calentamiento / trabajo_principal / complementario / estiramiento)
-- Un ejercicio puede tener más de una etiqueta (ej. bicicleta estática
-- puede ser calentamiento y cardio).
-- ============================================================

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS usage_tags TEXT[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercises_usage_tags_valid') THEN
    ALTER TABLE exercises ADD CONSTRAINT exercises_usage_tags_valid CHECK (
      usage_tags <@ ARRAY['calentamiento','trabajo_principal','complementario','estiramiento']::text[]
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_exercises_usage_tags ON exercises USING GIN (usage_tags);
