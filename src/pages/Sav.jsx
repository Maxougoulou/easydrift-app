import { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Btn } from '../components/ui';
import { useAppContext } from '../lib/AppContext';
import { useSav } from '../hooks/useSav';
import { toast } from '../lib/toast';
import { STEPS, ALL_FIELDS, formatAnswer, isFileField, t } from '../lib/savForm';

// Espace SAV « anneaux défectueux » :
// on génère un lien par anneau, on l'envoie au client, et on relit
// ici les réponses du questionnaire — fini le Google Form.

const STATUTS = [
  { value: 'en_attente', label: 'En attente', short: 'Attente', color: THEME.text.secondary, bg: 'rgba(138,135,144,0.12)' },
  { value: 'reçu',       label: 'Reçu',       short: 'Reçus',   color: THEME.accent.orange,  bg: THEME.accent.orangeDim },
  { value: 'en_analyse', label: 'En analyse', short: 'Analyse', color: THEME.accent.blue,    bg: THEME.accent.blueDim },
  { value: 'traité',     label: 'Traité',     short: 'Traités', color: THEME.accent.green,   bg: THEME.accent.greenDim },
];

const statutCfg = (v) => STATUTS.find(s => s.value === v) ?? STATUTS[0];

const savUrl = (r) => `${window.location.origin}/sav/${r.token_public}`;

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const daysSince = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

function StatutBadge({ statut }) {
  const cfg = statutCfg(statut);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// ── Modale : création d'un lien ──────────────────────────────────────────────

function CreateModal({ onClose, onCreate }) {
  const [libelle, setLibelle] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState('fr');
  const [busy, setBusy] = useState(false);

  const inp = {
    width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
    border: `1px solid ${THEME.border}`, borderRadius: 9, padding: '11px 13px',
    color: THEME.text.primary, fontSize: 14, fontFamily: 'inherit', outline: 'none',
  };
  const lbl = {
    display: 'block', fontSize: 11, fontWeight: 700, color: THEME.text.muted,
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 7,
  };

  const submit = async () => {
    setBusy(true);
    try { await onCreate({ libelle, client_email: email, locale }); }
    finally { setBusy(false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: THEME.bg.modal, border: `1px solid ${THEME.border}`, borderRadius: 16,
        padding: 26, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 5 }}>
          Nouvelle déclaration
        </div>
        <div style={{ fontSize: 12.5, color: THEME.text.secondary, marginBottom: 22, lineHeight: 1.5 }}>
          Génère un lien unique à envoyer au client. Il ne peut être rempli qu'une seule fois.
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Libellé interne</label>
          <input
            style={inp} value={libelle} autoFocus
            placeholder="ex. Drift Team 44 — DTS66 cassé"
            onChange={e => setLibelle(e.target.value)}
          />
          <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 5 }}>
            Pour t'y retrouver dans la liste. Le client ne le voit pas.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>E-mail du client (optionnel)</label>
          <input
            style={inp} value={email} type="email" placeholder="client@societe.com"
            onChange={e => setEmail(e.target.value)}
          />
          <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 5 }}>
            Pré-remplit le champ e-mail du formulaire.
          </div>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={lbl}>Langue proposée par défaut</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ v: 'fr', l: 'Français' }, { v: 'en', l: 'English' }].map(o => {
              const on = locale === o.v;
              return (
                <button
                  key={o.v} onClick={() => setLocale(o.v)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 9, cursor: 'pointer',
                    border: `1.5px solid ${on ? THEME.accent.orange : THEME.border}`,
                    background: on ? THEME.accent.orangeDim : 'rgba(255,255,255,0.03)',
                    color: on ? THEME.accent.orange : THEME.text.secondary,
                    fontSize: 13.5, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
                  }}
                >{o.l}</button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 6 }}>
            Le client peut basculer FR/EN à tout moment sur le formulaire.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={submit} disabled={busy}>{busy ? 'Création…' : 'Générer le lien'}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Modale : lien généré (copier / QR) ───────────────────────────────────────

