-- ============================================================================
-- 033 — Hasta 3 imágenes por ejercicio.  [APLICADA 2026-09-01]
--
-- Antes había una sola (`media_url`). Para explicar bien un ejercicio hacen
-- falta varias: posición inicial, posición final, detalle del agarre.
--
-- ⚠️ `media_url` SE CONSERVA y sigue siendo la portada. No se elimina ni se
-- vacía. Motivo: la leen las miniaturas de los listados, el selector de
-- ejercicios, las tarjetas de rutina y las clases — decenas de sitios. Migrar
-- todo eso de golpe era mucho riesgo a cambio de nada, porque el 99% de las
-- pantallas solo necesitan una foto.
--
-- LA REGLA, y hay que respetarla al escribir:  media_url = media_urls[1].
-- Quien guarde imágenes actualiza LAS DOS columnas — en el código eso lo
-- centraliza `normalizarImagenes()` en exercises.actions.ts. Si divergen, la
-- miniatura enseñaría una foto distinta a la de la galería.
-- ============================================================================

ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS media_urls text[] NOT NULL DEFAULT '{}';

-- Los ejercicios que ya existían pasan a tener su única foto en el array.
-- (Al aplicarse: 116 de 119 tenían foto; 0 quedaron desincronizados.)
UPDATE public.exercises
   SET media_urls = ARRAY[media_url]
 WHERE media_url IS NOT NULL
   AND media_url <> ''
   AND cardinality(media_urls) = 0;

-- Tope duro en la base, no solo en la interfaz: un cliente manipulado podría
-- mandar 50 URLs y llenar el bucket de R2.
ALTER TABLE public.exercises
  DROP CONSTRAINT IF EXISTS exercises_media_urls_max_3;
ALTER TABLE public.exercises
  ADD CONSTRAINT exercises_media_urls_max_3
  CHECK (cardinality(media_urls) <= 3);

COMMENT ON COLUMN public.exercises.media_urls IS
  'Hasta 3 imágenes. media_urls[1] debe coincidir siempre con media_url, que es la portada y la que leen las miniaturas.';
