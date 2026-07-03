import { useState } from 'react';
import QRCode from 'qrcode';
import { THEME } from '../lib/theme';
import { Btn } from './ui';

// Propositions pré-remplies "retour de piste" — décochées par défaut,
// on coche ce qu'on veut inclure dans la fiche.
export const CHECKLIST_PISTE = [
  'Pneus avant — état / usure / pression',
  'Pneus arrière — état / usure / pression',
  'Plaquettes de frein — épaisseur',
  'Disques de frein — état / voile',
  'Niveaux & fuites (huile, LDR, refroidissement)',
  'Direction — jeu / bruits',
  'Embrayage — patinage / point de friction',
  'Carrosserie — impacts / fixations',
];

export function ficheUrl(fiche) {
  return `${window.location.origin}/fiche/${fiche.token_public}`;
}

// ─── PDF (fenêtre print stylée + QR code vers la page mécano) ────────────────

export async function openFichePdf(fiche, vehicle, taches) {
  const url = ficheUrl(fiche);
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: '#111111', light: '#ffffff' } });
  } catch { /* QR optionnel */ }

  const tachesDemandees = taches.filter(t => t.origine !== 'mecano');
  const dateStr = new Date(fiche.date_creation ?? Date.now()).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Fiche intervention — ${vehicle.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 36px 44px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #F07814; padding-bottom: 16px; margin-bottom: 22px; }
  .brand { font-size: 26px; font-weight: 900; letter-spacing: 0.06em; }
  .brand span { color: #F07814; }
  .brand-sub { font-size: 11px; color: #666; margin-top: 3px; }
  .doc-type { text-align: right; }
  .doc-type h1 { font-size: 17px; text-transform: uppercase; letter-spacing: 0.08em; }
  .doc-type .date { font-size: 12px; color: #666; margin-top: 4px; }
  .vehicle-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .vehicle-box .field .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 2px; }
  .vehicle-box .field .val { font-size: 15px; font-weight: 700; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #F07814; margin: 20px 0 10px; }
  .task { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e5e5e5; align-items: flex-start; page-break-inside: avoid; }
  .task .box { width: 18px; height: 18px; border: 2px solid #333; border-radius: 4px; flex-shrink: 0; margin-top: 1px; }
  .task .desc { font-size: 13px; font-weight: 600; flex: 1; }
  .task .comment-line { border-bottom: 1px dotted #bbb; height: 20px; margin-top: 6px; }
  .notes-box { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-size: 12px; color: #444; background: #fafafa; }
  .qr-section { margin-top: 28px; border: 2px solid #F07814; border-radius: 10px; padding: 18px 22px; display: flex; gap: 22px; align-items: center; page-break-inside: avoid; }
  .qr-section img { width: 130px; height: 130px; }
  .qr-section .txt h3 { font-size: 15px; margin-bottom: 6px; }
  .qr-section .txt p { font-size: 12px; color: #555; line-height: 1.5; }
  .qr-section .txt .url { font-size: 10px; color: #999; margin-top: 8px; word-break: break-all; }
  .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
  @media print { body { padding: 20px 28px; } }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">EASY<span>DRIFT</span></div>
      <div class="brand-sub">Gestion de flotte — maxence.fortier@gmail.com</div>
    </div>
    <div class="doc-type">
      <h1>Fiche d'intervention</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="vehicle-box">
    <div class="field"><div class="lbl">Véhicule</div><div class="val">${vehicle.name}</div></div>
    <div class="field"><div class="lbl">Immatriculation</div><div class="val">${vehicle.plate ?? '—'}</div></div>
    <div class="field"><div class="lbl">Année</div><div class="val">${vehicle.year ?? '—'}</div></div>
    <div class="field"><div class="lbl">Kilométrage</div><div class="val">${(fiche.km_au_moment ?? vehicle.mileage ?? 0).toLocaleString('fr-FR')} km</div></div>
  </div>

  <h2>${fiche.titre}</h2>
  ${tachesDemandees.map(t => `
    <div class="task">
      <div class="box"></div>
      <div style="flex:1">
        <div class="desc">${t.description}</div>
        <div class="comment-line"></div>
      </div>
    </div>
  `).join('')}

  ${fiche.notes ? `<h2>Notes</h2><div class="notes-box">${fiche.notes}</div>` : ''}

  <div class="qr-section">
    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR code" />` : ''}
    <div class="txt">
      <h3>📱 À remplir en ligne</h3>
      <p>Ce document est un récapitulatif. <strong>Scannez le QR code</strong> (ou ouvrez le lien ci-dessous) pour cocher les travaux effectués, ajouter vos commentaires et déclarer toute intervention supplémentaire.</p>
      <div class="url">${url}</div>
    </div>
  </div>

  <div class="footer">EASYDRIFT — Fiche générée le ${new Date().toLocaleDateString('fr-FR')} — Merci de mettre à jour le kilométrage si besoin</div>
  <script>window.onload = () => setTimeout(() => window.print(), 300);</script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

// ─── MODAL CRÉATION DE FICHE ─────────────────────────────────────────────────

export function FicheCreateModal({ vehicle, onCreate, onClose, saving }) {
  const [titre, setTitre] = useState('Retour de piste — contrôle');
  const [km, setKm] = useState(vehicle.mileage ?? '');
  const [notes, setNotes] = useState('');
  const [checked, setChecked] = useState(() => new Set());
  const [customTasks, setCustomTasks] = useState([]);
  const [customInput, setCustomInput] = useState('');
  const [createdFiche, setCreatedFiche] = useState(null);
  const [copied, setCopied] = useState(false);

  const toggle = (item) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    setCustomTasks(t => [...t, v]);
    setCustomInput('');
  };

  const allTasks = [...CHECKLIST_PISTE.filter(i => checked.has(i)), ...customTasks];

  const handleCreate = async () => {
    if (allTasks.length === 0) return;
    const fiche = await onCreate({
      vehicleId: vehicle.id,
      titre: titre.trim() || 'Fiche d\'intervention',
      km: parseInt(km) || null,
      notes: notes.trim(),
      taches: allTasks,
    });
    if (fiche) setCreatedFiche(fiche);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(ficheUrl(createdFiche));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inp = { width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 26, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>

        {createdFiche ? (
          /* ── Vue succès : lien + PDF ── */
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 6 }}>Fiche envoyée</div>
            <div style={{ fontSize: 12, color: THEME.text.muted, marginBottom: 20 }}>{vehicle.name} est maintenant <strong style={{ color: THEME.accent.blue }}>Au garage</strong></div>

            <div style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 11, color: THEME.text.secondary, wordBreak: 'break-all', textAlign: 'left' }}>
              {ficheUrl(createdFiche)}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Btn onClick={copyLink}>{copied ? '✓ Copié !' : '📋 Copier le lien'}</Btn>
              <Btn variant="secondary" onClick={() => openFichePdf(
                createdFiche, vehicle,
                allTasks.map(d => ({ description: d, origine: 'demande' }))
              )}>📄 Télécharger le PDF</Btn>
            </div>
            <div style={{ marginTop: 18 }}>
              <Btn variant="ghost" onClick={onClose}>Fermer</Btn>
            </div>
          </div>
        ) : (
          /* ── Formulaire de création ── */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Nouvelle fiche d'intervention</div>
                <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>{vehicle.name} · {vehicle.plate}</div>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <label style={lbl}>Titre de la fiche</label>
                <input style={inp} value={titre} onChange={e => setTitre(e.target.value)} />
              </div>
              <div>
                <label style={lbl}>Kilométrage</label>
                <input type="number" style={inp} value={km} onChange={e => setKm(e.target.value)} />
              </div>
            </div>

            <label style={lbl}>Contrôles retour de piste — coche ce qu'il faut vérifier</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {CHECKLIST_PISTE.map(item => {
                const isOn = checked.has(item);
                return (
                  <button key={item} onClick={() => toggle(item)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                    borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                    border: `1px solid ${isOn ? THEME.accent.orange + '55' : THEME.border}`,
                    background: isOn ? THEME.accent.orangeDim : 'rgba(255,255,255,0.02)',
                    fontFamily: 'inherit',
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${isOn ? THEME.accent.orange : THEME.text.muted}`,
                      background: isOn ? THEME.accent.orange : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 900,
                    }}>{isOn ? '✓' : ''}</span>
                    <span style={{ fontSize: 13, color: isOn ? THEME.text.primary : THEME.text.secondary }}>{item}</span>
                  </button>
                );
              })}
            </div>

            <label style={lbl}>Tâches supplémentaires</label>
            {customTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {customTasks.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: THEME.accent.orangeDim, border: `1px solid ${THEME.accent.orange}55` }}>
                    <span style={{ fontSize: 13, color: THEME.text.primary, flex: 1 }}>{t}</span>
                    <button onClick={() => setCustomTasks(ts => ts.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 15 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                style={{ ...inp, flex: 1 }}
                placeholder="ex : Vidange boîte, changer biellette AV gauche…"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              />
              <Btn variant="secondary" onClick={addCustom}>+ Ajouter</Btn>
            </div>

            <label style={lbl}>Note libre pour le mécano</label>
            <textarea
              style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 16 }}
              placeholder="Contexte, symptômes constatés sur la piste…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: allTasks.length ? THEME.accent.green : THEME.text.muted }}>
                {allTasks.length} tâche{allTasks.length > 1 ? 's' : ''} dans la fiche
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
                <Btn onClick={handleCreate} disabled={allTasks.length === 0 || saving}>
                  {saving ? 'Création…' : 'Valider et envoyer'}
                </Btn>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── MODAL CLÔTURE ───────────────────────────────────────────────────────────

export function FicheClotureModal({ fiche, vehicle, onCloture, onClose, saving }) {
  const [cout, setCout] = useState('');
  const [factureFile, setFactureFile] = useState(null);
  const [updateRevision, setUpdateRevision] = useState(true);

  const inp = { width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  const tachesFaites = (fiche.taches ?? []).filter(t => t.fait).length;
  const tachesTotal = (fiche.taches ?? []).filter(t => t.origine !== 'mecano').length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 26, width: '100%', maxWidth: 460 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Clôturer la fiche</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ fontSize: 12, color: THEME.text.muted, marginBottom: 16 }}>
          {fiche.titre} · {vehicle.name}
          {fiche.travail_termine && <span style={{ color: THEME.accent.green, fontWeight: 700 }}> · Le mécano a terminé ✓</span>}
        </div>

        <div style={{ padding: '10px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, marginBottom: 16, fontSize: 12, color: THEME.text.secondary }}>
          {tachesFaites}/{(fiche.taches ?? []).length} tâches cochées
          {tachesTotal > tachesFaites && !fiche.travail_termine && (
            <span style={{ color: THEME.accent.yellow }}> — certaines tâches demandées ne sont pas faites</span>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Coût total (€)</label>
          <input type="number" style={inp} placeholder="450.00" value={cout} onChange={e => setCout(e.target.value)} autoFocus />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Facture (photo ou PDF)</label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={e => setFactureFile(e.target.files?.[0] ?? null)}
            style={{ ...inp, padding: '7px 10px', fontSize: 12 }}
          />
        </div>

        <button
          onClick={() => setUpdateRevision(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 18, fontFamily: 'inherit' }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: 5,
            border: `2px solid ${updateRevision ? THEME.accent.orange : THEME.text.muted}`,
            background: updateRevision ? THEME.accent.orange : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 12, fontWeight: 900,
          }}>{updateRevision ? '✓' : ''}</span>
          <span style={{ fontSize: 12, color: THEME.text.secondary, textAlign: 'left' }}>
            Mettre à jour la date de dernière révision et le kilométrage du véhicule
          </span>
        </button>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={() => onCloture({ cout, factureFile, updateRevision })} disabled={saving}>
            {saving ? 'Clôture…' : 'Clôturer la fiche'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
