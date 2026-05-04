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

1. Dans Supabase, menu de gauche → **SQL Editor**
2. Cliquer **New query**
3. Coller tout le contenu du fichier `supabase-schema.sql` (dans ce dossier)
4. Cliquer **Run** (ou Ctrl+Enter)
5. Vérifier qu'il n'y a pas d'erreurs rouges

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
