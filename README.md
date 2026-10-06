# EasyDrift — Suivi

Outil interne EASYDRIFT : suivi d'atelier, fiches d'intervention pour les
mécaniciens, gestion des véhicules et des pièces, track days, expédition, et
SAV « anneaux défectueux ».

## Stack

- **Vite + React 19** — pas de framework de routage : l'aiguillage se fait dans
  [`src/Root.jsx`](src/Root.jsx) à partir de `window.location.pathname`
- **Supabase** — PostgreSQL, authentification, stockage de fichiers, temps réel
- **Vercel** — déploiement automatique à chaque push sur `main`

## Démarrer en local

```bash
npm install
cp .env.example .env     # puis renseigner les deux variables
npm run dev
```

Sans `.env`, l'application démarre quand même et affiche un écran
« Application mal configurée » au lieu d'une page blanche.

## Les deux moitiés de l'application

**L'espace EASYDRIFT** (`/`) demande un compte. Tout passe par `App.jsx` et la
barre latérale.

**Les pages publiques** s'ouvrent **sans compte**, par un lien ou un scan de
puce NFC. Ce sont elles qui sont utilisées sur le terrain, souvent sur un
téléphone avec une connexion médiocre :

| Route | Page | Usage |
|---|---|---|
| `/fiche/<token>` | `FichePublique` | Checklist du mécano, envoyée par lien |
| `/v/<token>` | `VehiculePublique` | Gravée sur la puce NFC collée au véhicule |
| `/sav/<token>` | `SavPublique` | Questionnaire client FR/EN pour un anneau cassé |

Ces pages n'ont **aucun accès direct aux tables** : tout transite par des
fonctions RPC Supabase qui exigent le jeton du lien.

### Règles à respecter en touchant aux pages publiques

- **Lire `error` sur chaque appel Supabase.** Le client ne lève jamais
  d'exception, il renvoie `{ data, error }`. Un appel non vérifié fait croire à
  un enregistrement qui n'a pas eu lieu.
- **Ne jamais confondre « introuvable » et « hors réseau ».** Afficher « ce lien
  est invalide » sur une coupure envoie le mécano sur une fausse piste.
- **Donner son propre conteneur de défilement à chaque page.** `index.html`
  pose `body { overflow: hidden }` : une page qui compte sur le défilement de
  la fenêtre reste figée sur son premier écran.
- **`toast()` ne fonctionne pas ici.** Son handler n'est branché que dans
  `App.jsx`, jamais monté sur ces routes. Utiliser un message local.

## Base de données

Les 12 fichiers `supabase-*.sql` s'appliquent **dans l'ordre**, à la main, dans
l'éditeur SQL de Supabase. L'ordre et le rôle de chacun sont décrits dans
[DEPLOIEMENT.md](DEPLOIEMENT.md) — s'y référer avant toute reprise, un fichier
rejoué dégrade silencieusement les fonctions publiques.

Le projet est sur l'offre gratuite : il **se met en pause après ~7 jours sans
activité**. Symptôme : l'app semble vide, les scans NFC n'affichent plus rien,
alors que le site Vercel répond normalement. Se réactive depuis le dashboard.

## Commandes

```bash
npm run dev       # serveur de développement
npm run build     # build de production dans dist/
npm run preview   # servir le build localement
npm run lint      # ESLint
```