function LinkModal({ report, onClose }) {
  const [qr, setQr] = useState(null);
  const url = savUrl(report);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#111111', light: '#ffffff' } })
      .then(setQr).catch(() => setQr(null));
  }, [url]);

  const copy = () => {
    navigator.clipboard.writeText(url);
    toast.success('Lien copié', 'Prêt à coller dans un e-mail');
  };

  const mailto = () => {
    const fr = report.locale === 'fr';
    const subject = fr ? 'EASYDRIFT — déclaration d\'anneau défectueux' : 'EASYDRIFT — defective ring report';
    const body = fr
      ? `Bonjour,\n\nSuite au problème rencontré avec votre anneau EASYDRIFT, merci de remplir ce court formulaire :\n\n${url}\n\nIl nous permet d'analyser l'origine de la casse. Comptez environ 8 minutes, des photos vous seront demandées.\n\nMerci et bonne journée,\nL'équipe EASYDRIFT`
      : `Hello,\n\nFollowing the issue you encountered with your EASYDRIFT ring, please fill in this short form:\n\n${url}\n\nIt allows us to analyse the cause of the failure. It takes about 8 minutes and photos will be requested.\n\nThank you and best regards,\nThe EASYDRIFT team`;
    window.location.href = `mailto:${report.client_email ?? ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()} style={{
        background: THEME.bg.modal, border: `1px solid ${THEME.border}`, borderRadius: 16,
        padding: 26, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', textAlign: 'center',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
          background: THEME.accent.greenDim, border: `1.5px solid ${THEME.accent.green}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 23, color: THEME.accent.green,
        }}>✓</div>

        <div style={{ fontSize: 19, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 5 }}>
          Lien prêt à envoyer
        </div>
        <div style={{ fontSize: 12.5, color: THEME.text.secondary, marginBottom: 20, lineHeight: 1.5 }}>
          {report.libelle || 'Déclaration sans libellé'}
        </div>

        {qr && (
          <img src={qr} alt="QR code" style={{ width: 160, height: 160, borderRadius: 10, marginBottom: 18 }} />
        )}

        <div
          onClick={copy}
          style={{
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
            borderRadius: 9, padding: '11px 13px', marginBottom: 16, cursor: 'pointer',
            fontSize: 12, color: THEME.text.secondary, wordBreak: 'break-all',
            fontFamily: 'ui-monospace, monospace', textAlign: 'left',
          }}
        >{url}</div>

        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <Btn onClick={copy} style={{ flex: 1, justifyContent: 'center' }}>📋 Copier le lien</Btn>
          <Btn variant="secondary" onClick={mailto} style={{ flex: 1, justifyContent: 'center' }}>✉ Pré-remplir l'e-mail</Btn>
        </div>

        <button
          onClick={onClose}
          style={{ marginTop: 16, background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.muted, fontSize: 13, fontFamily: 'inherit' }}
        >Fermer</button>
      </div>
    </div>
  );
}

// ── Modale : détail des réponses ─────────────────────────────────────────────

function Lightbox({ file, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'zoom-out' }}
    >
      {file.type?.startsWith('video/')
        ? <video src={file.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        : <img src={file.url} alt={file.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }} />}
      <a
        href={file.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          padding: '9px 18px', borderRadius: 9, background: 'rgba(255,255,255,0.12)',
          color: '#fff', fontSize: 13, textDecoration: 'none', fontWeight: 600,
        }}
      >Ouvrir l'original ↗</a>
    </div>
  );
}

