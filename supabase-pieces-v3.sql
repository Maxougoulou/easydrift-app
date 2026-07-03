-- ============================================================
-- EasyDrift — V3 : les pièces sont du STOCK (rab), pas du monté
-- À coller dans l'éditeur SQL de Supabase APRÈS supabase-fiches-v2.sql
-- ============================================================

-- Quantité en stock
ALTER TABLE vehicle_parts ADD COLUMN IF NOT EXISTS qty INTEGER DEFAULT 1;

-- fiche_publique_get : inclure les pièces en stock du véhicule
-- pour que le mécano voie ce qui est fourni avec la voiture
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
        'notes', p.notes
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
