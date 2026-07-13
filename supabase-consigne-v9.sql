-- ============================================================
-- EasyDrift — V9 : consigne admin par tâche (distincte du
-- commentaire mécano) — À coller dans l'éditeur SQL de Supabase
-- ============================================================

ALTER TABLE fiche_taches ADD COLUMN IF NOT EXISTS consigne TEXT;

-- fiche_publique_get : inclure la consigne
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
        'consigne', t.consigne,
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
