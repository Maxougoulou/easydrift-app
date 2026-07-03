-- ============================================================
-- EasyDrift — Fiches d'intervention + colonnes véhicules
-- Coller ce SQL dans l'éditeur SQL de Supabase (SQL Editor)
-- ============================================================

-- ─── COLONNES VÉHICULES SUPPLÉMENTAIRES ──────────────────────────────────────
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS date_assurance DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS date_derniere_revision DATE;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ─── FICHES D'INTERVENTION ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fiches (
  id            SERIAL PRIMARY KEY,
  vehicle_id    INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  titre         TEXT NOT NULL,
  statut        TEXT NOT NULL DEFAULT 'brouillon',  -- brouillon | envoyée | terminée
  date_creation TIMESTAMPTZ DEFAULT NOW(),
  date_cloture  TIMESTAMPTZ,
  km_au_moment  INTEGER,
  cout_total    NUMERIC DEFAULT 0,
  notes         TEXT,
  facture_url   TEXT,
  travail_termine BOOLEAN DEFAULT FALSE,  -- le mécano a fini (avant clôture admin)
  token_public  UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fiche_taches (
  id          SERIAL PRIMARY KEY,
  fiche_id    INTEGER REFERENCES fiches(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  fait        BOOLEAN DEFAULT FALSE,
  commentaire TEXT,
  origine     TEXT NOT NULL DEFAULT 'demande',  -- demande | mecano
  position    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiches_vehicle ON fiches(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fiches_token ON fiches(token_public);
CREATE INDEX IF NOT EXISTS idx_fiche_taches_fiche ON fiche_taches(fiche_id);

-- ─── RLS : admin authentifié = tout, anonyme = rien en direct ────────────────
ALTER TABLE fiches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiche_taches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON fiches       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON fiche_taches FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TEMPS RÉEL ──────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE fiches;
ALTER PUBLICATION supabase_realtime ADD TABLE fiche_taches;

-- ============================================================
-- ACCÈS MÉCANO SANS COMPTE — fonctions RPC sécurisées par token
-- Le rôle anon ne peut RIEN faire d'autre que ces 5 fonctions,
-- et chacune est verrouillée par le token de la fiche.
-- ============================================================

-- 1. Lire une fiche (+ véhicule + tâches) par token
CREATE OR REPLACE FUNCTION fiche_publique_get(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'fiche', json_build_object(
      'id', f.id,
      'titre', f.titre,
      'statut', f.statut,
      'date_creation', f.date_creation,
      'km_au_moment', f.km_au_moment,
      'notes', f.notes,
      'travail_termine', f.travail_termine
    ),
    'vehicle', json_build_object(
      'name', v.name,
      'plate', v.plate,
      'year', v.year,
      'mileage', v.mileage,
      'photo_url', v.photo_url
    ),
    'taches', COALESCE((
      SELECT json_agg(json_build_object(
        'id', t.id,
        'description', t.description,
        'fait', t.fait,
        'commentaire', t.commentaire,
        'origine', t.origine
      ) ORDER BY t.origine, t.position, t.id)
      FROM fiche_taches t WHERE t.fiche_id = f.id
    ), '[]'::json)
  ) INTO result
  FROM fiches f
  JOIN vehicles v ON v.id = f.vehicle_id
  WHERE f.token_public = p_token;

  RETURN result;  -- NULL si token inconnu
END;
$$;

-- 2. Cocher/décocher une tâche + commentaire
CREATE OR REPLACE FUNCTION fiche_publique_toggle_tache(
  p_token UUID, p_tache_id INTEGER, p_fait BOOLEAN, p_commentaire TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fiche_id INTEGER;
BEGIN
  SELECT id INTO v_fiche_id FROM fiches
  WHERE token_public = p_token AND statut = 'envoyée';
  IF v_fiche_id IS NULL THEN RETURN FALSE; END IF;

  UPDATE fiche_taches
  SET fait = p_fait,
      commentaire = COALESCE(p_commentaire, commentaire)
  WHERE id = p_tache_id AND fiche_id = v_fiche_id;
  RETURN FOUND;
END;
$$;

-- 3. Le mécano ajoute une intervention non prévue
CREATE OR REPLACE FUNCTION fiche_publique_ajouter_tache(
  p_token UUID, p_description TEXT, p_commentaire TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fiche_id INTEGER;
  v_new_id INTEGER;
BEGIN
  SELECT id INTO v_fiche_id FROM fiches
  WHERE token_public = p_token AND statut = 'envoyée';
  IF v_fiche_id IS NULL THEN RETURN NULL; END IF;
  IF p_description IS NULL OR length(trim(p_description)) = 0 THEN RETURN NULL; END IF;

  INSERT INTO fiche_taches (fiche_id, description, fait, commentaire, origine)
  VALUES (v_fiche_id, trim(p_description), TRUE, p_commentaire, 'mecano')
  RETURNING id INTO v_new_id;
  RETURN v_new_id;
END;
$$;

-- 4. Mise à jour du kilométrage par le mécano
CREATE OR REPLACE FUNCTION fiche_publique_update_km(p_token UUID, p_km INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_vehicle_id INTEGER;
BEGIN
  SELECT vehicle_id INTO v_vehicle_id FROM fiches
  WHERE token_public = p_token AND statut = 'envoyée';
  IF v_vehicle_id IS NULL OR p_km IS NULL OR p_km < 0 OR p_km > 2000000 THEN
    RETURN FALSE;
  END IF;

  UPDATE vehicles SET mileage = p_km WHERE id = v_vehicle_id AND p_km >= mileage;
  UPDATE fiches SET km_au_moment = p_km WHERE token_public = p_token;
  RETURN TRUE;
END;
$$;

-- 5. Le mécano marque la fiche comme terminée (côté travail)
--    La clôture finale (coût, facture) reste côté admin.
CREATE OR REPLACE FUNCTION fiche_publique_terminer(p_token UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE fiches SET travail_termine = TRUE
  WHERE token_public = p_token AND statut = 'envoyée';
  RETURN FOUND;
END;
$$;

-- Droits d'exécution : uniquement ces fonctions pour anon
GRANT EXECUTE ON FUNCTION fiche_publique_get(UUID) TO anon;
GRANT EXECUTE ON FUNCTION fiche_publique_toggle_tache(UUID, INTEGER, BOOLEAN, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION fiche_publique_ajouter_tache(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION fiche_publique_update_km(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION fiche_publique_terminer(UUID) TO anon;

-- ============================================================
-- BUCKET STORAGE pour photos véhicules + factures fiches
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-files', 'vehicle-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "auth_upload_vehicle_files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehicle-files');

CREATE POLICY "auth_update_vehicle_files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'vehicle-files');

CREATE POLICY "auth_delete_vehicle_files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'vehicle-files');

CREATE POLICY "public_read_vehicle_files" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'vehicle-files');
