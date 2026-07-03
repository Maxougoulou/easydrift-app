-- ============================================================
-- EasyDrift — V5 : les pièces fournies sont CHOISIES par fiche
-- À coller dans l'éditeur SQL de Supabase APRÈS supabase-pieces-v4.sql
-- ============================================================

-- Quantité fournie avec le véhicule pour cette fiche (choisie par l'admin)
ALTER TABLE fiche_pieces ADD COLUMN IF NOT EXISTS qty_fournie INTEGER NOT NULL DEFAULT 0;

-- ─── RPC utiliser : borné par la quantité FOURNIE sur la fiche ────────────────
CREATE OR REPLACE FUNCTION fiche_publique_utiliser_piece(
  p_token UUID, p_part_id INTEGER, p_delta INTEGER
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fiche_id   INTEGER;
  v_vehicle_id INTEGER;
  v_fournie    INTEGER;
  v_used       INTEGER;
BEGIN
  SELECT f.id, f.vehicle_id INTO v_fiche_id, v_vehicle_id
  FROM fiches f WHERE f.token_public = p_token AND f.statut = 'envoyée';
  IF v_fiche_id IS NULL THEN RETURN NULL; END IF;

  IF p_delta NOT IN (1, -1) THEN RETURN NULL; END IF;

  -- La pièce doit être fournie sur CETTE fiche
  SELECT fp.qty_fournie, fp.qty_utilisee INTO v_fournie, v_used
  FROM fiche_pieces fp
  JOIN vehicle_parts p ON p.id = fp.part_id AND p.vehicle_id = v_vehicle_id
  WHERE fp.fiche_id = v_fiche_id AND fp.part_id = p_part_id;
  IF v_fournie IS NULL THEN RETURN NULL; END IF;

  -- +1 : borné par la quantité fournie ; -1 : il faut du déclaré
  IF p_delta = 1 AND v_used >= v_fournie THEN RETURN NULL; END IF;
  IF p_delta = -1 AND v_used <= 0 THEN RETURN NULL; END IF;

  -- Stock global EASYDRIFT : baisse à l'utilisation, remonte à l'annulation
  UPDATE vehicle_parts
  SET qty = GREATEST(0, qty - p_delta),
      reorder = CASE WHEN (qty - p_delta) <= 0 THEN TRUE ELSE reorder END
  WHERE id = p_part_id;

  UPDATE fiche_pieces
  SET qty_utilisee = GREATEST(0, qty_utilisee + p_delta)
  WHERE fiche_id = v_fiche_id AND part_id = p_part_id;

  RETURN json_build_object('ok', TRUE, 'used', v_used + p_delta);
END;
$$;

GRANT EXECUTE ON FUNCTION fiche_publique_utiliser_piece(UUID, INTEGER, INTEGER) TO anon;

-- ─── fiche_publique_get : seulement les pièces FOURNIES sur la fiche ──────────
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
        'fournie', fp.qty_fournie,
        'used', COALESCE(fp.qty_utilisee, 0),
        'notes', p.notes,
        'reorder', COALESCE(p.reorder, FALSE)
      ) ORDER BY p.name)
      FROM fiche_pieces fp
      JOIN vehicle_parts p ON p.id = fp.part_id
      WHERE fp.fiche_id = f.id AND fp.qty_fournie > 0
    ), '[]'::json)
  ) INTO result
  FROM fiches f
  JOIN vehicles v ON v.id = f.vehicle_id
  WHERE f.token_public = p_token;

  RETURN result;
END;
$$;
