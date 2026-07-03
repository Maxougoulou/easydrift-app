import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { THEME } from '../lib/theme';

// Espace mécano — accès par lien public /fiche/:token, SANS compte.
// Mobile-first : gros boutons, zéro friction.
// Toutes les actions passent par des RPC sécurisées par le token.

export function FichePublique({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showKmEdit, setShowKmEdit] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const load = useCallback(async () => {
    const { data: result, error } = await supabase.rpc('fiche_publique_get', { p_token: token });
    if (error || !result) {
      setNotFound(true);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggleTache = async (tache, fait, commentaire) => {
    // Optimiste
    setData(d => ({
      ...d,
      taches: d.taches.map(t => t.id === tache.id ? { ...t, fait, ...(commentaire !== undefined ? { commentaire } : {}) } : t),
    }));
    await supabase.rpc('fiche_publique_toggle_tache', {
      p_token: token, p_tache_id: tache.id, p_fait: fait,
      p_commentaire: commentaire !== undefined ? commentaire : null,
    });
  };

  const addTache = async (description, commentaire) => {
    const { data: newId } = await supabase.rpc('fiche_publique_ajouter_tache', {
      p_token: token, p_description: description, p_commentaire: commentaire || null,
    });
    if (newId) await load();
    setShowAddTask(false);
  };

  const updateKm = async (km) => {
    const { data: ok } = await supabase.rpc('fiche_publique_update_km', { p_token: token, p_km: parseInt(km) });
    if (ok) await load();
    setShowKmEdit(false);
  };

  // Upload photo par le mécano (bucket public, dossier taches/ autorisé pour anon)
  const uploadTachePhoto = async (tache, file) => {
    if (!file) return;
    const safeName = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `taches/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
    const { error } = await supabase.storage.from('vehicle-files').upload(path, file);
    if (error) { alert('Erreur envoi photo : ' + error.message); return; }
    const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
    await supabase.rpc('fiche_publique_tache_photo', { p_token: token, p_tache_id: tache.id, p_photo_url: pub.publicUrl });
    await load();
  };

  const terminer = async () => {
    setFinishing(true);
    await supabase.rpc('fiche_publique_terminer', { p_token: token });
    await load();
    setFinishing(false);
  };

  // ── États spéciaux ──
  if (loading) {
    return <PublicShell><div style={{ textAlign: 'center', padding: 60, color: THEME.text.muted }}>Chargement…</div></PublicShell>;
  }
  if (notFound || !data) {
    return (
      <PublicShell>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>🔍</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Fiche introuvable</div>
          <div style={{ fontSize: 13, color: THEME.text.muted, marginTop: 8 }}>Le lien est invalide ou la fiche a été supprimée.</div>
        </div>
      </PublicShell>
    );
  }

  const { fiche, vehicle, taches, pieces = [] } = data;
  const isClosed = fiche.statut === 'terminée';
  const isDone = fiche.travail_termine;
  const readOnly = isClosed;
  const tachesDemandees = taches.filter(t => t.origine !== 'mecano');
  const tachesMecano = taches.filter(t => t.origine === 'mecano');
  const faites = tachesDemandees.filter(t => t.fait).length;

  return (
    <PublicShell>
      {/* En-tête véhicule */}
      <div style={{ background: THEME.bg.card, borderRadius: 14, border: `1px solid ${THEME.border}`, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.orange}0A` }}>
          <div style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Fiche d'intervention</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>{fiche.titre}</div>
        </div>
        <div style={{ padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: '10px 24px' }}>
          <Info label="Véhicule" value={vehicle.name} />
          <Info label="Immat" value={vehicle.plate ?? '—'} />
          <button onClick={() => !readOnly && setShowKmEdit(true)} style={{ background: 'none', border: 'none', padding: 0, cursor: readOnly ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
            <Info label="Kilométrage" value={`${(vehicle.mileage ?? 0).toLocaleString('fr-FR')} km ${readOnly ? '' : '✎'}`} accent />
          </button>
        </div>
        {fiche.notes && (
          <div style={{ padding: '10px 18px', borderTop: `1px solid ${THEME.border}`, fontSize: 13, color: THEME.text.secondary, fontStyle: 'italic' }}>
            💬 {fiche.notes}
          </div>
        )}
        {/* Pièces en rab fournies avec le véhicule */}
        {pieces.length > 0 && (
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${THEME.border}`, background: `${THEME.accent.green}06` }}>
            <div style={{ fontSize: 10, color: THEME.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              📦 Pièces fournies avec le véhicule — rien à commander
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {pieces.map(p => {
                const epuise = (p.qty ?? 1) === 0;
                const aRecommander = p.reorder || epuise;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: epuise ? THEME.accent.red : THEME.accent.green, fontFamily: 'Rajdhani, sans-serif', flexShrink: 0, minWidth: 28 }}>{p.qty ?? 1}×</span>
                    <span style={{ color: THEME.text.primary, fontWeight: 600 }}>{p.name}</span>
                    {p.reference && <span style={{ fontSize: 11, color: THEME.text.muted }}>réf. {p.reference}</span>}
                    {aRecommander && (
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 4, background: THEME.accent.yellowDim, color: THEME.accent.yellow }}>
                        ⚠ À recommander{epuise ? ' — stock épuisé' : ''}
                      </span>
                    )}
                    {p.notes && <span style={{ fontSize: 11, color: THEME.text.muted, fontStyle: 'italic' }}>— {p.notes}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bandeau état */}
      {isClosed && (
        <Banner color={THEME.accent.green}>✅ Cette fiche est clôturée. Merci !</Banner>
      )}
      {isDone && !isClosed && (
        <Banner color={THEME.accent.blue}>👍 Travail marqué comme terminé. EASYDRIFT va clôturer la fiche.</Banner>
      )}

      {/* Progression */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${tachesDemandees.length ? (faites / tachesDemandees.length) * 100 : 0}%`, height: '100%', background: THEME.accent.orange, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.secondary, whiteSpace: 'nowrap' }}>{faites}/{tachesDemandees.length}</span>
      </div>

      {/* Tâches demandées */}
      <SectionTitle>Travaux demandés</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {tachesDemandees.map(t => (
          <TacheCard key={t.id} tache={t} readOnly={readOnly} onToggle={toggleTache} onPhoto={uploadTachePhoto} />
        ))}
      </div>

      {/* Tâches ajoutées par le mécano */}
      {tachesMecano.length > 0 && (
        <>
          <SectionTitle>Interventions supplémentaires</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {tachesMecano.map(t => (
              <TacheCard key={t.id} tache={t} readOnly={readOnly} onToggle={toggleTache} onPhoto={uploadTachePhoto} isMecano />
            ))}
          </div>
        </>
      )}

      {/* Ajouter une intervention */}
      {!readOnly && (
        <button
          onClick={() => setShowAddTask(true)}
          style={{
            width: '100%', padding: '15px', borderRadius: 12, marginBottom: 20,
            border: `2px dashed ${THEME.accent.orange}66`, background: `${THEME.accent.orange}0A`,
            color: THEME.accent.orange, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.03em',
          }}
        >
          + Ajouter une intervention non prévue
        </button>
      )}

      {/* Bouton Terminé */}
      {!readOnly && !isDone && (
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 0 20px', background: `linear-gradient(transparent, ${THEME.bg.app} 30%)` }}>
          <button
            onClick={terminer}
            disabled={finishing}
            style={{
              width: '100%', padding: '17px', borderRadius: 14, border: 'none',
              background: THEME.accent.green, color: '#fff',
              fontSize: 17, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em',
              boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
            }}
          >
            {finishing ? '…' : '✓ J\'ai terminé'}
          </button>
        </div>
      )}

      {showAddTask && <AddTaskSheet onAdd={addTache} onClose={() => setShowAddTask(false)} />}
      {showKmEdit && <KmSheet current={vehicle.mileage} onSave={updateKm} onClose={() => setShowKmEdit(false)} />}
    </PublicShell>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────────

function PublicShell({ children }) {
  // Le body global est en overflow:hidden → cette page gère son propre scroll
  return (
    <div style={{ height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch', background: THEME.bg.app, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${THEME.border}`, background: THEME.bg.sidebar, display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
        <img src="/logo-easydrift.png" alt="EASYDRIFT" style={{ height: 22, display: 'block' }} />
        <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 'auto', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Espace mécano</span>
      </div>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '18px 14px 40px' }}>{children}</div>
    </div>
  );
}

function Info({ label, value, accent }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: accent ? THEME.accent.orange : THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>{value}</div>
    </div>
  );
}

function Banner({ color, children }) {
  return (
    <div style={{ padding: '13px 16px', borderRadius: 10, background: `${color}14`, border: `1px solid ${color}44`, marginBottom: 14, fontSize: 14, fontWeight: 600, color }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{children}</div>;
}

function TacheCard({ tache, readOnly, onToggle, onPhoto, isMecano }) {
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState(tache.commentaire ?? '');
  const [uploading, setUploading] = useState(false);

  const saveComment = () => {
    onToggle(tache, tache.fait, comment);
    setShowComment(false);
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    await onPhoto(tache, file);
    setUploading(false);
  };

  return (
    <div style={{
      background: THEME.bg.card, borderRadius: 12,
      border: `1px solid ${tache.fait ? THEME.accent.green + '44' : THEME.border}`,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => !readOnly && onToggle(tache, !tache.fait)}
        disabled={readOnly}
        style={{
          display: 'flex', alignItems: 'center', gap: 14, width: '100%',
          padding: '15px 16px', background: 'none', border: 'none',
          cursor: readOnly ? 'default' : 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          border: `2.5px solid ${tache.fait ? THEME.accent.green : THEME.text.muted}`,
          background: tache.fait ? THEME.accent.green : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 15, fontWeight: 900, transition: 'all 0.15s',
        }}>{tache.fait ? '✓' : ''}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 600,
            color: tache.fait ? THEME.text.muted : THEME.text.primary,
            textDecoration: tache.fait ? 'line-through' : 'none',
          }}>{tache.description}</div>
          {isMecano && (
            <span style={{ fontSize: 10, color: THEME.accent.blue, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ajouté par le mécano</span>
          )}
          {tache.commentaire && !showComment && (
            <div style={{ fontSize: 12, color: THEME.text.secondary, marginTop: 3, fontStyle: 'italic' }}>💬 {tache.commentaire}</div>
          )}
        </div>
      </button>

      {/* Photo jointe */}
      {tache.photo_url && (
        <div style={{ padding: '0 16px 10px 56px' }}>
          <a href={tache.photo_url} target="_blank" rel="noopener noreferrer">
            <img src={tache.photo_url} alt="Photo tâche" style={{ maxWidth: 140, maxHeight: 100, borderRadius: 8, border: `1px solid ${THEME.border}`, display: 'block' }} />
          </a>
        </div>
      )}

      {!readOnly && (
        <div style={{ padding: '0 16px 12px 56px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          {showComment ? (
            <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
              <input
                autoFocus
                style={{ flex: 1, background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '8px 12px', color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}
                placeholder="Ton commentaire…"
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveComment(); }}
              />
              <button onClick={saveComment} style={{ background: THEME.accent.orange, border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
            </div>
          ) : (
            <button onClick={() => setShowComment(true)} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              {tache.commentaire ? '✎ Modifier le commentaire' : '+ Commentaire'}
            </button>
          )}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12, color: THEME.text.muted }}>
            {uploading ? 'Envoi…' : tache.photo_url ? '📷 Changer la photo' : '📷 Photo'}
            <input
              type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
              onChange={e => handlePhoto(e.target.files?.[0])}
              disabled={uploading}
            />
          </label>
        </div>
      )}
    </div>
  );
}

function AddTaskSheet({ onAdd, onClose }) {
  const [desc, setDesc] = useState('');
  const [comment, setComment] = useState('');
  const inp = { width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '13px 14px', color: THEME.text.primary, fontSize: 15, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: '20px 20px 0 0', border: `1px solid ${THEME.border}`, padding: '22px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)', width: '100%', maxWidth: 640 }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 14 }}>Intervention supplémentaire</div>
        <input
          autoFocus
          style={{ ...inp, marginBottom: 10 }}
          placeholder="Qu'est-ce que tu as fait ? (ex : silent bloc AV changé)"
          value={desc}
          onChange={e => setDesc(e.target.value)}
        />
        <input
          style={{ ...inp, marginBottom: 16 }}
          placeholder="Commentaire (optionnel)"
          value={comment}
          onChange={e => setComment(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.text.secondary, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button
            onClick={() => desc.trim() && onAdd(desc.trim(), comment.trim())}
            disabled={!desc.trim()}
            style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: desc.trim() ? THEME.accent.orange : 'rgba(255,255,255,0.06)', color: desc.trim() ? '#fff' : THEME.text.muted, fontSize: 15, fontWeight: 800, cursor: desc.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >Ajouter</button>
        </div>
      </div>
    </div>
  );
}

function KmSheet({ current, onSave, onClose }) {
  const [km, setKm] = useState(current ?? '');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: '20px 20px 0 0', border: `1px solid ${THEME.border}`, padding: '22px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)', width: '100%', maxWidth: 640 }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 14 }}>Kilométrage actuel</div>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          style={{ width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '15px 14px', color: THEME.text.primary, fontSize: 20, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
          value={km}
          onChange={e => setKm(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.text.secondary, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          <button
            onClick={() => km && onSave(km)}
            style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: THEME.accent.orange, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}
          >Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
