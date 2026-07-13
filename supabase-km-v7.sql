-- ============================================================
-- EasyDrift — V7 : historique automatique du kilométrage
-- À coller dans l'éditeur SQL de Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS mileage_log (
  id         SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  km         INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mileage_log_vehicle ON mileage_log(vehicle_id, created_at DESC);

ALTER TABLE mileage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON mileage_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TRIGGER : chaque modification du kilométrage est historisée ──────────────
-- Couvre TOUS les chemins : édition rapide admin, formulaire véhicule,
-- mise à jour par le mécano (RPC fiche), clôture de fiche, maintenance.
CREATE OR REPLACE FUNCTION log_mileage_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.mileage IS DISTINCT FROM OLD.mileage AND NEW.mileage IS NOT NULL THEN
    INSERT INTO mileage_log (vehicle_id, km) VALUES (NEW.id, NEW.mileage);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_mileage ON vehicles;
CREATE TRIGGER trg_log_mileage
  AFTER UPDATE OF mileage ON vehicles
  FOR EACH ROW EXECUTE FUNCTION log_mileage_change();

-- Point de départ : enregistre le kilométrage actuel de chaque véhicule
-- (uniquement s'il n'a encore aucun relevé)
INSERT INTO mileage_log (vehicle_id, km)
SELECT v.id, v.mileage FROM vehicles v
WHERE v.mileage IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM mileage_log ml WHERE ml.vehicle_id = v.id);
