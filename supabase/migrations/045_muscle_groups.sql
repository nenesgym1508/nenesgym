-- ============================================================================
-- 045 — Grupos musculares editables por el gimnasio.
--
-- El grupo muscular de un ejercicio era una lista fija (exercises_muscle_group_
-- check, 11 valores). El dueño pidió poder agregar los suyos —antebrazo,
-- cuádriceps, isquiotibiales…— sin pedírselo a nadie. Ahora la lista vive en esta
-- tabla, se siembra con los 11 de siempre, y el admin agrega desde el formulario
-- del ejercicio.
--
-- `key` es lo que se guarda en exercises.muscle_group y en
-- secondary_muscle_groups; NO cambia nunca. Lo que se edita es `label`, y un
-- grupo se oculta con `is_active`, no se borra: hay ejercicios que lo usan.
--
-- Nota sobre el estado real de producción (verificado 2026-10-05): la 002 del
-- repo crea un CHECK SIN 'gluteo' y no crea secondary_muscle_groups; en
-- producción una migración aplicada por MCP (20260629070504
-- exercises_add_gluteo_secondary_source) ya agregó 'gluteo' al CHECK y la
-- columna secondary_muscle_groups (text[] sin CHECK). Esta migración parte de
-- ese estado: quita el CHECK por su nombre exacto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.muscle_groups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id     uuid NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  -- Minúsculas, sin tildes ni espacios: es la clave que guardan los ejercicios.
  key        text NOT NULL CHECK (key ~ '^[a-z0-9_]{1,40}$'),
  label      text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 40),
  position   integer NOT NULL DEFAULT 100,
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gym_id, key)
);

-- Sin dos «Glúteo» escritos distinto en el mismo gimnasio.
CREATE UNIQUE INDEX IF NOT EXISTS muscle_groups_gym_label_uq
  ON public.muscle_groups (gym_id, lower(btrim(label)));

-- Los 11 de siempre, con sus nombres y su orden, en cada gimnasio.
INSERT INTO public.muscle_groups (gym_id, key, label, position)
SELECT g.id, v.key, v.label, v.position
FROM public.gyms g
CROSS JOIN (VALUES
  ('pecho',     'Pecho',     1),
  ('espalda',   'Espalda',   2),
  ('pierna',    'Pierna',    3),
  ('hombro',    'Hombro',    4),
  ('biceps',    'Bíceps',    5),
  ('triceps',   'Tríceps',   6),
  ('abdomen',   'Abdomen',   7),
  ('gluteo',    'Glúteo',    8),
  ('cardio',    'Cardio',    9),
  ('movilidad', 'Movilidad', 10),
  ('full_body', 'Full Body', 11)
) AS v(key, label, position)
ON CONFLICT (gym_id, key) DO NOTHING;

-- La lista fija se va: ahora la manda la tabla.
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_muscle_group_check;

ALTER TABLE public.muscle_groups ENABLE ROW LEVEL SECURITY;

-- El admin del gimnasio crea, renombra y oculta.
DROP POLICY IF EXISTS "admin_all_muscle_groups" ON public.muscle_groups;
CREATE POLICY "admin_all_muscle_groups" ON public.muscle_groups
  FOR ALL
  USING      (gym_id = (SELECT public.current_gym_id()) AND (SELECT public.is_admin()))
  WITH CHECK (gym_id = (SELECT public.current_gym_id()) AND (SELECT public.is_admin()));

-- Los socios los leen: los usan su formulario de ejercicios, los filtros y sus rutinas.
DROP POLICY IF EXISTS "members_select_muscle_groups" ON public.muscle_groups;
CREATE POLICY "members_select_muscle_groups" ON public.muscle_groups
  FOR SELECT
  USING (gym_id = (SELECT public.current_gym_id()));

-- Lección de la migración 038: REVOKE ... FROM PUBLIC no le quita el permiso a
-- `anon` en Supabase. Hay que nombrarlo.
REVOKE ALL ON public.muscle_groups FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.muscle_groups TO authenticated;
