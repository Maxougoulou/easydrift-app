import { lazy, Suspense } from 'react'
import { configManquante } from './lib/supabase.js'
import { THEME } from './lib/theme.js'

// Chargement à la demande. Avant, un mécano qui scannait une puce téléchargeait
// aussi tout l'espace d'administration (Track Days, Véhicules, Expédition,
// Configurateur…) qu'il ne verra jamais — plusieurs centaines de kilo-octets
// de trop sur une connexion de paddock.
const App = lazy(() => import('./App.jsx'))
const FichePublique = lazy(() => import('./pages/FichePublique.jsx').then(m => ({ default: m.FichePublique })))
const VehiculePublique = lazy(() => import('./pages/VehiculePublique.jsx').then(m => ({ default: m.VehiculePublique })))
const SavPublique = lazy(() => import('./pages/SavPublique.jsx').then(m => ({ default: m.SavPublique })))

// Aiguillage de l'application.
//
// Routes publiques sans compte :
//   /fiche/<token> — fiche d'intervention (lien envoyé au mécano)
//   /v/<token>     — page véhicule PERMANENTE (gravée sur la puce NFC)
//   /sav/<token>   — déclaration d'anneau défectueux (lien envoyé au client)

// La regex n'est volontairement PAS ancrée en fin de chaîne : les messageries
// collent souvent une ponctuation au lien (« …/fiche/<uuid>. » dans un SMS),
// ce qui faisait atterrir le mécano sur l'écran de connexion EASYDRIFT, avec
// un mot de passe qu'il n'aura jamais.
const MOTIF_ROUTE = /^\/(fiche|v|sav)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
const MOTIF_PUBLIC = /^\/(fiche|v|sav)\//i

// Message plein écran sans dépendance : utilisable même quand rien d'autre
// ne fonctionne.
export function MessagePleinEcran({ icone, titre, texte }) {
  return (
    <div style={{
      minHeight: '100vh', background: THEME.bg.app, color: THEME.text.primary,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <img src="/logo-easydrift.png" alt="EASYDRIFT" style={{ height: 24, marginBottom: 28 }} />
        <div style={{ fontSize: 42, marginBottom: 16 }}>{icone}</div>
        <div style={{ fontSize: 19, fontWeight: 800, fontFamily: 'Rajdhani, sans-serif', marginBottom: 10 }}>{titre}</div>
        <div style={{ fontSize: 14, color: THEME.text.secondary, lineHeight: 1.6 }}>{texte}</div>
      </div>
    </div>
  )
}

// Écran d'attente pendant le chargement du morceau de code concerné.
function Patientez() {
  return (
    <div style={{
      minHeight: '100vh', background: THEME.bg.app,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: `3px solid ${THEME.accent.orange}`,
        animation: 'ed-spin 0.8s linear infinite',
      }} />
      <style>{'@keyframes ed-spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  )
}

export function Root() {
  const path = window.location.pathname
  const route = path.match(MOTIF_ROUTE)

  if (configManquante) {
    return (
      <MessagePleinEcran
        icone="⚙"
        titre="Application mal configurée"
        texte="La connexion à la base de données n'est pas paramétrée sur ce déploiement. Préviens EASYDRIFT : les variables d'environnement Vercel sont à renseigner."
      />
    )
  }

  if (route) {
    const type = route[1].toLowerCase()
    const token = route[2]
    const page = type === 'fiche' ? <FichePublique token={token} />
      : type === 'sav' ? <SavPublique token={token} />
      : <VehiculePublique token={token} />
    return <Suspense fallback={<Patientez />}>{page}</Suspense>
  }

  // Lien public manifestement abîmé : on l'explique, au lieu de renvoyer
  // silencieusement sur le formulaire de connexion.
  if (MOTIF_PUBLIC.test(path)) {
    return (
      <MessagePleinEcran
        icone="🔗"
        titre="Lien incomplet"
        texte="Ce lien semble avoir été tronqué en route. Rouvre-le depuis le message d'origine, ou demande à EASYDRIFT de te le renvoyer."
      />
    )
  }

  return <Suspense fallback={<Patientez />}><App /></Suspense>
}
