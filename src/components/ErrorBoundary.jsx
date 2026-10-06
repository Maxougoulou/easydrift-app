import { Component } from 'react';
import { THEME } from '../lib/theme';

// Filet de dernier recours. Sans lui, la moindre exception de rendu laissait
// une page BLANCHE : pas de logo, pas de message, pas de bouton. Un mécano sur
// un circuit n'avait aucun moyen de comprendre ni de s'en sortir, et personne
// côté EASYDRIFT n'en était informé.

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // En l'absence d'outil de suivi, on laisse au moins une trace exploitable
    // si quelqu'un ouvre la console. À remplacer par Sentry le jour venu.
    console.error('[EasyDrift] plantage de rendu :', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const detail = String(this.state.error?.message ?? this.state.error);

    return (
      <div style={{
        minHeight: '100vh', background: THEME.bg.app, color: THEME.text.primary,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <img src="/logo-easydrift.png" alt="EASYDRIFT" style={{ height: 24, marginBottom: 26 }} />

          <div style={{
            width: 62, height: 62, borderRadius: '50%', margin: '0 auto 20px',
            background: `${THEME.accent.red}18`, border: `1.5px solid ${THEME.accent.red}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 27,
          }}>⚠</div>

          <div style={{
            fontSize: 20, fontWeight: 800, fontFamily: 'Rajdhani, sans-serif', marginBottom: 10,
          }}>Un problème est survenu</div>

          <div style={{ fontSize: 14, color: THEME.text.secondary, lineHeight: 1.6, marginBottom: 24 }}>
            L'application s'est arrêtée de façon inattendue. Recharger la page suffit
            généralement à repartir. Si ça recommence, préviens EASYDRIFT.
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '14px 30px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: THEME.accent.orange, color: '#fff', fontSize: 15, fontWeight: 800,
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em',
            }}
          >Recharger la page</button>

          {/* Repliée par défaut : inutile au mécano, précieuse au téléphone
              quand il décrit le problème. */}
          <details style={{ marginTop: 26, textAlign: 'left' }}>
            <summary style={{ fontSize: 12, color: THEME.text.muted, cursor: 'pointer' }}>
              Détail technique
            </summary>
            <pre style={{
              marginTop: 10, padding: '10px 12px', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
              fontSize: 11, color: THEME.text.muted, whiteSpace: 'pre-wrap',
              wordBreak: 'break-word', maxHeight: 160, overflowY: 'auto',
            }}>{detail}</pre>
          </details>
        </div>
      </div>
    );
  }
}
