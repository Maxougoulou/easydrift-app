-- ============================================================
-- EasyDrift — V8 : kilométrage OBLIGATOIRE à la validation mécano
-- À coller dans l'éditeur SQL de Supabase
-- ============================================================

-- L'ancienne version sans kilométrage est supprimée :
-- impossible de terminer une fiche sans donner le km.
DROP FUNCTION IF EXISTS fiche_publique_terminer(UUID);

CREATE OR REPLACE FUNCTION fiche_publique_terminer(p_token UUID, p_km INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fiche_id   INTEGER;
  v_vehicle_id INTEGER;
BEGIN
  -- Kilométrage requis et plausible
  IF p_km IS NULL OR p_km <= 0 OR p_km > 2000000 THEN RETURN FALSE; END IF;

  SELECT id, vehicle_id INTO v_fiche_id, v_vehicle_id
  FROM fiches WHERE token_public = p_token AND statut = 'envoyée';
  IF v_fiche_id IS NULL THEN RETURN FALSE; END IF;

  -- Le compteur ne recule jamais : on ne met à jour le véhicule
  -- que si le km donné est >= au km connu (le trigger historise)
  UPDATE vehicles SET mileage = p_km
  WHERE id = v_vehicle_id AND p_km >= mileage;

  UPDATE fiches
  SET travail_termine = TRUE,
      km_au_moment = p_km
  WHERE id = v_fiche_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION fiche_publique_terminer(UUID, INTEGER) TO anon;
