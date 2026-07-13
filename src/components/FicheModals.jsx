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

// pieces : [{ name, reference, qty, reorder }] — les pièces FOURNIES avec le véhicule pour cette fiche
export async function openFichePdf(fiche, vehicle, taches, pieces = []) {
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
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; padding: 0 0 36px; font-size: 13px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .header { display: flex; justify-content: space-between; align-items: center; background: #0D0D0F; padding: 20px 44px; border-bottom: 4px solid #F07814; margin-bottom: 24px; }
  .header img.logo { height: 36px; display: block; }
  .doc-type { text-align: right; }
  .doc-type h1 { font-size: 16px; text-transform: uppercase; letter-spacing: 0.08em; color: #fff; }
  .doc-type .date { font-size: 12px; color: #999; margin-top: 4px; }
  .content { padding: 0 44px; }
  .vehicle-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 14px 18px; margin-bottom: 22px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
  .vehicle-box .field .lbl { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 2px; }
  .vehicle-box .field .val { font-size: 15px; font-weight: 700; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.08em; color: #F07814; margin: 20px 0 10px; }
  .task { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #e5e5e5; align-items: flex-start; page-break-inside: avoid; }
  .task .box { width: 18px; height: 18px; border: 2px solid #333; border-radius: 4px; flex-shrink: 0; margin-top: 1px; }
  .task .desc { font-size: 13px; font-weight: 600; flex: 1; }
  .task .comment-line { border-bottom: 1px dotted #bbb; height: 20px; margin-top: 6px; }
  .task .task-consigne { font-size: 12px; color: #b45309; margin-top: 3px; font-weight: 600; }
  .notes-box { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; margin-top: 8px; font-size: 12px; color: #444; background: #fafafa; }
  .pieces-box { border: 1px solid #b7e4c7; border-radius: 8px; padding: 12px 16px; background: #f4fbf6; page-break-inside: avoid; }
  .piece { display: flex; gap: 8px; align-items: baseline; padding: 4px 0; font-size: 13px; }
  .piece-qty { font-weight: 800; color: #1a7f3c; min-width: 26px; }
  .piece-name { font-weight: 600; }
  .piece-ref { font-size: 11px; color: #777; }
  .piece-notes { font-size: 11px; color: #777; font-style: italic; }
  .piece-qty-zero { color: #c62828; }
  .piece-reorder { font-size: 10px; font-weight: 800; color: #9a6700; background: #fff3cd; border: 1px solid #ffe08a; border-radius: 4px; padding: 1px 7px; letter-spacing: 0.03em; }
  .pieces-hint { font-size: 11px; color: #1a7f3c; margin-top: 8px; font-weight: 600; }
  .qr-section { margin-top: 28px; border: 2px solid #F07814; border-radius: 10px; padding: 18px 22px; display: flex; gap: 22px; align-items: center; page-break-inside: avoid; }
  .qr-section img { width: 130px; height: 130px; }
  .qr-section .txt h3 { font-size: 15px; margin-bottom: 6px; }
  .qr-section .txt p { font-size: 12px; color: #555; line-height: 1.5; }
  .qr-section .txt .url { font-size: 10px; color: #999; margin-top: 8px; word-break: break-all; }
  .footer { margin-top: 26px; padding-top: 12px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
  @media print { .header { margin-bottom: 18px; } }
</style>
</head>
<body>
  <div class="header">
    <img class="logo" src="${window.location.origin}/logo-easydrift.png" alt="EASYDRIFT" />
    <div class="doc-type">
      <h1>Fiche d'intervention</h1>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <div class="content">
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
        ${t.consigne ? `<div class="task-consigne">📌 ${t.consigne}</div>` : ''}
        <div class="comment-line"></div>
      </div>
    </div>
  `).join('')}

  ${fiche.notes ? `<h2>Notes</h2><div class="notes-box">${fiche.notes}</div>` : ''}

  ${pieces.length > 0 ? `
    <h2>📦 Pièces fournies avec le véhicule</h2>
    <div class="pieces-box">
      ${pieces.map(p => `
        <div class="piece">
          <span class="piece-qty">${p.qty ?? 1}×</span>
          <span class="piece-name">${p.name}</span>
          ${p.reference ? `<span class="piece-ref">réf. ${p.reference}</span>` : ''}
          ${p.reorder ? `<span class="piece-reorder">⚠ À RECOMMANDER</span>` : ''}
        </div>
      `).join('')}
      <div class="pieces-hint">Ces pièces sont dans le véhicule. Coche en ligne celles que tu utilises : la commande à passer pour reconstituer le stock EASYDRIFT s'affiche automatiquement (1 utilisée = 1 commandée).</div>
    </div>
  ` : ''}

  <div class="qr-section">
    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR code" />` : ''}
    <div class="txt">
      <h3>📱 À remplir en ligne</h3>
      <p>Ce document est un récapitulatif. <strong>Scannez le QR code</strong> (ou ouvrez le lien ci-dessous) pour cocher les travaux effectués, ajouter vos commentaires et déclarer toute intervention supplémentaire.</p>
      <div class="url">${url}</div>
    </div>
  </div>

  <div class="footer">EASYDRIFT — Fiche générée le ${new Date().toLocaleDateString('fr-FR')} — Merci de mettre à jour le kilométrage si besoin</div>
  </div>
  <script>
    // Attendre le chargement du logo avant d'imprimer
    window.onload = () => setTimeout(() => window.print(), 450);
  </script>
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
  const [photos, setPhotos] = useState({});  // description → File
  const [consignes, setConsignes] = useState({});  // description → texte consigne
  const [fournies, setFournies] = useState({});  // part_id → qty fournie
  const [createdFiche, setCreatedFiche] = useState(null);
  const [copied, setCopied] = useState(false);

  const toggle = (item) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
        setPhotos(p => { const { [item]: _, ...rest } = p; return rest; });
        setConsignes(c => { const { [item]: _, ...rest } = c; return rest; });
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const setConsigne = (desc, text) => setConsignes(c => ({ ...c, [desc]: text }));

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    setCustomTasks(t => [...t, v]);
    setCustomInput('');
  };

  const setPhoto = (desc, file) => {
    setPhotos(p => file ? { ...p, [desc]: file } : (() => { const { [desc]: _, ...rest } = p; return rest; })());
  };

  const allTasks = [...CHECKLIST_PISTE.filter(i => checked.has(i)), ...customTasks];

  // Sélection des pièces fournies : coche = toute la quantité en stock par défaut
  const togglePiece = (p) => {
    setFournies(f => {
      if (f[p.id]) { const { [p.id]: _, ...rest } = f; return rest; }
      return { ...f, [p.id]: Math.max(1, p.qty ?? 1) };
    });
  };
  const setPieceQty = (p, delta) => {
    setFournies(f => {
      const next = (f[p.id] ?? 0) + delta;
      if (next <= 0) { const { [p.id]: _, ...rest } = f; return rest; }
      return { ...f, [p.id]: Math.min(next, Math.max(1, p.qty ?? 1)) };
    });
  };

  const piecesFournies = () => (vehicle.parts ?? [])
    .filter(p => fournies[p.id] > 0)
    .map(p => ({ part_id: p.id, qty: fournies[p.id], name: p.name, reference: p.reference, reorder: p.reorder }));

  const handleCreate = async () => {
    if (allTasks.length === 0) return;
    const fiche = await onCreate({
      vehicleId: vehicle.id,
      titre: titre.trim() || 'Fiche d\'intervention',
      km: parseInt(km) || null,
      notes: notes.trim(),
      taches: allTasks.map(desc => ({
        description: desc,
        photoFile: photos[desc] ?? null,
        consigne: consignes[desc]?.trim() || null,
      })),
      pieces: piecesFournies(),
    });
    if (fiche) setCreatedFiche(fiche);
  };

  // Petit bouton 📷 : label + input file caché (fonction de rendu, pas un composant)
  const renderPhotoBtn = (desc) => (
    <label
      onClick={e => e.stopPropagation()}
      title={photos[desc] ? 'Photo jointe — cliquer pour changer' : 'Joindre une photo'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
        padding: '3px 8px', borderRadius: 6, flexShrink: 0,
        background: photos[desc] ? THEME.accent.orangeDim : 'rgba(255,255,255,0.05)',
        border: `1px solid ${photos[desc] ? THEME.accent.orange + '55' : THEME.border}`,
        fontSize: 12, color: photos[desc] ? THEME.accent.orange : THEME.text.muted,
      }}
    >
      📷{photos[desc] ? ' ✓' : ''}
      <input
        type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
        onChange={e => setPhoto(desc, e.target.files?.[0] ?? null)}
      />
    </label>
  );

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
                allTasks.map(desc => ({ description: desc, origine: 'demande', consigne: consignes[desc]?.trim() || null })),
                piecesFournies().map(p => ({ name: p.name, reference: p.reference, qty: p.qty, reorder: p.reorder }))
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
                  <div key={item} style={{
                    borderRadius: 8,
                    border: `1px solid ${isOn ? THEME.accent.orange + '55' : THEME.border}`,
                    background: isOn ? THEME.accent.orangeDim : 'rgba(255,255,255,0.02)',
                    overflow: 'hidden',
                  }}>
                    <div onClick={() => toggle(item)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer' }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${isOn ? THEME.accent.orange : THEME.text.muted}`,
                        background: isOn ? THEME.accent.orange : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 900,
                      }}>{isOn ? '✓' : ''}</span>
                      <span style={{ fontSize: 13, color: isOn ? THEME.text.primary : THEME.text.secondary, flex: 1 }}>{item}</span>
                      {isOn && renderPhotoBtn(item)}
                    </div>
                    {/* Consigne pour le mécano sur cette tâche */}
                    {isOn && (
                      <div style={{ padding: '0 12px 9px 40px' }}>
                        <input
                          value={consignes[item] ?? ''}
                          onChange={e => setConsigne(item, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="Commentaire pour le mécano (optionnel)…"
                          style={{
                            width: '100%', background: 'rgba(0,0,0,0.25)', border: `1px solid ${THEME.border}`,
                            borderRadius: 6, padding: '6px 10px', color: THEME.text.primary,
                            fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <label style={lbl}>Tâches supplémentaires</label>
            {customTasks.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {customTasks.map((t, i) => (
                  <div key={i} style={{ borderRadius: 8, background: THEME.accent.orangeDim, border: `1px solid ${THEME.accent.orange}55`, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                      <span style={{ fontSize: 13, color: THEME.text.primary, flex: 1 }}>{t}</span>
                      {renderPhotoBtn(t)}
                      <button onClick={() => { setCustomTasks(ts => ts.filter((_, j) => j !== i)); setPhoto(t, null); setConsigne(t, ''); }} style={{ background: 'none', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 15 }}>×</button>
                    </div>
                    <div style={{ padding: '0 12px 8px' }}>
                      <input
                        value={consignes[t] ?? ''}
                        onChange={e => setConsigne(t, e.target.value)}
                        placeholder="Commentaire pour le mécano (optionnel)…"
                        style={{
                          width: '100%', background: 'rgba(0,0,0,0.25)', border: `1px solid ${THEME.border}`,
                          borderRadius: 6, padding: '6px 10px', color: THEME.text.primary,
                          fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    </div>
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

            {/* Pièces fournies avec le véhicule : TU choisis ce que tu mets dans la voiture */}
            {(vehicle.parts ?? []).length > 0 && (
              <>
                <label style={lbl}>Pièces fournies avec le véhicule — coche ce que tu mets dans la voiture</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                  {(vehicle.parts ?? []).map(p => {
                    const stock = p.qty ?? 1;
                    const epuise = stock === 0;
                    const selQty = fournies[p.id] ?? 0;
                    const isSel = selQty > 0;
                    return (
                      <div key={p.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                        borderRadius: 8, cursor: epuise ? 'default' : 'pointer',
                        background: isSel ? THEME.accent.orangeDim : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isSel ? THEME.accent.orange + '55' : epuise ? THEME.accent.red + '33' : THEME.border}`,
                        opacity: epuise ? 0.55 : 1,
                      }}
                        onClick={() => !epuise && togglePiece(p)}
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${isSel ? THEME.accent.orange : THEME.text.muted}`,
                          background: isSel ? THEME.accent.orange : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 12, fontWeight: 900,
                        }}>{isSel ? '✓' : ''}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 13, color: isSel ? THEME.text.primary : THEME.text.secondary, fontWeight: 600 }}>{p.name}</span>
                          {p.reference && <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 8 }}>réf. {p.reference}</span>}
                          <span style={{ fontSize: 11, color: epuise ? THEME.accent.red : THEME.text.muted, marginLeft: 8 }}>
                            {epuise ? 'épuisé' : `${stock} en stock`}
                          </span>
                        </div>
                        {/* Quantité fournie */}
                        {isSel && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            <button onClick={() => setPieceQty(p, -1)} style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.05)', color: THEME.text.secondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>−</button>
                            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif', minWidth: 30, textAlign: 'center' }}>{selQty}×</span>
                            <button onClick={() => setPieceQty(p, +1)} disabled={selQty >= stock} style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.05)', color: selQty >= stock ? THEME.text.muted : THEME.text.secondary, fontSize: 13, cursor: selQty >= stock ? 'not-allowed' : 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>+</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

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

// ─── MODAL ÉDITION FICHE OUVERTE ─────────────────────────────────────────────
// Même interface que la création : checklist pré-cochée, tâches custom,
// pièces fournies. Chaque action est sauvegardée immédiatement.

export function FicheEditModal({ fiche, vehicle, actions, onClose }) {
  const { updateFiche, addTacheToFiche, updateTache, deleteTache, setTachePhoto, setFichePiece } = actions;
  const [titre, setTitre] = useState(fiche.titre);
  const [km, setKm] = useState(fiche.km_au_moment ?? '');
  const [notes, setNotes] = useState(fiche.notes ?? '');
  const [customInput, setCustomInput] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const taches = fiche.taches ?? [];
  const demandeTasks = taches.filter(t => t.origine !== 'mecano');
  const mecanoTasks = taches.filter(t => t.origine === 'mecano');
  const byDesc = new Map(demandeTasks.map(t => [t.description, t]));
  const customTasks = demandeTasks.filter(t => !CHECKLIST_PISTE.includes(t.description));
  const fourniesMap = Object.fromEntries((fiche.pieces_fournies ?? []).map(fp => [fp.part_id, fp]));

  const inp = { width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  const saveMeta = () => {
    const kmVal = parseInt(km) || null;
    if (titre.trim() !== fiche.titre || (notes.trim() || null) !== (fiche.notes ?? null) || kmVal !== fiche.km_au_moment) {
      updateFiche(fiche.id, { titre: titre.trim() || fiche.titre, notes: notes.trim() || null, km_au_moment: kmVal });
    }
  };

  // Coche/décoche un item de la checklist = ajoute/supprime la tâche
  const toggleChecklist = (item) => {
    const existing = byDesc.get(item);
    if (existing) {
      if (existing.fait) return;          // déjà faite par le mécano : verrouillée
      deleteTache(existing.id);
    } else {
      addTacheToFiche(fiche.id, { description: item });
    }
  };

  const addCustom = () => {
    const v = customInput.trim();
    if (!v) return;
    addTacheToFiche(fiche.id, { description: v });
    setCustomInput('');
  };

  // Bouton 📷 sur une tâche existante (fonction de rendu, pas un composant)
  const renderPhotoBtn = (t) => (
    <label
      onClick={e => e.stopPropagation()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'pointer',
        padding: '3px 8px', borderRadius: 6, flexShrink: 0,
        background: t.photo_url ? THEME.accent.orangeDim : 'rgba(255,255,255,0.05)',
        border: `1px solid ${t.photo_url ? THEME.accent.orange + '55' : THEME.border}`,
        fontSize: 12, color: t.photo_url ? THEME.accent.orange : THEME.text.muted,
      }}
    >
      📷{t.photo_url ? ' ✓' : ''}
      <input
        type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => e.target.files?.[0] && setTachePhoto(t.id, e.target.files[0])}
      />
    </label>
  );

  // Consigne éditable sous une tâche
  const renderConsigne = (t) => (
    <div style={{ padding: '0 12px 9px 40px' }}>
      <input
        key={`${t.id}-consigne`}
        defaultValue={t.consigne ?? ''}
        onClick={e => e.stopPropagation()}
        onBlur={e => { if ((e.target.value.trim() || null) !== (t.consigne ?? null)) updateTache(t.id, { consigne: e.target.value.trim() || null }); }}
        placeholder="Commentaire pour le mécano (optionnel)…"
        style={{
          width: '100%', background: 'rgba(0,0,0,0.25)', border: `1px solid ${THEME.border}`,
          borderRadius: 6, padding: '6px 10px', color: THEME.text.primary,
          fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 26, width: '100%', maxWidth: 580, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Modifier la fiche</div>
            <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>{vehicle.name} · {vehicle.plate} — enregistré immédiatement</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Titre de la fiche</label>
            <input style={inp} value={titre} onChange={e => setTitre(e.target.value)} onBlur={saveMeta} />
          </div>
          <div>
            <label style={lbl}>Kilométrage</label>
            <input type="number" style={inp} value={km} onChange={e => setKm(e.target.value)} onBlur={saveMeta} />
          </div>
        </div>

        <label style={lbl}>Contrôles retour de piste — coche ce qu'il faut vérifier</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
          {CHECKLIST_PISTE.map(item => {
            const t = byDesc.get(item);
            const isOn = !!t;
            const locked = t?.fait;
            return (
              <div key={item} style={{
                borderRadius: 8,
                border: `1px solid ${isOn ? THEME.accent.orange + '55' : THEME.border}`,
                background: isOn ? THEME.accent.orangeDim : 'rgba(255,255,255,0.02)',
                overflow: 'hidden',
              }}>
                <div
                  onClick={() => toggleChecklist(item)}
                  title={locked ? 'Déjà faite par le mécano — non modifiable' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: locked ? 'default' : 'pointer' }}
                >
                  <span style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${locked ? THEME.accent.green : isOn ? THEME.accent.orange : THEME.text.muted}`,
                    background: locked ? THEME.accent.green : isOn ? THEME.accent.orange : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 900,
                  }}>{isOn ? '✓' : ''}</span>
                  <span style={{ fontSize: 13, color: isOn ? THEME.text.primary : THEME.text.secondary, flex: 1 }}>
                    {item}
                    {locked && <span style={{ fontSize: 10, color: THEME.accent.green, fontWeight: 700, marginLeft: 8 }}>faite ✓</span>}
                  </span>
                  {isOn && renderPhotoBtn(t)}
                </div>
                {isOn && renderConsigne(t)}
              </div>
            );
          })}
        </div>

        <label style={lbl}>Tâches supplémentaires</label>
        {customTasks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
            {customTasks.map(t => (
              <div key={t.id} style={{ borderRadius: 8, background: THEME.accent.orangeDim, border: `1px solid ${THEME.accent.orange}55`, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px' }}>
                  <span style={{ fontSize: 13, color: THEME.text.primary, flex: 1 }}>
                    {t.description}
                    {t.fait && <span style={{ fontSize: 10, color: THEME.accent.green, fontWeight: 700, marginLeft: 8 }}>faite ✓</span>}
                  </span>
                  {renderPhotoBtn(t)}
                  {!t.fait && (
                    confirmDel === t.id ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { deleteTache(t.id); setConfirmDel(null); }} style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '2px 8px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
                        <button onClick={() => setConfirmDel(null)} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '2px 8px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
                      </span>
                    ) : (
                      <button onClick={() => setConfirmDel(t.id)} style={{ background: 'none', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 15 }}>×</button>
                    )
                  )}
                </div>
                <div style={{ padding: '0 12px 8px' }}>
                  <input
                    key={`${t.id}-consigne`}
                    defaultValue={t.consigne ?? ''}
                    onBlur={e => { if ((e.target.value.trim() || null) !== (t.consigne ?? null)) updateTache(t.id, { consigne: e.target.value.trim() || null }); }}
                    placeholder="Commentaire pour le mécano (optionnel)…"
                    style={{
                      width: '100%', background: 'rgba(0,0,0,0.25)', border: `1px solid ${THEME.border}`,
                      borderRadius: 6, padding: '6px 10px', color: THEME.text.primary,
                      fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
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

        {/* Interventions déclarées par le mécano (lecture seule) */}
        {mecanoTasks.length > 0 && (
          <>
            <label style={lbl}>Ajouté par le mécano</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {mecanoTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: THEME.accent.blueDim, border: `1px solid ${THEME.accent.blue}33` }}>
                  <span style={{ color: THEME.accent.green, fontWeight: 900, fontSize: 13 }}>✓</span>
                  <span style={{ fontSize: 13, color: THEME.text.primary, flex: 1 }}>{t.description}</span>
                  {t.commentaire && <span style={{ fontSize: 11, color: THEME.text.muted, fontStyle: 'italic' }}>💬 {t.commentaire}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pièces fournies avec le véhicule — même interface que la création */}
        {(vehicle.parts ?? []).length > 0 && (
          <>
            <label style={lbl}>Pièces fournies avec le véhicule — coche ce que tu mets dans la voiture</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
              {(vehicle.parts ?? []).map(p => {
                const fp = fourniesMap[p.id];
                const fournie = fp?.qty_fournie ?? 0;
                const used = fp?.qty_utilisee ?? 0;
                const stock = p.qty ?? 1;
                const maxQty = fournie + stock;   // déjà dans la voiture + stock restant
                const isSel = fournie > 0;
                const epuise = !isSel && stock === 0;
                const locked = used > 0;           // le mécano en a utilisé : impossible de tout retirer
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 8, cursor: epuise || locked ? 'default' : 'pointer',
                    background: isSel ? THEME.accent.orangeDim : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSel ? THEME.accent.orange + '55' : epuise ? THEME.accent.red + '33' : THEME.border}`,
                    opacity: epuise ? 0.55 : 1,
                  }}
                    onClick={() => {
                      if (epuise || locked) return;
                      if (isSel) setFichePiece(fiche.id, p.id, 0, used);
                      else setFichePiece(fiche.id, p.id, Math.max(1, stock), used);
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${isSel ? THEME.accent.orange : THEME.text.muted}`,
                      background: isSel ? THEME.accent.orange : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 12, fontWeight: 900,
                    }}>{isSel ? '✓' : ''}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, color: isSel ? THEME.text.primary : THEME.text.secondary, fontWeight: 600 }}>{p.name}</span>
                      {p.reference && <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 8 }}>réf. {p.reference}</span>}
                      <span style={{ fontSize: 11, color: epuise ? THEME.accent.red : THEME.text.muted, marginLeft: 8 }}>
                        {epuise ? 'épuisé' : `${stock} en stock`}
                      </span>
                      {locked && <span style={{ fontSize: 11, color: THEME.accent.orange, marginLeft: 8 }}>{used} utilisée{used > 1 ? 's' : ''}</span>}
                    </div>
                    {isSel && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => setFichePiece(fiche.id, p.id, fournie - 1, used)} disabled={fournie <= used} style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.05)', color: fournie <= used ? THEME.text.muted : THEME.text.secondary, fontSize: 13, cursor: fournie <= used ? 'not-allowed' : 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>−</button>
                        <span style={{ fontSize: 14, fontWeight: 700, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif', minWidth: 30, textAlign: 'center' }}>{fournie}×</span>
                        <button onClick={() => setFichePiece(fiche.id, p.id, fournie + 1, used)} disabled={fournie >= maxQty} style={{ width: 22, height: 22, borderRadius: 5, border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.05)', color: fournie >= maxQty ? THEME.text.muted : THEME.text.secondary, fontSize: 13, cursor: fournie >= maxQty ? 'not-allowed' : 'pointer', fontFamily: 'inherit', lineHeight: 1 }}>+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        <label style={lbl}>Note libre pour le mécano</label>
        <textarea
          style={{ ...inp, minHeight: 60, resize: 'vertical', marginBottom: 16 }}
          placeholder="Contexte, symptômes constatés sur la piste…"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={saveMeta}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: THEME.text.muted }}>
            {demandeTasks.length} tâche{demandeTasks.length > 1 ? 's' : ''} · tout est enregistré
          </span>
          <Btn onClick={onClose}>Fermer</Btn>
        </div>
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
