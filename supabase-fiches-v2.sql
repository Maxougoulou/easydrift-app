-- ============================================================
-- EasyDrift — V2 : photos sur les tâches + pièces par véhicule
-- À coller dans l'éditeur SQL de Supabase APRÈS supabase-fiches.sql
-- ============================================================

-- ─── PHOTO SUR LES TÂCHES ────────────────────────────────────────────────────
ALTER TABLE fiche_taches ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ─── PIÈCES PAR VÉHICULE (cardans, plaquettes, etc.) ─────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_parts (
  id         SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,          -- "Plaquettes AV Ferodo DS2500"
  reference  TEXT,                    -- réf constructeur
  date_pose  DATE,
  km_pose    INTEGER,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_parts_vehicle ON vehicle_parts(vehicle_id);

ALTER TABLE vehicle_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON vehicle_parts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── LE MÉCANO PEUT UPLOADER DES PHOTOS (dossier taches/ uniquement) ─────────
CREATE POLICY "anon_upload_taches" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'vehicle-files' AND (storage.foldername(name))[1] = 'taches');

-- ─── RPC : associer une photo à une tâche (public, verrouillé par token) ─────
CREATE OR REPLACE FUNCTION fiche_publique_tache_photo(
  p_token UUID, p_tache_id INTEGER, p_photo_url TEXT
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

  UPDATE fiche_taches SET photo_url = p_photo_url
  WHERE id = p_tache_id AND fiche_id = v_fiche_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION fiche_publique_tache_photo(UUID, INTEGER, TEXT) TO anon;

-- ─── MISE À JOUR DE fiche_publique_get : inclure photo_url ───────────────────
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
        'origine', t.origine,
        'photo_url', t.photo_url
      ) ORDER BY t.origine, t.position, t.id)
      FROM fiche_taches t WHERE t.fiche_id = f.id
    ), '[]'::json)
  ) INTO result
  FROM fiches f
  JOIN vehicles v ON v.id = f.vehicle_id
  WHERE f.token_public = p_token;

  RETURN result;
END;
$$;
