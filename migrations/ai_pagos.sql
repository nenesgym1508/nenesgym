-- Migración: Análisis de comprobantes con Gemini AI
-- Ejecutada en Supabase proyecto nqhkfqoroisszycdxwuy

-- 1. Config de cuentas del gym en tabla gyms
ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS nequi_number     TEXT,
  ADD COLUMN IF NOT EXISTS nequi_titular    TEXT,
  ADD COLUMN IF NOT EXISTS daviplata_number  TEXT,
  ADD COLUMN IF NOT EXISTS daviplata_titular TEXT;

-- 2. Auto-aprobación por cliente
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS auto_aprobacion BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Campos IA en payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS imagen_hash       TEXT,
  ADD COLUMN IF NOT EXISTS imagen_phash      TEXT,
  ADD COLUMN IF NOT EXISTS ai_monto          INTEGER,
  ADD COLUMN IF NOT EXISTS ai_referencia     TEXT,
  ADD COLUMN IF NOT EXISTS ai_entidad        TEXT,
  ADD COLUMN IF NOT EXISTS ai_nombre         TEXT,
  ADD COLUMN IF NOT EXISTS ai_numero_destino TEXT,
  ADD COLUMN IF NOT EXISTS ai_fecha_iso      TEXT,
  ADD COLUMN IF NOT EXISTS ai_valido         BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_razon          TEXT,
  ADD COLUMN IF NOT EXISTS auto_aprobado     BOOLEAN NOT NULL DEFAULT FALSE;

-- 4. Tabla de veredictos temporales (TTL 15 min)
CREATE TABLE IF NOT EXISTS receipt_verdicts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  imagen_hash TEXT NOT NULL,
  veredicto   JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes'
);
CREATE INDEX IF NOT EXISTS receipt_verdicts_client ON receipt_verdicts(client_id);
CREATE INDEX IF NOT EXISTS receipt_verdicts_hash   ON receipt_verdicts(imagen_hash);

-- 5. Tabla config key-value para rate-limit
CREATE TABLE IF NOT EXISTS gym_config (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);
