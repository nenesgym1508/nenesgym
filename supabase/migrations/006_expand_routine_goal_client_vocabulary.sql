-- ============================================================
-- MIGRACIÓN 006: Amplía el vocabulario de "goal" en client_routines
--               y routine_templates para admitir objetivos en
--               lenguaje humano pensados para el cliente, además
--               del vocabulario técnico heredado de Clases.
-- Aplicar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE client_routines DROP CONSTRAINT client_routines_goal_check;
ALTER TABLE client_routines ADD CONSTRAINT client_routines_goal_check CHECK (goal IN (
  'fuerza','hipertrofia','cardio','tecnica','movilidad','full_body','general',
  'ganar_musculo','bajar_peso','mejorar_resistencia','tonificar','mantenerse_activo'
));

ALTER TABLE routine_templates DROP CONSTRAINT routine_templates_goal_check;
ALTER TABLE routine_templates ADD CONSTRAINT routine_templates_goal_check CHECK (goal IN (
  'fuerza','hipertrofia','cardio','tecnica','movilidad','full_body','general',
  'ganar_musculo','bajar_peso','mejorar_resistencia','tonificar','mantenerse_activo'
));
