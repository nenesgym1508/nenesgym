-- ============================================================
-- MIGRACIÓN 007: Objetivo personalizado ("Otro") en Rutinas.
--               "goal" sigue siendo una lista controlada (útil para
--               filtros/estadísticas futuras); se agrega el valor
--               'otro' y una columna separada "custom_goal" para el
--               texto libre que escribe el cliente cuando lo elige.
-- Aplicar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE client_routines DROP CONSTRAINT client_routines_goal_check;
ALTER TABLE client_routines ADD CONSTRAINT client_routines_goal_check CHECK (goal IN (
  'fuerza','hipertrofia','cardio','tecnica','movilidad','full_body','general',
  'ganar_musculo','bajar_peso','mejorar_resistencia','tonificar','mantenerse_activo','otro'
));
ALTER TABLE client_routines ADD COLUMN custom_goal TEXT;
ALTER TABLE client_routines ADD CONSTRAINT client_routines_custom_goal_check
  CHECK (custom_goal IS NULL OR (length(trim(custom_goal)) > 0 AND length(custom_goal) <= 60));

ALTER TABLE routine_templates DROP CONSTRAINT routine_templates_goal_check;
ALTER TABLE routine_templates ADD CONSTRAINT routine_templates_goal_check CHECK (goal IN (
  'fuerza','hipertrofia','cardio','tecnica','movilidad','full_body','general',
  'ganar_musculo','bajar_peso','mejorar_resistencia','tonificar','mantenerse_activo','otro'
));
ALTER TABLE routine_templates ADD COLUMN custom_goal TEXT;
ALTER TABLE routine_templates ADD CONSTRAINT routine_templates_custom_goal_check
  CHECK (custom_goal IS NULL OR (length(trim(custom_goal)) > 0 AND length(custom_goal) <= 60));
