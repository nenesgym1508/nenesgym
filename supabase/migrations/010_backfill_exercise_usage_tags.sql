-- ============================================================
-- MIGRACIÓN 010: Clasificación automática de usage_tags para
-- los ejercicios existentes (reglas simples basadas en exercise_type).
-- ============================================================

UPDATE exercises
SET usage_tags = CASE exercise_type
  WHEN 'cardio'       THEN ARRAY['calentamiento','complementario']
  WHEN 'movilidad'    THEN ARRAY['calentamiento','estiramiento']
  WHEN 'estiramiento' THEN ARRAY['estiramiento']
  WHEN 'tecnica'      THEN ARRAY['trabajo_principal']
  WHEN 'fuerza'       THEN ARRAY['trabajo_principal','complementario']
  ELSE ARRAY['trabajo_principal']
END
WHERE usage_tags = '{}';
