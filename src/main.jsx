import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { FichePublique } from './pages/FichePublique.jsx'

// Route publique mécano : /fiche/<token> — pas de compte, pas de sidebar.
// Tout le reste passe par l'app authentifiée.
const ficheMatch = window.location.pathname.match(/^\/fiche\/([0-9a-f-]{36})\/?$/i)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {ficheMatch ? <FichePublique token={ficheMatch[1]} /> : <App />}
  </StrictMode>,
)