function FileGrid({ files, onOpen }) {
  if (!files?.length) return null;
  return (
    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
      {files.map(f => (
        <div
          key={f.url} onClick={() => onOpen(f)}
          style={{
            position: 'relative', aspectRatio: '1', borderRadius: 9, overflow: 'hidden', cursor: 'zoom-in',
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.border}`,
          }}
        >
          {f.type?.startsWith('image/')
            ? <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 6 }}>
                <span style={{ fontSize: 20 }}>{f.type?.startsWith('video/') ? '🎬' : '📄'}</span>
                <span style={{ fontSize: 9, color: THEME.text.muted, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{f.name}</span>
              </div>
            )}
        </div>
      ))}
    </div>
  );
}

function DetailModal({ report, onClose, onUpdate, onDelete }) {
  const { isMobile } = useAppContext();
  const [locale, setLocale] = useState('fr');
  const [notes, setNotes] = useState(report.notes_internes ?? '');
  const [lightbox, setLightbox] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const reponses = report.reponses ?? {};
  const filesByField = useMemo(() => {
    const m = {};
    for (const f of report.fichiers ?? []) (m[f.field] ??= []).push(f);
    return m;
  }, [report.fichiers]);

  const saveNotes = async () => {
    if (notes === (report.notes_internes ?? '')) return;
    await onUpdate(report.id, { notes_internes: notes });
    toast.success('Notes enregistrées');
  };

  const title = report.r_nom || report.libelle || 'Déclaration';

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 3000, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', padding: isMobile ? 0 : 20, backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div onClick={e => e.stopPropagation()} style={{
          background: THEME.bg.modal, border: `1px solid ${THEME.border}`,
          borderRadius: isMobile ? '18px 18px 0 0' : 16,
          width: '100%', maxWidth: 740, maxHeight: isMobile ? '92vh' : '88vh',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          {/* En-tête */}
          <div style={{
            padding: '18px 22px', borderBottom: `1px solid ${THEME.border}`,
            background: `${THEME.accent.orange}08`, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5, flexWrap: 'wrap' }}>
                  <StatutBadge statut={report.statut} />
                  {report.submitted_at && (
                    <span style={{ fontSize: 11, color: THEME.text.muted }}>
                      Reçu le {fmtDate(report.submitted_at)}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {title}
                </div>
                {report.r_societe && (
                  <div style={{ fontSize: 13, color: THEME.text.secondary, marginTop: 1 }}>{report.r_societe}</div>
                )}
              </div>
              <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.muted, fontSize: 22, padding: '0 4px', lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
          </div>

          {/* Corps */}
          <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '18px' : '22px 26px' }}>
            {!report.submitted_at ? (
              <div style={{ textAlign: 'center', padding: '44px 16px' }}>
                <div style={{ fontSize: 38, marginBottom: 14 }}>⏳</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>
                  En attente de la réponse du client
                </div>
                <div style={{ fontSize: 13, color: THEME.text.muted, marginTop: 7, lineHeight: 1.55 }}>
                  Lien créé il y a {daysSince(report.created_at)} jour{daysSince(report.created_at) > 1 ? 's' : ''}.
                  {daysSince(report.created_at) >= 7 && ' Une relance serait peut-être utile.'}
                </div>
                <div style={{ marginTop: 18, display: 'flex', gap: 9, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Btn variant="secondary" onClick={() => { navigator.clipboard.writeText(savUrl(report)); toast.success('Lien copié'); }}>
                    📋 Copier le lien
                  </Btn>
                </div>
              </div>
            ) : (
              <>
                {/* Bascule de langue d'affichage */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Afficher en
                  </span>
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: 2, gap: 2 }}>
                    {['fr', 'en'].map(l => {
                      const on = locale === l;
                      return (
                        <button
                          key={l} onClick={() => setLocale(l)}
                          style={{
                            padding: '4px 11px', borderRadius: 999, border: 'none', cursor: 'pointer',
                            background: on ? THEME.accent.orange : 'transparent',
                            color: on ? '#fff' : THEME.text.secondary,
                            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em', fontFamily: 'Rajdhani, sans-serif',
                          }}
                        >{l.toUpperCase()}</button>
                      );
                    })}
                  </div>
                  <div style={{ flex: 1 }} />
                  <span style={{ fontSize: 11, color: THEME.text.muted }}>
                    Rempli en {report.locale === 'fr' ? 'français' : 'anglais'}
                  </span>
                </div>

                {/* Réponses, groupées comme dans le formulaire */}
                {STEPS.map(stepDef => {
                  const rows = stepDef.fields
                    .filter(f => !isFileField(f))
                    .map(f => ({ f, val: formatAnswer(f, reponses, locale) }))
                    .filter(r => r.val !== null);
                  const fileFields = stepDef.fields.filter(f => isFileField(f) && filesByField[f.id]?.length);

                  if (!rows.length && !fileFields.length) return null;

                  return (
                    <div key={stepDef.id} style={{ marginBottom: 26 }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                        paddingBottom: 8, borderBottom: `1px solid ${THEME.border}`,
                      }}>
                        <span style={{ fontSize: 15 }}>{stepDef.icon}</span>
                        <span style={{
                          fontSize: 12, fontWeight: 800, color: THEME.accent.orange,
                          textTransform: 'uppercase', letterSpacing: '0.09em',
                        }}>{t(stepDef.title, locale)}</span>
                      </div>

                      {rows.map(({ f, val }) => (
                        <div key={f.id} style={{
                          display: 'flex', gap: 14, padding: '8px 0',
                          flexDirection: isMobile ? 'column' : 'row',
                        }}>
                          <div style={{
                            width: isMobile ? 'auto' : 230, flexShrink: 0,
                            fontSize: 12.5, color: THEME.text.muted, lineHeight: 1.45,
                          }}>{t(f.label, locale)}</div>
                          <div style={{
                            flex: 1, fontSize: 14, color: THEME.text.primary,
                            fontWeight: 600, lineHeight: 1.5, wordBreak: 'break-word',
                          }}>{val}</div>
                        </div>
                      ))}

                      {fileFields.map(f => (
                        <div key={f.id} style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 12.5, color: THEME.text.muted, marginBottom: 8 }}>
                            {t(f.label, locale)}
                            <span style={{ color: THEME.text.muted, opacity: 0.7 }}> · {filesByField[f.id].length}</span>
                          </div>
                          <FileGrid files={filesByField[f.id]} onOpen={setLightbox} />
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            )}

            {/* Suivi interne */}
            <div style={{
              marginTop: 10, padding: '16px 18px', borderRadius: 12,
              background: 'rgba(255,255,255,0.025)', border: `1px solid ${THEME.border}`,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 800, color: THEME.text.muted,
                textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 12,
              }}>Suivi interne</div>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {STATUTS.map(s => {
                  const on = report.statut === s.value;
                  return (
                    <button
                      key={s.value}
                      onClick={() => onUpdate(report.id, { statut: s.value })}
                      style={{
                        padding: '7px 13px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${on ? s.color : THEME.border}`,
                        background: on ? s.bg : 'rgba(255,255,255,0.03)',
                        color: on ? s.color : THEME.text.secondary,
                        fontSize: 12.5, fontWeight: on ? 700 : 500, fontFamily: 'inherit',
                      }}
                    >{s.label}</button>
                  );
                })}
              </div>

              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} onBlur={saveNotes}
                rows={3} placeholder="Diagnostic, décision, suite donnée…"
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${THEME.border}`, borderRadius: 9, padding: '11px 13px',
                  color: THEME.text.primary, fontSize: 13.5, fontFamily: 'inherit',
                  outline: 'none', resize: 'vertical', lineHeight: 1.5,
                }}
              />
            </div>

            {/* Suppression */}
            <div style={{ marginTop: 18, textAlign: 'center', paddingBottom: 6 }}>
              {!confirmDel ? (
                <button
                  onClick={() => setConfirmDel(true)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.muted, fontSize: 12.5, fontFamily: 'inherit' }}
                >Supprimer cette déclaration</button>
              ) : (
                <div style={{ display: 'flex', gap: 9, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, color: THEME.accent.red }}>Supprimer définitivement ?</span>
                  <Btn size="sm" variant="secondary" onClick={() => setConfirmDel(false)}>Annuler</Btn>
                  <Btn size="sm" variant="danger" onClick={async () => { await onDelete(report.id); onClose(); }}>Supprimer</Btn>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {lightbox && <Lightbox file={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Export CSV ───────────────────────────────────────────────────────────────

function exportCsv(reports) {
  const filled = reports.filter(r => r.submitted_at);
  if (!filled.length) { toast.error('Rien à exporter', 'Aucune réponse reçue pour le moment'); return; }

  const cols = [
    { h: 'Libellé', get: r => r.libelle ?? '' },
    { h: 'Statut', get: r => r.statut },
    { h: 'Reçu le', get: r => fmtDate(r.submitted_at) },
    ...ALL_FIELDS.filter(f => !isFileField(f)).map(f => ({
      h: t(f.label, 'fr'), get: r => formatAnswer(f, r.reponses ?? {}, 'fr') ?? '',
    })),
    { h: 'Fichiers', get: r => (r.fichiers ?? []).map(f => f.url).join(' | ') },
    { h: 'Notes internes', get: r => r.notes_internes ?? '' },
  ];

  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    cols.map(c => esc(c.h)).join(';'),
    ...filled.map(r => cols.map(c => esc(c.get(r))).join(';')),
  ].join('\r\n');

  // BOM : Excel FR ouvre l'UTF-8 correctement
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `easydrift-sav-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast.success('Export CSV', `${filled.length} réponse${filled.length > 1 ? 's' : ''} exportée${filled.length > 1 ? 's' : ''}`);
}

