-- ============================================================
-- EasyDrift — V11 : correctifs de SÉCURITÉ (à appliquer en priorité)
-- À coller dans l'éditeur SQL de Supabase.
--
-- ⚠ UN GESTE RESTE À FAIRE À LA MAIN, ce script ne peut pas le faire :
--   Dashboard → Authentication → Sign In / Providers → Email
--   → désactiver « Allow new users to sign up ».
--   Sans ça, n'importe qui crée un compte et, comme toutes les policies
--   sont « FOR ALL TO authenticated USING (true) », obtient un accès
--   total en lecture, écriture et suppression sur toute la base.
-- ============================================================

-- ─── 1. Stop à l'énumération du stockage ─────────────────────────────────────
-- Cette policy donnait à anon la visibilité des LIGNES de storage.objects,
-- donc le droit de LISTER le bucket. Un inconnu pouvait ainsi lire le dossier
-- sav/<token>/ et en extraire des jetons de déclaration valides, puis appeler
-- sav_public_get pour récupérer l'e-mail du client.
--
-- La supprimer ne casse PAS l'affichage des photos : le bucket est déclaré
-- public, donc les URL /object/public/... restent servies directement, sans
-- passer par RLS. Seul le LISTING disparaît — ce qu'on veut exactement.
DROP POLICY IF EXISTS "public_read_vehicle_files" ON storage.objects;

-- ─── 2. Bornes sur le bucket ─────────────────────────────────────────────────
-- Il avait été créé sans aucune limite : n'importe qui pouvait y déposer
-- des fichiers de n'importe quelle taille et de n'importe quel type, y compris
-- du HTML servi ensuite depuis le domaine du projet.
-- 50 Mo = limite globale par défaut d'un projet Supabase ; inutile d'annoncer
-- plus au client, le serveur refuserait de toute façon.
UPDATE storage.buckets
SET file_size_limit   = 52428800,  -- 50 Mo
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime',
      'application/pdf'
    ]
WHERE id = 'vehicle-files';

-- ─── 3. Les URL de fichiers ne sont plus acceptées en aveugle ────────────────
-- p_photo_url et p_fichiers[].url étaient stockés verbatim puis rendus côté
-- admin en <img src> et <a href>. Un porteur de lien pouvait y glisser
-- 'https://attaquant.tld/pixel.png' (traçage) ou 'javascript:...' (vol du
-- jeton de session de l'admin au clic). On n'accepte désormais que les URL
-- de notre propre bucket.

CREATE OR REPLACE FUNCTION easydrift_url_stockage_valide(p_url TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT p_url IS NOT NULL
     AND p_url LIKE 'https://yyuxcwhwglvdlirlacnd.supabase.co/storage/v1/object/public/vehicle-files/%';
$$;

CREATE OR REPLACE FUNCTION fiche_publique_tache_photo(
  p_token     UUID,
  p_tache_id  INTEGER,
  p_photo_url TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_fiche_id INTEGER;
BEGIN
  -- Refus net si l'URL ne vient pas de notre bucket
  IF NOT easydrift_url_stockage_valide(p_photo_url) THEN
    RETURN FALSE;
  END IF;

  SELECT f.id INTO v_fiche_id
  FROM fiches f
  WHERE f.token_public = p_token AND f.statut = 'envoyée';

  IF v_fiche_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE fiche_taches
  SET photo_url = p_photo_url
  WHERE id = p_tache_id AND fiche_id = v_fiche_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION fiche_publique_tache_photo(UUID, INTEGER, TEXT) TO anon;

-- sav_public_submit : même filtre, appliqué à chaque fichier déclaré.
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
  v_fichier   JSONB;
BEGIN
  SELECT TRUE, s.submitted_at INTO v_found, v_submitted
  FROM sav_reports s WHERE s.token_public = p_token;

  IF NOT COALESCE(v_found, FALSE) THEN
    RETURN json_build_object('ok', FALSE, 'error', 'not_found');
  END IF;

  IF v_submitted IS NOT NULL THEN
    RETURN json_build_object('ok', FALSE, 'error', 'already_submitted');
  END IF;

  -- Toute URL étrangère au bucket fait rejeter la soumission entière
  IF p_fichiers IS NOT NULL AND jsonb_typeof(p_fichiers) = 'array' THEN
    FOR v_fichier IN SELECT * FROM jsonb_array_elements(p_fichiers) LOOP
      IF NOT easydrift_url_stockage_valide(v_fichier->>'url') THEN
        RETURN json_build_object('ok', FALSE, 'error', 'invalid_file_url');
      END IF;
    END LOOP;
  END IF;

  -- Garde-fou volume : une déclaration honnête pèse quelques kilo-octets
  IF length(p_reponses::text) > 200000 THEN
    RETURN json_build_object('ok', FALSE, 'error', 'payload_too_large');
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

-- ─── 4. Un jeton ne peut plus être dupliqué ──────────────────────────────────
-- token_public n'était pas UNIQUE sur fiches et vehicles. Les RPC font un
-- SELECT ... INTO, qui prend la PREMIÈRE ligne sans erreur : deux fiches
-- partageant un jeton auraient envoyé le mécano sur la mauvaise, en silence.
-- (Si l'une de ces commandes échoue, c'est qu'un doublon existe déjà :
--  le trouver avec  SELECT token_public, count(*) FROM fiches
--                   GROUP BY 1 HAVING count(*) > 1;)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fiches_token_public_unique') THEN
    ALTER TABLE fiches ADD CONSTRAINT fiches_token_public_unique UNIQUE (token_public);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_token_public_unique') THEN
    ALTER TABLE vehicles ADD CONSTRAINT vehicles_token_public_unique UNIQUE (token_public);
  END IF;
END $$;

-- ─── 5. Index manquants sur les colonnes systématiquement filtrées ───────────
CREATE INDEX IF NOT EXISTS idx_team_members_auth  ON team_members(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_notifications_to    ON notifications(to_member_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project       ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_comments_project    ON comments(project_id);
CREATE INDEX IF NOT EXISTS idx_fiche_pieces_part   ON fiche_pieces(part_id);

-- ─── Vérification après application ──────────────────────────────────────────
-- Le listing doit désormais être vide pour un visiteur anonyme :
--   curl -s -X POST \
--     'https://yyuxcwhwglvdlirlacnd.supabase.co/storage/v1/object/list/vehicle-files' \
--     -H "apikey: <cle_anon>" -H 'Content-Type: application/json' \
--     -d '{"prefix":"","limit":5}'
--   → doit renvoyer []
