-- ============================================================
-- EasyDrift — V10 : SAV « Anneaux défectueux » (DTS Incident Report)
-- Remplace le Google Form. Lien public /sav/<token> envoyé au client.
-- À coller dans l'éditeur SQL de Supabase.
-- ============================================================

CREATE TABLE IF NOT EXISTS sav_reports (
  id              SERIAL PRIMARY KEY,
  token_public    UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  statut          TEXT NOT NULL DEFAULT 'en_attente',  -- en_attente | reçu | en_analyse | traité
  locale          TEXT NOT NULL DEFAULT 'fr',          -- langue proposée par défaut au client

  -- Repérage interne, saisi côté EASYDRIFT à la création du lien
  libelle         TEXT,
  client_email    TEXT,
  notes_internes  TEXT,

  -- Réponses du client
  reponses        JSONB NOT NULL DEFAULT '{}'::jsonb,
  fichiers        JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Extraits des réponses à la soumission → listing rapide sans parser le JSON
  r_email         TEXT,
  r_nom           TEXT,
  r_societe       TEXT,
  r_produit       TEXT,
  r_date_incident DATE,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sav_token  ON sav_reports(token_public);
CREATE INDEX IF NOT EXISTS idx_sav_statut ON sav_reports(statut);

ALTER TABLE sav_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_all" ON sav_reports;
CREATE POLICY "auth_all" ON sav_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- anon n'a AUCUN accès direct à la table : tout passe par les RPC ci-dessous,
-- qui exigent le token du lien.

-- ─── RPC publique : état du formulaire ───────────────────────────────────────
CREATE OR REPLACE FUNCTION sav_public_get(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'statut',       s.statut,
    'locale',       s.locale,
    'libelle',      s.libelle,
    'client_email', s.client_email,
    'submitted_at', s.submitted_at
  ) INTO result
  FROM sav_reports s
  WHERE s.token_public = p_token;

  RETURN result;  -- NULL si token inconnu
END;
$$;

GRANT EXECUTE ON FUNCTION sav_public_get(UUID) TO anon;

-- ─── RPC publique : soumission du questionnaire ──────────────────────────────
CREATE OR REPLACE FUNCTION sav_public_submit(
  p_token    UUID,
  p_locale   TEXT,
  p_reponses JSONB,
  p_fichiers JSONB
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_submitted TIMESTAMPTZ;
  v_found     BOOLEAN;
BEGIN
  SELECT TRUE, s.submitted_at INTO v_found, v_submitted
  FROM sav_reports s WHERE s.token_public = p_token;

  IF NOT COALESCE(v_found, FALSE) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'not_found');
  END IF;

  -- Un lien ne se remplit qu'une fois : évite les doublons et les écrasements
  IF v_submitted IS NOT NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', 'already_submitted');
  END IF;

  UPDATE sav_reports SET
    statut   = 'reçu',
    locale   = COALESCE(NULLIF(p_locale, ''), locale),
    reponses = COALESCE(p_reponses, '{}'::jsonb),
    fichiers = COALESCE(p_fichiers, '[]'::jsonb),
    r_email   = NULLIF(p_reponses->>'email', ''),
    r_nom     = NULLIF(p_reponses->>'nom_poste', ''),
    r_societe = NULLIF(p_reponses->>'societe', ''),
    r_produit = NULLIF(
      CASE WHEN p_reponses->>'produit' = 'autre'
           THEN p_reponses->>'produit_autre'
           ELSE p_reponses->>'produit' END, ''),
    r_date_incident = CASE
      WHEN COALESCE(p_reponses->>'date_incident', '') ~ '^\d{4}-\d{2}-\d{2}$'
      THEN (p_reponses->>'date_incident')::DATE ELSE NULL END,
    submitted_at = NOW()
  WHERE token_public = p_token;

  RETURN json_build_object('ok', TRUE);
END;
$$;

GRANT EXECUTE ON FUNCTION sav_public_submit(UUID, TEXT, JSONB, JSONB) TO anon;

-- ─── Stockage : le client dépose ses photos dans le dossier sav/ ─────────────
-- (le bucket vehicle-files existe déjà et est public en lecture)
DROP POLICY IF EXISTS "anon_upload_sav" ON storage.objects;
CREATE POLICY "anon_upload_sav" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'vehicle-files' AND (storage.foldername(name))[1] = 'sav');
