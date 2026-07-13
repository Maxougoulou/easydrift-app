-- ============================================================
-- EasyDrift — V6 : lien NFC permanent par véhicule
-- À coller dans l'éditeur SQL de Supabase
-- ============================================================

-- Token permanent du véhicule (ne change JAMAIS → gravable sur puce NFC)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS token_public UUID NOT NULL DEFAULT gen_random_uuid();
CREATE INDEX IF NOT EXISTS idx_vehicles_token ON vehicles(token_public);

-- ─── RPC publique : infos véhicule + fiche en cours éventuelle ────────────────
-- Le mécano scanne la puce → s'il y a une fiche ouverte, le front
-- le redirige directement dessus.
CREATE OR REPLACE FUNCTION vehicule_public_get(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'vehicle', json_build_object(
      'name', v.name,
      'plate', v.plate,
      'year', v.year,
      'mileage', v.mileage,
      'photo_url', v.photo_url
    ),
    -- Fiche ouverte la plus récente (envoyée) → le front redirige dessus
    'fiche_token', (
      SELECT f.token_public FROM fiches f
      WHERE f.vehicle_id = v.id AND f.statut = 'envoyée'
      ORDER BY f.date_creation DESC LIMIT 1
    ),
    -- Dernière fiche terminée (info)
    'derniere_intervention', (
      SELECT json_build_object('titre', f.titre, 'date', f.date_cloture)
      FROM fiches f
      WHERE f.vehicle_id = v.id AND f.statut = 'terminée'
      ORDER BY f.date_cloture DESC LIMIT 1
    )
  ) INTO result
  FROM vehicles v
  WHERE v.token_public = p_token;

  RETURN result;  -- NULL si token inconnu
END;
$$;

GRANT EXECUTE ON FUNCTION vehicule_public_get(UUID) TO anon;
