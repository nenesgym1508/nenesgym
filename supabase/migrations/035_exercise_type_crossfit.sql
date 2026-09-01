-- ============================================================================
-- 035 — CrossFit como tipo de ejercicio.  [APLICADA 2026-09-01]
--
-- ⚠️ NOTA DE DISEÑO, para quien venga después.
--
-- `exercise_type` admite UN SOLO valor. Marcar un ejercicio como "crossfit" lo
-- saca de su tipo real: un thruster marcado CrossFit deja de aparecer en el
-- filtro "Fuerza", y un remo deja de aparecer en "Cardio".
--
-- Se advirtió antes de hacerlo y se eligió esta vía a propósito: el dueño
-- quiere el filtro CrossFit al armar rutinas y prefiere la simplicidad de un
-- valor más en la lista.
--
-- Si algún día esa exclusividad estorba, la salida NO es deshacer esto —los
-- ejercicios ya marcados habría que remapearlos— sino añadir un campo aparte
-- de disciplina con varios valores (crossfit, funcional, halterofilia) y dejar
-- `exercise_type` para lo que es: la clase de movimiento.
--
-- El filtro del selector de rutinas no necesita nada: se construye con los
-- tipos presentes en los datos y toma la etiqueta de EXERCISE_TYPE_LABELS.
-- ============================================================================

ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_exercise_type_check;

ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_exercise_type_check
  CHECK (exercise_type = ANY (ARRAY[
    'fuerza'::text,
    'cardio'::text,
    'movilidad'::text,
    'estiramiento'::text,
    'tecnica'::text,
    'crossfit'::text
  ]));
