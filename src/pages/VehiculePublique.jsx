import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { THEME } from '../lib/theme';

// Page NFC véhicule — URL PERMANENTE /v/<token> gravée sur la puce.
// S'il y a une fiche d'intervention en cours → redirection directe dessus.
// Sinon : identité du véhicule + message.

export function VehiculePublique({ token }) {
  const [data, setData] = useState(null);
  const [state, setState] = useState('loading'); // loading | redirect | idle | notfound

  useEffect(() => {
    (async () => {
      const { data: result, error } = await supabase.rpc('vehicule_public_get', { p_token: token });
      if (error || !result) { setState('notfound'); return; }
      setData(result);
      if (result.fiche_token) {
        setState('redirect');
        // Fiche en cours → on envoie le mécano directement sur sa checklist
        window.location.replace(`/fiche/${result.fiche_token}`);
      } else {
        setState('idle');
      }
    })();
  }, [token]);

  return (
    <div style={{ height: '100vh', overflowY: 'auto', background: THEME.bg.app, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${THEME.border}`, background: THEME.bg.sidebar, display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
        <img src="/logo-easydrift.png" alt="EASYDRIFT" style={{ height: 22, display: 'block' }} />
        <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Véhicule</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px 40px' }}>
        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: 60, color: THEME.text.muted }}>Chargement…</div>
        )}

        {state === 'redirect' && (
          <div style={{ textAlign: 'center', padding: 60, color: THEME.text.secondary }}>
            <div style={{ fontSize: 34, marginBottom: 14 }}>🔧</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Fiche d'intervention en cours</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Redirection vers la checklist…</div>
          </div>
        )}

        {state === 'notfound' && (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Véhicule introuvable</div>
            <div style={{ fontSize: 13, color: THEME.text.muted, marginTop: 8 }}>Cette puce ne correspond à aucun véhicule EASYDRIFT.</div>
          </div>
        )}

        {state === 'idle' && data && (
          <>
            {/* Carte véhicule */}
            <div style={{ background: THEME.bg.card, borderRadius: 16, border: `1px solid ${THEME.border}`, overflow: 'hidden', marginBottom: 16 }}>
              {data.vehicle.photo_url && (
                <div style={{ height: 170, overflow: 'hidden' }}>
                  <img src={data.vehicle.photo_url} alt={data.vehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>{data.vehicle.name}</div>
                <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Immat</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>{data.vehicle.plate ?? '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Année</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>{data.vehicle.year || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Kilométrage</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif' }}>{(data.vehicle.mileage ?? 0).toLocaleString('fr-FR')} km</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pas de fiche en cours */}
            <div style={{ padding: '16px 18px', borderRadius: 12, background: `${THEME.accent.green}0D`, border: `1px solid ${THEME.accent.green}33`, marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.accent.green, marginBottom: 4 }}>✓ Aucune intervention en cours</div>
              <div style={{ fontSize: 12, color: THEME.text.secondary, lineHeight: 1.5 }}>
                Ce véhicule n'a pas de fiche d'intervention ouverte. Si tu as ce véhicule à l'atelier, contacte EASYDRIFT pour recevoir la fiche.
              </div>
            </div>

            {data.derniere_intervention && (
              <div style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}` }}>
                <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Dernière intervention</div>
                <div style={{ fontSize: 13, color: THEME.text.secondary }}>
                  {data.derniere_intervention.titre}
                  {data.derniere_intervention.date && (
                    <span style={{ color: THEME.text.muted }}> — {new Date(data.derniere_intervention.date).toLocaleDateString('fr-FR')}</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
