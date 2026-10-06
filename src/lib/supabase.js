import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Si une variable manque au build, createClient(undefined, …) lève AU CHARGEMENT
// du module : React ne monte jamais et l'écran reste BLANC, sans le moindre
// indice. On préfère démarrer sur des valeurs factices et laisser main.jsx
// afficher un message explicite — typiquement sur un déploiement Vercel dont
// les variables d'environnement n'ont pas été renseignées.
export const configManquante = !supabaseUrl || !supabaseAnonKey;

if (configManquante) {
  console.error(
    '[EasyDrift] Configuration Supabase absente : vérifier VITE_SUPABASE_URL ' +
    'et VITE_SUPABASE_ANON_KEY dans les variables d’environnement du déploiement.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://configuration-absente.supabase.co',
  supabaseAnonKey || 'configuration-absente',
);
