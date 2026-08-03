-- ============================================================
-- MIGRACIÓN 025: Catálogo de Ejercicios de Calentamiento y Estiramiento
-- Inserta los 18 ejercicios fundamentales de Calentamiento Dinámico
-- y Estiramientos Estáticos en la biblioteca global del gimnasio.
-- ============================================================

DO $$
DECLARE
  v_gym_id UUID;
BEGIN
  -- Obtiene el ID del gimnasio
  SELECT id INTO v_gym_id FROM public.gyms LIMIT 1;
  IF v_gym_id IS NULL THEN
    v_gym_id := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  END IF;

  -- 1. Estiramiento de Pectoral en Marco de Puerta
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Pectoral en Marco de Puerta', 'pecho', ARRAY['hombro'], 'peso_corporal',
    'estiramiento', 'Apoya el antebrazo en el marco de una puerta o columna a 90 grados. Gira levemente el torso en dirección contraria hasta sentir la elongación del pecho. Mantén 20-30 segundos por lado.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 2. Estiramiento de Dorsal y Espalda Colgado
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Dorsal y Espalda Colgado', 'espalda', ARRAY['hombro'], 'barra',
    'estiramiento', 'Sujétate con ambas manos a una barra fija o estructura y deja caer el peso de tu cuerpo con la cadera relajada para descomprimir la columna y elongar el dorsal ancho. Mantén 20-30 segundos.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 3. Estiramiento de Isquiotibiales de Pie
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Isquiotibiales de Pie', 'pierna', ARRAY['gluteo'], 'peso_corporal',
    'estiramiento', 'Apoya un talón en un escalón o superficie elevada con la rodilla extendida. Inclina suavemente la cadera hacia adelante manteniendo la espalda recta hasta sentir tensión en la parte posterior del muslo.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 4. Estiramiento de Cuádriceps de Pie
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Cuádriceps de Pie', 'pierna', ARRAY['gluteo'], 'peso_corporal',
    'estiramiento', 'De pie, flexiona una rodilla llevando el talón hacia el glúteo y sujeta el tobillo con la mano. Mantén ambas rodillas alineadas y la pelvis ligeramente neutra.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 5. Estiramiento de Glúteo Piriforme (Figura 4)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Glúteo Piriforme (Figura 4)', 'gluteo', ARRAY['pierna'], 'peso_corporal',
    'estiramiento', 'Tumbado boca arriba, cruza un tobillo sobre la rodilla opuesta formando un 4. Sujeta el muslo inferior por detrás y atrápalo suavemente hacia el pecho.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 6. Estiramiento Cruzado de Hombro (Deltoides)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento Cruzado de Hombro (Deltoides)', 'hombro', ARRAY['espalda'], 'peso_corporal',
    'estiramiento', 'Cruza un brazo extendido por delante del pecho a la altura del hombro. Utiliza el otro brazo para presionar suavemente hacia el pecho sin rotar el tronco.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 7. Estiramiento de Tríceps sobre la Cabeza
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Tríceps sobre la Cabeza', 'triceps', ARRAY['hombro'], 'peso_corporal',
    'estiramiento', 'Eleva un brazo y flexiona el codo por detrás de la cabeza. Con la mano opuesta, empuja suavemente el codo hacia abajo y hacia el centro de la nuca.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 8. Estiramiento de Aductores (Mariposa)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Aductores (Mariposa)', 'pierna', ARRAY['gluteo'], 'peso_corporal',
    'estiramiento', 'Sentado en el suelo con la espalda erguida, junta las plantas de los pies trayendo los talones hacia la ingle. Presiona suavemente las rodillas hacia el piso.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 9. Estiramiento de Cobra (Abdomen y Psoas)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Cobra (Abdomen y Psoas)', 'abdomen', ARRAY['espalda'], 'peso_corporal',
    'estiramiento', 'Tumbado boca abajo, apoya las palmas al lado del pecho y extiende los brazos elevando el torso mientras mantienes la pelvis en contacto con la colchoneta.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 10. Estiramiento de Gemelos en Pared
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Estiramiento de Gemelos en Pared', 'pierna', ARRAY[]::text[], 'peso_corporal',
    'estiramiento', 'Apoya las palmas en la pared y lleva una pierna hacia atrás completamente extendida con el talón firme en el suelo. Flexiona la pierna delantera inclinándote hacia la pared.',
    ARRAY['estiramiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 11. Rotaciones y Círculos de Brazos (Arm Circles)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Rotaciones y Círculos de Brazos (Arm Circles)', 'hombro', ARRAY['pecho','espalda'], 'peso_corporal',
    'movilidad', 'De pie con los brazos extendidos a los lados en forma de T, realiza círculos continuos aumentando el diámetro paulatinamente. Cambia de sentido a mitad del tiempo.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 12. Gato-Camello Dinámico (Cat-Cow)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Gato-Camello Dinámico (Cat-Cow)', 'espalda', ARRAY['abdomen'], 'peso_corporal',
    'movilidad', 'En cuadrupedio sobre la colchoneta, inhala arqueando la espalda e inclinando la cabeza arriba (vaca), exhala redondeando la columna y metiendo la cabeza (gato).',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 13. Movilidad Rotacional de Cadera (Círculos)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Movilidad Rotacional de Cadera (Círculos)', 'gluteo', ARRAY['pierna'], 'peso_corporal',
    'movilidad', 'De pie apoyándote en un soporte, eleva la rodilla a 90 grados y dibuja círculos amplios con la articulación de la cadera hacia afuera y luego hacia adentro.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 14. Zancada Dinámica con Torsión de Tronco
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Zancada Dinámica con Torsión de Tronco', 'pierna', ARRAY['gluteo','espalda'], 'peso_corporal',
    'movilidad', 'Realiza un paso largo hacia adelante en posición de zancada profunda. Apoya la mano opuesta al pie adelantado y gira el tronco elevando el otro brazo hacia el techo.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 15. Sentadilla de Movilidad sin Peso (Air Squat)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Sentadilla de Movilidad sin Peso (Air Squat)', 'pierna', ARRAY['gluteo'], 'peso_corporal',
    'movilidad', 'Realiza sentadillas con peso corporal bajando hasta romper el paralelo de forma controlada, manteniendo los talones pegados y el pecho firme.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 16. Jumping Jacks (Saltos de Tijera)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Jumping Jacks (Saltos de Tijera)', 'cardio', ARRAY['pierna'], 'peso_corporal',
    'cardio', 'Da saltos rítmicos abriendo simultáneamente las piernas hacia los lados y elevando las manos sobre la cabeza para activar el pulso cardíaco.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 17. Caminata de Manos (Inchworm)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Caminata de Manos (Inchworm)', 'abdomen', ARRAY['hombro','pierna'], 'peso_corporal',
    'movilidad', 'Desde posición de pie, flexiona el torso hasta tocar el suelo y camina con las manos hacia adelante hasta quedar en plancha alta; luego camina con los pies hacia las manos.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

  -- 18. Elevación de Rodillas al Pecho (High Knees)
  INSERT INTO public.exercises (
    gym_id, name, muscle_group, secondary_muscle_groups, equipment,
    exercise_type, instructions, usage_tags, visibility, is_active, created_by_role
  ) VALUES (
    v_gym_id, 'Elevación de Rodillas al Pecho (High Knees)', 'cardio', ARRAY['pierna','abdomen'], 'peso_corporal',
    'cardio', 'Trote dinámico en el mismo sitio elevando activamente las rodillas hasta la altura de la cadera de forma rápida y continua.',
    ARRAY['calentamiento'], 'gym', true, 'admin'
  ) ON CONFLICT DO NOTHING;

END $$;
