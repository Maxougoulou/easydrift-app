# Guide de déploiement EasyDrift

## Ce qu'on va faire
1. Créer le projet Supabase (base de données + auth)
2. Créer les comptes de Maxence et Alexandre
3. Injecter les données initiales
4. Déployer sur Vercel

---

## ÉTAPE 1 — Créer le projet Supabase

1. Aller sur **https://supabase.com** → Se connecter / Créer un compte
2. Cliquer **New project**
3. Remplir :
   - **Name** : `easydrift`
   - **Password** : (choisir un mot de passe fort — le noter)
   - **Region** : `West EU (Paris)` recommandé
4. Attendre ~2 minutes que le projet soit prêt

---

## ÉTAPE 2 — Créer les tables (schéma SQL)

> ⚠️ **L'ORDRE EST OBLIGATOIRE.** Les fichiers se complètent les uns les autres :
> plusieurs redéfinissent la même fonction en y ajoutant des champs. Les appliquer
> dans le désordre, ou n'en appliquer qu'une partie, produit une base où les
> puces NFC et les liens mécano répondent « introuvable ».

Dans Supabase → **SQL Editor** → **New query**, coller et exécuter **chaque
fichier, un par un, dans cet ordre exact** :

| # | Fichier | Ce qu'il apporte |
|---|---|---|
| 1 | `supabase-schema.sql` | Tables de base : équipe, projets, véhicules, budget, notifications |
| 2 | `supabase-fiches.sql` | Fiches d'intervention + espace mécano public + bucket de fichiers |
| 3 | `supabase-fiches-v2.sql` | Photos de tâches, pièces véhicule |
| 4 | `supabase-pieces-v3.sql` | Pièces dans la fiche mécano |
| 5 | `supabase-pieces-v4.sql` | Pièces fournies par fiche |
| 6 | `supabase-pieces-v5.sql` | Consommation bornée à ce qui a été fourni |
| 7 | `supabase-nfc-v6.sql` | Jeton permanent par véhicule (gravé sur la puce NFC) |
| 8 | `supabase-km-v7.sql` | Historique du kilométrage |
| 9 | `supabase-fiche-km-v8.sql` | Kilométrage obligatoire à la clôture |
| 10 | `supabase-consigne-v9.sql` | Consigne admin par tâche |
| 11 | `supabase-sav-v10.sql` | SAV « anneaux défectueux » + questionnaire client |
| 12 | `supabase-securite-v11.sql` | **Correctifs de sécurité — à ne pas sauter** |
| — | `supabase-realtime-fix.sql` | Temps réel (peut être rejoué sans risque) |

**Ne jamais rejouer un fichier déjà appliqué.** Les fichiers 3 à 10 redéfinissent
`fiche_publique_get` : recoller un ancien fichier **dégrade la fonction sans
afficher la moindre erreur**, et les pièces et consignes disparaissent de
l'écran mécano.

### Deux réglages à faire à la main dans le dashboard

1. **Authentication → Sign In / Providers → Email** : désactiver
   « Allow new users to sign up ». Sans ça, n'importe qui crée un compte et
   obtient un accès total à la base (toutes les policies sont `USING (true)`).
2. **Authentication → Users** : créer les comptes de l'équipe à la main
   (voir ÉTAPE 3).

---

## ÉTAPE 3 — Créer les comptes utilisateurs (Maxence & Alexandre)

1. Dans Supabase → **Authentication** → **Users**
2. Cliquer **Add user** → **Create new user**

**Compte Maxence :**
- Email : `maxence.fortier@gmail.com`
- Password : (choisir un mot de passe)
- ✅ Cocher "Auto Confirm User"

**Compte Alexandre :**
- Email : `alexandre@easydrift.fr` (ou son vrai email)
- Password : (choisir un mot de passe)
- ✅ Cocher "Auto Confirm User"

3. Après création, noter les **UUID** de chaque utilisateur (colonne "UID" dans la liste)

---

## ÉTAPE 4 — Lier les comptes auth aux membres d'équipe

