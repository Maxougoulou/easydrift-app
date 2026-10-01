import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FichePublique } from './pages/FichePublique.jsx'
import { VehiculePublique } from './pages/VehiculePublique.jsx'
import { SavPublique } from './pages/SavPublique.jsx'

// Routes publiques sans compte :
//   /fiche/<token> — fiche d'intervention (lien envoyé au mécano)
//   /v/<token>     — page véhicule PERMANENTE (gravée sur la puce NFC)
//   /sav/<token>   — déclaration d'anneau défectueux (lien envoyé au client)
const ficheMatch = window.location.pathname.match(/^\/fiche\/([0-9a-f-]{36})\/?$/i)
const vehiculeMatch = window.location.pathname.match(/^\/v\/([0-9a-f-]{36})\/?$/i)
const savMatch = window.location.pathname.match(/^\/sav\/([0-9a-f-]{36})\/?$/i)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {ficheMatch
      ? <FichePublique token={ficheMatch[1]} />
      : vehiculeMatch
        ? <VehiculePublique token={vehiculeMatch[1]} />
        : savMatch
          ? <SavPublique token={savMatch[1]} />
          : <App />}
  </StrictMode>,
)
