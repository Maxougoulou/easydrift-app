import { useState } from 'react';
import { THEME } from '../lib/theme';

const labelStyle = {
  display: 'block', fontSize: 11, color: THEME.text.muted,
  letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase',
};

const inputStyle = {
  width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`,
  borderRadius: 8, padding: '12px 14px', color: THEME.text.primary,
  // 16 px minimum : en dessous, iOS zoome tout seul sur le champ au focus
  // et l'utilisateur se retrouve avec une page décadrée.
  fontSize: 16, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
};

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
      // Marge latérale : sans elle, la carte touchait les bords sur mobile.
      padding: 16, boxSizing: 'border-box',
      background: THEME.bg.app,
      backgroundImage: `radial-gradient(ellipse at 60% 40%, rgba(240,120,20,0.07) 0%, transparent 60%)`,
    }}>
      <div style={{
        // Était en `width: 400` fixe : sur un écran de 390 px, la carte
        // débordait et le bord droit des champs était coupé — et comme le
        // body est en overflow hidden, impossible d'y accéder en défilant.
        width: '100%', maxWidth: 400,
        background: THEME.bg.card, border: `1px solid ${THEME.border}`,
        borderRadius: 20, padding: 'clamp(24px, 7vw, 40px) clamp(20px, 6vw, 40px) 32px',
        boxSizing: 'border-box',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo-easydrift.png" alt="EasyDrift" style={{ height: 32, objectFit: 'contain' }} />
          <div style={{ fontSize: 12, color: THEME.text.muted, marginTop: 8, letterSpacing: '0.08em' }}>SUIVI DE PROJET</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            {/* htmlFor relie le libellé au champ : toucher « Email » place le
                curseur dedans, ce qui double la zone tactile sur téléphone. */}
            <label htmlFor="login-email" style={labelStyle}>Email</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="votre@email.fr"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="login-password" style={labelStyle}>Mot de passe</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={inputStyle}
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
              // Encre sombre sur l'aplat orange ; blanc sur l'orange translucide
              // du chargement, qui laisse passer le fond sombre.
              color: loading ? '#fff' : THEME.inkOnBright,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 14,
              letterSpacing: '0.05em', transition: 'all 0.15s',
            }}
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        {/* Le bloc « Accès équipe » qui se trouvait ici nommait les deux
            titulaires de compte et renvoyait à Supabase, en clair, pour
            n'importe quel visiteur. Il donnait les identifiants valides à qui
            voulait les deviner et exposait l'infrastructure. Supprimé.
            L'accès se transmet de vive voix, pas sur l'écran de connexion. */}
        <div style={{ marginTop: 22, fontSize: 11.5, color: THEME.text.muted, textAlign: 'center', lineHeight: 1.5 }}>
          Accès réservé à l'équipe EASYDRIFT.
        </div>
      </div>
    </div>
  );
}
