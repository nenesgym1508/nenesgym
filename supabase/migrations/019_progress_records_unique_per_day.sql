-- Bug: addProgressRecord (y adminSaveProgressRecordAction) usaban un patrón
-- "verificar si existe -> insert o update" no atómico. Dos guardados casi
-- simultáneos (doble tap, reintento de red) podían ver ambos "no existe" y
-- ambos insertar, dejando filas duplicadas para el mismo client_id+measured_date.
-- Una vez duplicado, la verificación (.single()/.maybeSingle()) fallaba
-- silenciosamente al encontrar 2+ filas y el código caía siempre a INSERT,
-- generando una fila nueva en cada guardado posterior de ese día sin parar
-- (confirmado en producción: 3 filas para el mismo client_id+measured_date).
--
-- Restricción única a nivel de base: hace estructuralmente imposible que
-- vuelva a pasar, sin importar qué código llame a la tabla. El código pasa
-- a usar upsert(payload, { onConflict: "client_id,measured_date" }), atómico.
--
-- NOTA: antes de aplicar esta migración en un entorno con datos existentes,
-- hay que deduplicar filas repetidas (client_id, measured_date) o el ALTER
-- TABLE fallará. En producción se conservó la fila con el recorded_at más
-- reciente por cada grupo duplicado.
alter table progress_records
  add constraint progress_records_client_date_unique unique (client_id, measured_date);
