-- ============================================================
-- EasyDrift — FIX realtime : ajoute toutes les tables à la
-- publication realtime (sans erreur si déjà présentes).
-- Nécessaire pour voir EN DIRECT les changements du mécano.
-- À coller dans l'éditeur SQL de Supabase — réexécutable sans risque.
-- ============================================================

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'vehicles', 'maintenance', 'fiches', 'fiche_taches',
    'fiche_pieces', 'vehicle_parts', 'mileage_log'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t)
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
       )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      RAISE NOTICE 'Ajouté au realtime : %', t;
    END IF;
  END LOOP;
END $$;
