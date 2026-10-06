import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { THEME } from '../lib/theme';

// Espace mécano — accès par lien public /fiche/:token, SANS compte.
// Mobile-first : gros boutons, zéro friction.
// Toutes les actions passent par des RPC sécurisées par le token.

export function FichePublique({ token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  // Trois situations que l'ancien code confondait, au prix de fausses alertes :
  //   notFound : le serveur a REPONDU, le jeton n'existe pas → vraie erreur
  //   offline  : le serveur n'a PAS repondu → ce qui est affiche reste valable
  // Melanger les deux affichait « fiche supprimee » sur une simple coupure,
  // definitivement, puisque rien ne remettait l'etat a zero.
  const [notFound, setNotFound] = useState(false);
  const [offline, setOffline] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [flash, setFlash] = useState(null);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showKmEdit, setShowKmEdit] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pieceBusy, setPieceBusy] = useState(false);

  // Message transitoire. toast() est inoperant ici : son handler n'est branche
  // que dans App.jsx, qui n'est jamais monte sur les routes publiques.
  const say = useCallback((type, text) => setFlash({ type, text, at: Date.now() }), []);
  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), 7000);
    return () => clearTimeout(id);
  }, [flash]);

  const load = useCallback(async () => {
    const { data: result, error } = await supabase.rpc('fiche_publique_get', { p_token: token });
    if (error) {
      // Panne reseau : surtout ne rien effacer de ce qui est deja affiche.
      setOffline(true);
      setLoading(false);
      return false;
    }
    if (!result) {
      setNotFound(true);
      setLoading(false);
      return false;
    }
    setData(result);
    setNotFound(false);
    setOffline(false);
    setLastSync(new Date());
    setLoading(false);
    return true;
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // La fiche peut être modifiée côté EASYDRIFT pendant que le mécano l'a ouverte :
  // resynchronisation toutes les 10 s + à chaque retour sur l'onglet.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') load();
    };
    const interval = setInterval(refresh, 10000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  // Chaque mutation lit desormais son `error` : le client Supabase ne leve
  // jamais d'exception, il renvoie { data, error }. Sans cette lecture, toutes
  // ces fonctions se terminaient « avec succes » meme quand rien n'etait parti.

  const toggleTache = async (tache, fait, commentaire) => {
    const avant = data?.taches?.find(t => t.id === tache.id);
    setData(d => ({
      ...d,
      taches: d.taches.map(t => t.id === tache.id ? { ...t, fait, ...(commentaire !== undefined ? { commentaire } : {}) } : t),
    }));
    const { data: ok, error } = await supabase.rpc('fiche_publique_toggle_tache', {
      p_token: token, p_tache_id: tache.id, p_fait: fait,
      p_commentaire: commentaire !== undefined ? commentaire : null,
    });
    if (error || ok === false) {
      // On restaure l'etat exact d'avant : l'ecran ne doit jamais affirmer un
      // enregistrement qui n'a pas eu lieu.
      if (avant) setData(d => ({ ...d, taches: d.taches.map(t => t.id === tache.id ? avant : t) }));
      if (error) {
        setOffline(true);
        say('error', 'Pas de réseau : la coche n’a PAS été enregistrée.');
      } else {
        say('error', 'Fiche clôturée côté EASYDRIFT : modification refusée.');
      }
      return false;
    }
    return true;
  };

  // Renvoie false quand l'ajout a echoue, pour que le tiroir reste ouvert et
  // que le texte saisi par le mecano ne soit pas detruit.
  const addTache = async (description, commentaire) => {
    const { data: newId, error } = await supabase.rpc('fiche_publique_ajouter_tache', {
      p_token: token, p_description: description, p_commentaire: commentaire || null,
    });
    if (error || !newId) {
      if (error) {
        setOffline(true);
        say('error', 'Pas de réseau : intervention non ajoutée. Ton texte est conservé, réessaie.');
      } else {
        say('error', 'Fiche clôturée côté EASYDRIFT : ajout refusé.');
      }
      return false;
    }
    await load();
    setShowAddTask(false);
    say('ok', 'Intervention ajoutée.');
    return true;
  };

  const updateKm = async (km) => {
    const valeur = parseInt(km, 10);
    if (!Number.isFinite(valeur) || valeur < 0) {
      say('error', 'Kilométrage invalide.');
      return false;
    }
    const precedent = data?.vehicle?.mileage;
    const { data: ok, error } = await supabase.rpc('fiche_publique_update_km', { p_token: token, p_km: valeur });
    if (error) {
      setOffline(true);
      say('error', 'Pas de réseau : le kilométrage n’a pas été enregistré.');
      return false;
    }
    if (!ok) {
      say('error', 'Kilométrage refusé par le serveur.');
      return false;
    }
    await load();
    setShowKmEdit(false);
    // Le serveur refuse de faire RECULER le compteur du vehicule. Sans ce
    // message, le mecano voyait l'ancienne valeur revenir et reessayait en
    // boucle sans comprendre pourquoi.
    if (typeof precedent === 'number' && valeur < precedent) {
      say('error', `Fiche à jour, mais le compteur du véhicule reste à ${precedent.toLocaleString('fr-FR')} km : il ne peut pas reculer. Préviens EASYDRIFT.`);
    } else {
      say('ok', 'Kilométrage enregistré.');
    }
    return true;
  };

  // Le mécano déclare une pièce utilisée (+1) ou annule (-1)
  const declarerPiece = async (piece, delta) => {
    if (pieceBusy) return;  // sur connexion lente, le double appui comptait double
    setPieceBusy(true);
    const { data: res, error } = await supabase.rpc('fiche_publique_utiliser_piece', {
      p_token: token, p_part_id: piece.id, p_delta: delta,
    });
    if (error) {
      setOffline(true);
      say('error', 'Pas de réseau : la pièce n’a pas été décomptée.');
    } else if (!res?.ok) {
      say('error', delta > 0
        ? 'Impossible : toutes les pièces fournies sont déjà déclarées.'
        : 'Impossible d’annuler : aucune pièce déclarée pour l’instant.');
    } else {
      await load();
    }
    setPieceBusy(false);
  };

  // Upload photo par le mécano (bucket public, dossier taches/ autorisé pour anon)
  const uploadTachePhoto = async (tache, file) => {
    if (!file) return false;
    // 50 Mo = limite serveur. Mieux vaut le dire avant 3 minutes d'envoi inutile.
    if (file.size > 50 * 1024 * 1024) {
      say('error', 'Photo trop lourde (50 Mo maximum).');
      return false;
    }
    const safeName = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `taches/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
    const { error: upErr } = await supabase.storage.from('vehicle-files').upload(path, file);
    if (upErr) {
      say('error', 'Envoi de la photo impossible. Vérifie ta connexion et réessaie.');
      return false;
    }
    const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
    const { error: rpcErr } = await supabase.rpc('fiche_publique_tache_photo', {
      p_token: token, p_tache_id: tache.id, p_photo_url: pub.publicUrl,
    });
    if (rpcErr) {
      say('error', 'Photo envoyée mais non rattachée à la tâche. Réessaie.');
      return false;
    }
    await load();
    say('ok', 'Photo ajoutée.');
    return true;
  };

  // Validation finale : le kilométrage est OBLIGATOIRE (exigé aussi côté serveur)
  const terminer = async (km) => {
    setFinishing(true);
    const { data: ok, error } = await supabase.rpc('fiche_publique_terminer', {
      p_token: token, p_km: parseInt(km, 10),
    });
    setFinishing(false);
    if (error) {
      // L'ancien code affichait « Kilometrage invalide » sur une panne reseau,
      // envoyant le mecano corriger une valeur qui etait pourtant correcte.
      setOffline(true);
      say('error', 'Pas de réseau : la fiche n’a PAS été validée. Réessaie.');
      return false;
    }
    if (!ok) {
      say('error', 'Validation refusée : kilométrage invalide, ou fiche déjà clôturée par EASYDRIFT.');
      return false;
    }
    setShowFinish(false);
    await load();
    return true;
  };

  // ── États spéciaux ──
  if (loading) {
    return <PublicShell><div style={{ textAlign: 'center', padding: 60, color: THEME.text.muted }}>Chargement…</div></PublicShell>;
  }
  // Le serveur a repondu : le jeton n'existe vraiment pas.
  if (notFound) {
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
  // Rien n'a pu etre charge, mais ce n'est pas la faute du lien : on le dit,
  // et on laisse un moyen de reessayer plutot qu'un cul-de-sac.
  if (!data) {
    return (
      <PublicShell>
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📡</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Connexion impossible</div>
          <div style={{ fontSize: 13, color: THEME.text.muted, marginTop: 8, lineHeight: 1.5 }}>
            Le lien est bon, mais le réseau ne répond pas.<br />Rapproche-toi d’une zone couverte et réessaie.
          </div>
          <button
            onClick={() => { setLoading(true); load(); }}
            style={{
              marginTop: 22, padding: '13px 26px', borderRadius: 12, border: 'none',
              background: THEME.accent.orange, color: '#fff', fontSize: 15, fontWeight: 800,
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em', cursor: 'pointer',
            }}
          >Réessayer</button>
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
      {/* Bandeau hors-ligne : la page reste utilisable, mais le mécano doit
          savoir que ce qu'il voit date et que ses actions peuvent échouer. */}
      {offline && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12,
          padding: '11px 14px', borderRadius: 11,
          background: `${THEME.accent.yellow}14`, border: `1px solid ${THEME.accent.yellow}44`,
        }}>
          <span style={{ fontSize: 15 }}>📡</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.accent.yellow }}>Connexion perdue</div>
            <div style={{ fontSize: 11.5, color: THEME.text.secondary, marginTop: 1 }}>
              {lastSync
                ? `Dernière synchro à ${lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Données non synchronisées'}
            </div>
          </div>
          <button
            onClick={() => load()}
            style={{
              flexShrink: 0, padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${THEME.accent.yellow}66`, background: 'transparent',
              color: THEME.accent.yellow, fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
            }}
          >Réessayer</button>
        </div>
      )}

      {/* Retour d'action : succès comme échec, sinon le mécano ne sait jamais
          si ce qu'il vient de faire est bien parti. */}
      {flash && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 12,
          padding: '12px 14px', borderRadius: 11,
          background: flash.type === 'ok' ? `${THEME.accent.green}14` : `${THEME.accent.red}14`,
          border: `1px solid ${flash.type === 'ok' ? THEME.accent.green : THEME.accent.red}44`,
          color: flash.type === 'ok' ? THEME.accent.green : THEME.accent.red,
        }}>
          <span style={{ fontSize: 14, lineHeight: 1.4 }}>{flash.type === 'ok' ? '✓' : '⚠'}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>{flash.text}</div>
          <button
            onClick={() => setFlash(null)} aria-label="Fermer le message"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 16, padding: 0, lineHeight: 1 }}
          >×</button>
        </div>
      )}

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
        {/* Pièces en rab fournies avec le véhicule — le mécano coche ce qu'il utilise */}
        {pieces.length > 0 && (
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${THEME.border}`, background: `${THEME.accent.green}06` }}>
            <div style={{ fontSize: 10, color: THEME.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              📦 Pièces fournies avec le véhicule
            </div>
            {!readOnly && (
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 10 }}>
                Coche ce que tu utilises — la commande à passer s'affiche en dessous.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pieces.map(p => {
                const fournie = p.fournie ?? 0;
                const used = p.used ?? 0;
                const reste = fournie - used;
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.25)', border: `1px solid ${used > 0 ? THEME.accent.orange + '44' : THEME.border}` }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: THEME.accent.green, fontFamily: 'Rajdhani, sans-serif', flexShrink: 0, minWidth: 44 }}>
                      {fournie}× <span style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 400 }}>fournie{fournie > 1 ? 's' : ''}</span>
                    </span>
                    <div style={{ flex: 1, minWidth: 140 }}>
                      <span style={{ color: THEME.text.primary, fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                      {p.reference && <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 6 }}>réf. {p.reference}</span>}
                      {p.notes && <div style={{ fontSize: 11, color: THEME.text.muted, fontStyle: 'italic' }}>{p.notes}</div>}
                    </div>
                    {!readOnly && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {used > 0 && (
                          <>
                            <button onClick={() => declarerPiece(p, -1)} disabled={pieceBusy} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.05)', color: THEME.text.secondary, fontSize: 16, cursor: pieceBusy ? 'default' : 'pointer', opacity: pieceBusy ? 0.5 : 1, fontFamily: 'inherit' }}>−</button>
                            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif', minWidth: 18, textAlign: 'center' }}>{used}</span>
                          </>
                        )}
                        <button
                          onClick={() => declarerPiece(p, +1)}
                          disabled={reste <= 0 || pieceBusy}
                          style={{
                            padding: '8px 12px', borderRadius: 8, border: 'none',
                            background: reste > 0 ? THEME.accent.orange : 'rgba(255,255,255,0.06)',
                            color: reste > 0 ? '#fff' : THEME.text.muted,
                            fontSize: 12, fontWeight: 700, cursor: reste > 0 ? 'pointer' : 'not-allowed',
                            fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}
                        >{used > 0 ? (reste > 0 ? '+1' : 'Tout utilisé') : 'J\'en utilise 1'}</button>
                      </div>
                    )}
                    {readOnly && used > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.accent.orange }}>{used} utilisée{used > 1 ? 's' : ''}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Consigne de commande : 1 utilisée = 1 à recommander */}
            {(() => {
              const lignes = [];
              pieces.forEach(p => {
                const used = p.used ?? 0;
                if (used > 0) {
                  lignes.push({ key: `u-${p.id}`, text: `${used}× ${p.name}${p.reference ? ` (réf. ${p.reference})` : ''}` });
                } else if (p.reorder) {
                  lignes.push({ key: `r-${p.id}`, text: `${p.name}${p.reference ? ` (réf. ${p.reference})` : ''} — demandé par EASYDRIFT` });
                }
              });
              if (!lignes.length) return null;
              return (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, background: THEME.accent.yellowDim, border: `1px solid ${THEME.accent.yellow}44` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: THEME.accent.yellow, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                    🛒 À commander pour EASYDRIFT
                  </div>
                  {lignes.map(l => (
                    <div key={l.key} style={{ fontSize: 13, color: THEME.text.primary, padding: '2px 0', fontWeight: 600 }}>• {l.text}</div>
                  ))}
                </div>
              );
            })()}
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

      {/* Bouton Terminé → étape kilométrage obligatoire */}
      {!readOnly && !isDone && (
        <div style={{ position: 'sticky', bottom: 0, padding: '12px 0 20px', background: `linear-gradient(transparent, ${THEME.bg.app} 30%)` }}>
          <button
            onClick={() => setShowFinish(true)}
            style={{
              width: '100%', padding: '17px', borderRadius: 14, border: 'none',
              background: THEME.accent.green, color: '#fff',
              fontSize: 17, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em',
              boxShadow: '0 4px 20px rgba(34,197,94,0.35)',
            }}
          >
            ✓ J'ai terminé
          </button>
        </div>
      )}

      {showAddTask && <AddTaskSheet onAdd={addTache} onClose={() => setShowAddTask(false)} />}
      {showKmEdit && <KmSheet current={vehicle.mileage} onSave={updateKm} onClose={() => setShowKmEdit(false)} />}
      {showFinish && <FinishSheet current={vehicle.mileage} onConfirm={terminer} onClose={() => setShowFinish(false)} loading={finishing} />}
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
  const [savingComment, setSavingComment] = useState(false);

  // On repart TOUJOURS de la valeur serveur a l'ouverture de l'editeur.
  // Avant, `comment` restait fige sur l'etat du premier chargement : une
  // consigne ajoutee par EASYDRIFT en cours de journee etait ecrasee des que
  // le mecano touchait au commentaire, sans que personne ne le voie.
  const openComment = () => {
    setComment(tache.commentaire ?? '');
    setShowComment(true);
  };

  const saveComment = async () => {
    setSavingComment(true);
    const ok = await onToggle(tache, tache.fait, comment);
    setSavingComment(false);
    // On ne referme que si l'enregistrement est bien passe, sinon la saisie
    // serait perdue au moment meme ou elle n'a pas ete sauvegardee.
    if (ok !== false) setShowComment(false);
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
          {tache.consigne && (
            <div style={{ fontSize: 12, color: THEME.accent.orange, marginTop: 3 }}>📌 {tache.consigne}</div>
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
              <button
                onClick={saveComment} disabled={savingComment}
                style={{ background: savingComment ? THEME.text.muted : THEME.accent.orange, border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 700, cursor: savingComment ? 'default' : 'pointer', fontFamily: 'inherit' }}
              >{savingComment ? '…' : 'OK'}</button>
            </div>
          ) : (
            <button onClick={openComment} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 12, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
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
  // Sans cet etat, un appui repete sur connexion lente creait autant de
  // doublons que d'appuis : rien ne desactivait le bouton pendant l'envoi.
  const [sending, setSending] = useState(false);

  const submit = async () => {
    if (!desc.trim() || sending) return;
    setSending(true);
    await onAdd(desc.trim(), comment.trim());
    // En cas d'echec, le parent laisse le tiroir ouvert : la saisie reste a
    // l'ecran et le mecano peut reessayer sans avoir a tout retaper.
    setSending(false);
  };
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
            onClick={submit}
            disabled={!desc.trim() || sending}
            style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: desc.trim() && !sending ? THEME.accent.orange : 'rgba(255,255,255,0.06)', color: desc.trim() && !sending ? '#fff' : THEME.text.muted, fontSize: 15, fontWeight: 800, cursor: desc.trim() && !sending ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >{sending ? 'Envoi…' : 'Ajouter'}</button>
        </div>
      </div>
    </div>
  );
}

// Étape finale OBLIGATOIRE : impossible de valider la fiche sans donner le km
function FinishSheet({ current, onConfirm, onClose, loading }) {
  const [km, setKm] = useState('');
  const parsed = parseInt(km);
  const valid = !isNaN(parsed) && parsed > 0;
  const recule = valid && current > 0 && parsed < current;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: '20px 20px 0 0', border: `1px solid ${THEME.border}`, padding: '22px 18px calc(env(safe-area-inset-bottom, 0px) + 22px)', width: '100%', maxWidth: 640 }}>
        <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, margin: '0 auto 18px' }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 4 }}>Dernière étape ✓</div>
        <div style={{ fontSize: 13, color: THEME.text.secondary, marginBottom: 14, lineHeight: 1.5 }}>
          Relève le <strong style={{ color: THEME.accent.orange }}>kilométrage au compteur</strong> pour valider la fiche.
          {current > 0 && <span style={{ color: THEME.text.muted }}> Dernier relevé : {current.toLocaleString('fr-FR')} km.</span>}
        </div>
        <input
          autoFocus
          type="number"
          inputMode="numeric"
          placeholder="Kilométrage au compteur"
          style={{
            width: '100%', background: THEME.bg.input,
            border: `1px solid ${valid ? THEME.accent.green + '66' : THEME.border}`,
            borderRadius: 10, padding: '15px 14px', color: THEME.text.primary,
            fontSize: 20, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
            outline: 'none', boxSizing: 'border-box', marginBottom: 8,
          }}
          value={km}
          onChange={e => setKm(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && valid && !loading) onConfirm(km); }}
        />
        {recule && (
          <div style={{ fontSize: 12, color: THEME.accent.yellow, marginBottom: 8 }}>
            ⚠ Valeur inférieure au dernier relevé ({current.toLocaleString('fr-FR')} km) — vérifie le compteur.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.04)', color: THEME.text.secondary, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Retour</button>
          <button
            onClick={() => valid && onConfirm(km)}
            disabled={!valid || loading}
            style={{
              flex: 2, padding: '14px', borderRadius: 12, border: 'none',
              background: valid ? THEME.accent.green : 'rgba(255,255,255,0.06)',
              color: valid ? '#fff' : THEME.text.muted,
              fontSize: 15, fontWeight: 800, cursor: valid && !loading ? 'pointer' : 'not-allowed',
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.03em',
            }}
          >{loading ? '…' : 'Valider la fiche'}</button>
        </div>
      </div>
    </div>
  );
}

function KmSheet({ current, onSave, onClose }) {
  const [km, setKm] = useState(current ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!km || saving) return;
    setSaving(true);
    // Le parent ne referme le tiroir que si l'enregistrement a reussi.
    await onSave(km);
    setSaving(false);
  };
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
            onClick={submit} disabled={!km || saving}
            style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: km && !saving ? THEME.accent.orange : 'rgba(255,255,255,0.06)', color: km && !saving ? '#fff' : THEME.text.muted, fontSize: 15, fontWeight: 800, cursor: km && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >{saving ? 'Envoi…' : 'Enregistrer'}</button>
        </div>
      </div>
    </div>
  );
}
