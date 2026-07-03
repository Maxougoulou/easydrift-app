-- ============================================================
-- EasyDrift — V4 : le mécano déclare les pièces utilisées
-- À coller dans l'éditeur SQL de Supabase APRÈS supabase-pieces-v3.sql
-- ============================================================

-- Pièces utilisées par fiche (déclarées par le mécano)
CREATE TABLE IF NOT EXISTS fiche_pieces (
  id           SERIAL PRIMARY KEY,
  fiche_id     INTEGER REFERENCES fiches(id) ON DELETE CASCADE,
  part_id      INTEGER REFERENCES vehicle_parts(id) ON DELETE CASCADE,
  qty_utilisee INTEGER NOT NULL DEFAULT 0,
  UNIQUE(fiche_id, part_id)
);

ALTER TABLE fiche_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON fiche_pieces FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE fiche_pieces;
ALTER PUBLICATION supabase_realtime ADD TABLE vehicle_parts;

-- ─── RPC : le mécano utilise (+1) ou annule (-1) une pièce ────────────────────
-- Décrémente le stock, trace la conso sur la fiche,
-- et flague "à recommander" quand le stock tombe à 0.
CREATE OR REPLACE FUNCTION fiche_publique_utiliser_piece(
  p_token UUID, p_part_id INTEGER, p_delta INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fiche_id   INTEGER;
  v_vehicle_id INTEGER;
  v_stock      INTEGER;
  v_used       INTEGER;
BEGIN
  -- Fiche ouverte + pièce du même véhicule uniquement
  SELECT f.id, f.vehicle_id INTO v_fiche_id, v_vehicle_id
  FROM fiches f WHERE f.token_public = p_token AND f.statut = 'envoyée';
  IF v_fiche_id IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(qty, 1) INTO v_stock FROM vehicle_parts
  WHERE id = p_part_id AND vehicle_id = v_vehicle_id;
  IF v_stock IS NULL THEN RETURN NULL; END IF;

  IF p_delta NOT IN (1, -1) THEN RETURN NULL; END IF;

  SELECT COALESCE(qty_utilisee, 0) INTO v_used FROM fiche_pieces
  WHERE fiche_id = v_fiche_id AND part_id = p_part_id;
  v_used := COALESCE(v_used, 0);

  -- +1 : il faut du stock ; -1 : il faut avoir déjà déclaré une utilisation
  IF p_delta = 1 AND v_stock <= 0 THEN RETURN NULL; END IF;
  IF p_delta = -1 AND v_used <= 0 THEN RETURN NULL; END IF;

  -- Stock : baisse à l'utilisation, remonte à l'annulation
  UPDATE vehicle_parts
  SET qty = qty - p_delta,
      reorder = CASE WHEN (qty - p_delta) <= 0 THEN TRUE ELSE reorder END
  WHERE id = p_part_id;

  -- Trace sur la fiche
  INSERT INTO fiche_pieces (fiche_id, part_id, qty_utilisee)
  VALUES (v_fiche_id, p_part_id, GREATEST(0, v_used + p_delta))
  ON CONFLICT (fiche_id, part_id)
  DO UPDATE SET qty_utilisee = GREATEST(0, fiche_pieces.qty_utilisee + p_delta);

  RETURN json_build_object('ok', TRUE, 'stock', v_stock - p_delta, 'used', v_used + p_delta);
END;
$$;

GRANT EXECUTE ON FUNCTION fiche_publique_utiliser_piece(UUID, INTEGER, INTEGER) TO anon;

-- ─── fiche_publique_get : inclure la conso de CETTE fiche par pièce ───────────
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
    ), '[]'::json),
    'pieces', COALESCE((
      SELECT json_agg(json_build_object(
        'id', p.id,
        'name', p.name,
        'reference', p.reference,
        'qty', COALESCE(p.qty, 1),
        'notes', p.notes,
        'reorder', COALESCE(p.reorder, FALSE),
        'used', COALESCE((
          SELECT fp.qty_utilisee FROM fiche_pieces fp
          WHERE fp.fiche_id = f.id AND fp.part_id = p.id
        ), 0)
      ) ORDER BY p.name)
      FROM vehicle_parts p WHERE p.vehicle_id = f.vehicle_id
    ), '[]'::json)
  ) INTO result
  FROM fiches f
  JOIN vehicles v ON v.id = f.vehicle_id
  WHERE f.token_public = p_token;

  RETURN result;
END;
$$;