Dans SQL Editor, exécuter (remplacer les UUIDs par les vrais) :

```sql
UPDATE team_members SET auth_user_id = 'UUID-DE-MAXENCE' WHERE name = 'Maxence';
UPDATE team_members SET auth_user_id = 'UUID-DALEXANDRE' WHERE name = 'Alexandre';
```

---

## ÉTAPE 5 — Récupérer les clés API Supabase

1. Dans Supabase → **Project Settings** (icône engrenage) → **API**
2. Copier :
   - **Project URL** → ex: `https://abcdefgh.supabase.co`
   - **anon public** key → longue chaîne commençant par `eyJ...`

---

## ÉTAPE 6 — Déployer sur Vercel

### Option A — Via l'interface Vercel (recommandé)

1. Pousser le dossier `easydrift-app` sur GitHub :
   ```bash
   cd easydrift-app
   git init
   git add .
   git commit -m "Initial commit EasyDrift"
   # Créer un repo sur github.com, puis :
   git remote add origin https://github.com/TON-USER/easydrift-app.git
   git push -u origin main
   ```

2. Aller sur **https://vercel.com** → Se connecter avec GitHub
3. **New Project** → Importer le repo `easydrift-app`
4. Dans **Environment Variables**, ajouter :
   - `VITE_SUPABASE_URL` = `https://abcdefgh.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJ...`
5. Cliquer **Deploy**
6. En ~1 minute, l'app est en ligne avec une URL `https://easydrift-app.vercel.app`

### Option B — Via la CLI Vercel

```bash
cd easydrift-app
npm install -g vercel
vercel login
vercel --prod
# Répondre aux questions, puis ajouter les env vars via le dashboard
```

---

## ÉTAPE 7 — Test final

1. Ouvrir l'URL Vercel
2. Se connecter avec les identifiants de Maxence
3. Vérifier que les projets, véhicules et données s'affichent
4. Tester l'envoi d'un message et la mention @Alexandre
5. Se connecter depuis le téléphone d'Alexandre pour vérifier la synchro temps réel

---

## Structure du projet créé

```
easydrift-app/
├── src/
│   ├── lib/
│   │   ├── supabase.js       ← Client Supabase
│   │   ├── theme.js          ← Couleurs & config UI
│   │   └── AppContext.js     ← Contexte React global
│   ├── hooks/
│   │   ├── useAuth.js        ← Authentification
│   │   ├── useProjects.js    ← Projets + temps réel
│   │   ├── useVehicles.js    ← Véhicules + maintenance
│   │   ├── useTeam.js        ← Membres de l'équipe
│   │   ├── useMessages.js    ← Messages temps réel
│   │   └── useNotifications.js ← Notifications temps réel
│   ├── components/
│   │   ├── ui.jsx            ← Composants UI partagés
│   │   ├── Sidebar.jsx       ← Barre de navigation
│   │   ├── TopBar.jsx        ← Barre du haut
│   │   └── Notifications.jsx ← Cloche + toasts + mentions
│   ├── pages/
│   │   ├── Login.jsx         ← Page de connexion
│   │   ├── Dashboard.jsx     ← Vue d'ensemble
│   │   ├── Projects.jsx      ← Projets (Kanban + Liste)
│   │   ├── Vehicles.jsx      ← Flotte + maintenance
│   │   └── Modules.jsx       ← Calendrier, Budget, Messages, Galerie
│   ├── App.jsx               ← Composant racine
│   └── main.jsx              ← Point d'entrée
├── supabase-schema.sql       ← Schéma + données initiales
├── vercel.json               ← Config Vercel
└── .env.example              ← Template variables d'environnement
```

---

## En cas de problème

- **"Invalid API key"** → Vérifier les variables d'environnement dans Vercel
- **"relation does not exist"** → Le schéma SQL n'a pas été exécuté, refaire l'étape 2
- **Données vides** → Le schéma SQL a été exécuté sans les INSERT, relancer la partie données
- **Connexion échoue** → Vérifier que l'utilisateur a bien "Auto Confirm" dans Supabase Auth
