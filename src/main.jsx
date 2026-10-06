import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Root } from './Root.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

// L'ErrorBoundary enveloppe TOUT : sans elle, une exception de rendu laissait
// une page blanche, y compris au mécano sur le circuit.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