// ── Module ───────────────────────────────────────────────────────────────────

export function SavModule() {
  const { isMobile } = useAppContext();
  const { reports, loading, createReport, updateReport, deleteReport } = useSav();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [linkFor, setLinkFor] = useState(null);
  const [detail, setDetail] = useState(null);

  // La modale de détail doit refléter les mises à jour (statut, notes).
  const detailLive = detail ? reports.find(r => r.id === detail.id) ?? detail : null;

  const counts = useMemo(() => {
    const c = {};
    for (const s of STATUTS) c[s.value] = reports.filter(r => r.statut === s.value).length;
    return c;
  }, [reports]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter(r => {
      if (filter !== 'all' && r.statut !== filter) return false;
      if (!q) return true;
      return [r.libelle, r.r_nom, r.r_societe, r.r_email, r.client_email, r.r_produit]
        .some(v => v?.toLowerCase().includes(q));
    });
  }, [reports, filter, search]);

  const handleCreate = async (payload) => {
    const created = await createReport(payload);
    setShowCreate(false);
    setLinkFor(created);
  };

  return (
    <>
      <TopBar
        title="Anneaux défectueux"
        subtitle="Déclarations SAV — questionnaire client"
        actions={<Btn onClick={() => setShowCreate(true)}>＋ Nouveau lien</Btn>}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px' : '22px 28px' }}>
        {/* Compteurs */}
        <div style={{
          display: 'grid', gap: 10, marginBottom: 18,
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
        }}>
          {STATUTS.map(s => (
            <button
              key={s.value}
              onClick={() => setFilter(filter === s.value ? 'all' : s.value)}
              style={{
                background: THEME.bg.card, borderRadius: 12, padding: '14px 16px', textAlign: 'left',
                border: `1px solid ${filter === s.value ? s.color : THEME.border}`,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.15s',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1.1 }}>
                {counts[s.value] ?? 0}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>
                {s.short}
              </div>
            </button>
          ))}
        </div>

        {/* Recherche + export */}
        <div style={{ display: 'flex', gap: 9, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un client, une société, un produit…"
            style={{
              flex: 1, minWidth: 180, boxSizing: 'border-box',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
              borderRadius: 9, padding: '10px 13px', color: THEME.text.primary,
              fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
            }}
          />
          {filter !== 'all' && (
            <Btn variant="secondary" onClick={() => setFilter('all')}>Tout afficher</Btn>
          )}
          <Btn variant="secondary" onClick={() => exportCsv(reports)}>⬇ CSV</Btn>
        </div>

        {/* Liste */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 50, color: THEME.text.muted, fontSize: 13 }}>Chargement…</div>
        ) : visible.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '54px 20px', background: THEME.bg.card,
            borderRadius: 14, border: `1px dashed ${THEME.border}`,
          }}>
            <div style={{ fontSize: 34, marginBottom: 12 }}>⭕</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>
              {reports.length === 0 ? 'Aucune déclaration' : 'Aucun résultat'}
            </div>
            <div style={{ fontSize: 13, color: THEME.text.muted, marginTop: 7, lineHeight: 1.55, maxWidth: 380, margin: '7px auto 0' }}>
              {reports.length === 0
                ? 'Crée un lien et envoie-le au client : il remplit le questionnaire, les réponses arrivent ici.'
                : 'Essaie un autre terme de recherche ou retire le filtre.'}
            </div>
            {reports.length === 0 && (
              <div style={{ marginTop: 18 }}>
                <Btn onClick={() => setShowCreate(true)}>＋ Créer le premier lien</Btn>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {visible.map(r => {
              const pending = !r.submitted_at;
              const relance = pending && daysSince(r.created_at) >= 7;
              const photos = (r.fichiers ?? []).length;
              return (
                <div
                  key={r.id} onClick={() => setDetail(r)}
                  style={{
                    background: THEME.bg.card, border: `1px solid ${THEME.border}`,
                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(240,120,20,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = THEME.border}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                      <StatutBadge statut={r.statut} />
                      {relance && (
                        <span style={{ fontSize: 10.5, color: THEME.accent.yellow, fontWeight: 700 }}>
                          ⏰ {daysSince(r.created_at)} j sans réponse
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: 15, fontWeight: 700, color: THEME.text.primary,
                      fontFamily: 'Rajdhani, sans-serif', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {r.r_nom || r.libelle || 'Déclaration sans libellé'}
                    </div>
                    <div style={{
                      fontSize: 12, color: THEME.text.muted, marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {[r.r_societe, r.r_produit, photos ? `${photos} fichier${photos > 1 ? 's' : ''}` : null]
                        .filter(Boolean).join(' · ')
                        || (pending
                          ? [r.client_email, `lien créé le ${fmtDate(r.created_at)}`].filter(Boolean).join(' · ')
                          : '—')}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {!isMobile && (
                      <span style={{ fontSize: 11.5, color: THEME.text.muted, whiteSpace: 'nowrap' }}>
                        {fmtDate(r.submitted_at ?? r.created_at)}
                      </span>
                    )}
                    <button
                      title="Copier le lien"
                      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(savUrl(r)); toast.success('Lien copié'); }}
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.border}`,
                        borderRadius: 7, cursor: 'pointer', color: THEME.text.secondary,
                        fontSize: 13, padding: '7px 9px', lineHeight: 1,
                      }}
                    >📋</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {linkFor && <LinkModal report={linkFor} onClose={() => setLinkFor(null)} />}
      {detailLive && (
        <DetailModal
          report={detailLive}
          onClose={() => setDetail(null)}
          onUpdate={updateReport}
          onDelete={deleteReport}
        />
      )}
    </>
  );
}
