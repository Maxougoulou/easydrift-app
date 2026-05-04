import { useState } from 'react';
import { THEME } from '../lib/theme';

export function LoginPage({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await onSignIn(email, password);
    if (error) {
      setError('Email ou mot de passe incorrect.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: THEME.bg.app,
      backgroundImage: `radial-gradient(ellipse at 60% 40%, rgba(240,120,20,0.07) 0%, transparent 60%)`,
    }}>
      <div style={{
        width: 400, background: THEME.bg.card, border: `1px solid ${THEME.border}`,
        borderRadius: 20, padding: '40px 40px 32px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-easydrift.png" alt="EasyDrift" style={{ height: 32, objectFit: 'contain' }} />
          <div style={{ fontSize: 12, color: THEME.text.muted, marginTop: 8, letterSpacing: '0.08em' }}>SUIVI DE PROJET</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: THEME.text.muted, letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="votre@email.fr"
              style={{
                width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`,
                borderRadius: 8, padding: '11px 14px', color: THEME.text.primary,
                fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: THEME.text.muted, letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`,
                borderRadius: 8, padding: '11px 14px', color: THEME.text.primary,
                fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: THEME.accent.red }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              background: loading ? 'rgba(240,120,20,0.5)' : THEME.accent.orange,
              border: 'none', borderRadius: 8, padding: '12px',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.05em', transition: 'all 0.15s',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: `1px solid ${THEME.border}` }}>
          <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Accès équipe</div>
          <div style={{ fontSize: 12, color: THEME.text.secondary, lineHeight: 1.6 }}>
            Maxence & Alexandre — utilisez l'email et le mot de passe définis dans Supabase.
          </div>
        </div>
      </div>
    </div>
  );
}
