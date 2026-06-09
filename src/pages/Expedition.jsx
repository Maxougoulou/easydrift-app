import { useState, useMemo } from 'react';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Card, Btn } from '../components/ui';
import { useAppContext } from '../lib/AppContext';

// ── DONNÉES PAR DÉFAUT ────────────────────────────────────────────────────────

const DEFAULT_ZONES = [
  { id: 'france',    name: 'France Métropole',          ratePalette: 110, rateColis: 15,  delay: '2-3 j ouvrés' },
  { id: 'domtom',    name: 'DOM-TOM (Guadeloupe…)',      ratePalette: 420, rateColis: 45,  delay: '7-14 j' },
  { id: 'eu1',       name: 'Europe proche (BE, DE, ES…)',ratePalette: 175, rateColis: 25,  delay: '3-5 j ouvrés' },
  { id: 'eu2',       name: 'Europe lointain (SE, NO, PL…)',ratePalette: 250, rateColis: 35, delay: '5-8 j ouvrés' },
  { id: 'uk',        name: 'Royaume-Uni',               ratePalette: 220, rateColis: 30,  delay: '4-7 j ouvrés' },
  { id: 'usa',       name: 'USA / Canada',              ratePalette: 650, rateColis: 80,  delay: '10-15 j' },
  { id: 'world',     name: 'Reste du monde',            ratePalette: 820, rateColis: 100, delay: '15-25 j' },
];

// Anneaux par palette (estimations basées sur dimensions)
const DEFAULT_CONFIG = {
  ringsPerPalette: { 'DTS 230×660': 6, 'DTS 200×600': 8, 'DTS 180×560': 10 },
  emballagePalette: 8,
  manutentionPalette: 4,
  emballageColis: 3,
};

const RING_TYPES = ['DTS 230×660', 'DTS 200×600', 'DTS 180×560'];

function loadLS(key, def) {
  try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; }
}
function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ── MODAL AJOUT EXPÉDITION ────────────────────────────────────────────────────

function AddShipmentModal({ zones, onSave, onClose }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    invoice: '',
    destination: '',
    zoneId: '',
    ringType: 'DTS 200×600',
    qty: '',
    palettes: '',
    costJeepest: '',
    chargedClient: '',
    notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inputStyle = {
    width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`,
    borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13,
    fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle = { fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 };

  const diff = form.chargedClient && form.costJeepest
    ? parseFloat(form.chargedClient) - parseFloat(form.costJeepest)
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Enregistrer une expédition</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={labelStyle}>Date</label>
            <input type="date" style={inputStyle} value={form.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>N° Facture JEEPEST</label>
            <input style={inputStyle} placeholder="FC207899" value={form.invoice} onChange={e => set('invoice', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Destination (ville / pays)</label>
            <input style={inputStyle} placeholder="Norrkoping, Suède" value={form.destination} onChange={e => set('destination', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Zone tarifaire</label>
            <select style={inputStyle} value={form.zoneId} onChange={e => set('zoneId', e.target.value)}>
              <option value="">Sélectionner…</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Type d'anneau</label>
            <select style={inputStyle} value={form.ringType} onChange={e => set('ringType', e.target.value)}>
              {RING_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Quantité d'anneaux</label>
            <input type="number" style={inputStyle} placeholder="20" value={form.qty} onChange={e => set('qty', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Nb palettes</label>
            <input type="number" style={inputStyle} placeholder="2" value={form.palettes} onChange={e => set('palettes', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Coût JEEPEST HT (€)</label>
            <input type="number" style={inputStyle} placeholder="475.00" value={form.costJeepest} onChange={e => set('costJeepest', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Facturé au client (€)</label>
            <input type="number" style={inputStyle} placeholder="500.00" value={form.chargedClient} onChange={e => set('chargedClient', e.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <input style={inputStyle} placeholder="Notes sur ce port…" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>

        {diff !== null && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: diff >= 0 ? `${THEME.accent.green}15` : `${THEME.accent.red}15`, border: `1px solid ${diff >= 0 ? THEME.accent.green : THEME.accent.red}33` }}>
            <span style={{ fontSize: 12, color: diff >= 0 ? THEME.accent.green : THEME.accent.red, fontWeight: 700 }}>
              {diff >= 0 ? `+ ${diff.toFixed(2)} € de marge sur ce port` : `- ${Math.abs(diff).toFixed(2)} € perdu sur ce port`}
            </span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={() => { onSave({ ...form, id: Date.now() }); onClose(); }}>Enregistrer</Btn>
        </div>
      </div>
    </div>
  );
}

// ── MODAL ÉDITION TARIFS ──────────────────────────────────────────────────────

function EditRatesModal({ zones, config, onSave, onClose }) {
  const [localZones, setLocalZones] = useState(JSON.parse(JSON.stringify(zones)));
  const [localConfig, setLocalConfig] = useState(JSON.parse(JSON.stringify(config)));

  const updateZone = (id, field, val) =>
    setLocalZones(z => z.map(zone => zone.id === id ? { ...zone, [field]: val } : zone));

  const inputStyle = { background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '6px 10px', color: THEME.text.primary, fontSize: 12, fontFamily: 'inherit', width: '90px', textAlign: 'right' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.modal, borderRadius: 16, border: `1px solid ${THEME.border}`, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Modifier les tarifs JEEPEST</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 16 }}>Tarifs de transport HT facturés par JEEPEST (hors emballage/manutention)</div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
              {['Zone', 'Tarif palette (€)', 'Tarif colis (€)', 'Délai'].map(h => (
                <th key={h} style={{ textAlign: 'left', fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', padding: '6px 8px', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localZones.map(z => (
              <tr key={z.id} style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                <td style={{ padding: '8px 8px', fontSize: 13, color: THEME.text.primary }}>{z.name}</td>
                <td style={{ padding: '8px 8px' }}>
                  <input type="number" style={inputStyle} value={z.ratePalette} onChange={e => updateZone(z.id, 'ratePalette', parseFloat(e.target.value) || 0)} />
                </td>
                <td style={{ padding: '8px 8px' }}>
                  <input type="number" style={inputStyle} value={z.rateColis} onChange={e => updateZone(z.id, 'rateColis', parseFloat(e.target.value) || 0)} />
                </td>
                <td style={{ padding: '8px 8px' }}>
                  <input style={{ ...inputStyle, width: '110px', textAlign: 'left' }} value={z.delay} onChange={e => updateZone(z.id, 'delay', e.target.value)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 12 }}>Frais fixes JEEPEST</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { key: 'emballagePalette', label: 'Emballage palette (€)' },
            { key: 'manutentionPalette', label: 'Manutention / fourche (€)' },
            { key: 'emballageColis', label: 'Emballage colis (€)' },
          ].map(({ key, label }) => (
            <div key={key}>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
              <input type="number" style={{ ...inputStyle, width: '100%', textAlign: 'left' }}
                value={localConfig[key]}
                onChange={e => setLocalConfig(c => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))} />
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 12 }}>Anneaux par palette</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {RING_TYPES.map(rt => (
            <div key={rt}>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{rt}</div>
              <input type="number" style={{ ...inputStyle, width: '100%', textAlign: 'left' }}
                value={localConfig.ringsPerPalette[rt]}
                onChange={e => setLocalConfig(c => ({ ...c, ringsPerPalette: { ...c.ringsPerPalette, [rt]: parseInt(e.target.value) || 1 } }))} />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={() => { onSave(localZones, localConfig); onClose(); }}>Enregistrer les tarifs</Btn>
        </div>
      </div>
    </div>
  );
}

// ── PAGE PRINCIPALE ───────────────────────────────────────────────────────────

export function ExpeditionModule() {
  const { isMobile } = useAppContext();
  const [zones, setZones] = useState(() => loadLS('expedition_zones', DEFAULT_ZONES));
  const [config, setConfig] = useState(() => loadLS('expedition_config', DEFAULT_CONFIG));
  const [history, setHistory] = useState(() => loadLS('expedition_history', []));
  const [showAdd, setShowAdd] = useState(false);
  const [showEditRates, setShowEditRates] = useState(false);

  // Calculateur
  const [calcZone, setCalcZone] = useState('');
  const [calcRing, setCalcRing] = useState('DTS 200×600');
  const [calcQty, setCalcQty] = useState('');
  const [calcMode, setCalcMode] = useState('auto');

  const result = useMemo(() => {
    const qty = parseInt(calcQty);
    if (!calcZone || !qty || qty <= 0) return null;
    const zone = zones.find(z => z.id === calcZone);
    if (!zone) return null;

    const rpp = config.ringsPerPalette[calcRing] || 8;
    const isPalette = calcMode === 'auto' ? qty >= 3 : calcMode === 'palette';

    if (isPalette) {
      const palettes = Math.ceil(qty / rpp);
      const transport = palettes * zone.ratePalette;
      const emballage = palettes * config.emballagePalette;
      const manutention = palettes * config.manutentionPalette;
      const total = transport + emballage + manutention;
      return { mode: 'palette', palettes, transport, emballage, manutention, total, perRing: total / qty, zone };
    } else {
      const transport = qty * zone.rateColis;
      const emballage = qty * config.emballageColis;
      const total = transport + emballage;
      return { mode: 'colis', transport, emballage, total, perRing: total / qty, zone };
    }
  }, [calcZone, calcRing, calcQty, calcMode, zones, config]);

  // Stats depuis l'historique
  const stats = useMemo(() => {
    if (!history.length) return null;
    const withCost = history.filter(h => h.costJeepest);
    const withDiff = history.filter(h => h.costJeepest && h.chargedClient);
    const totalLost = withDiff.reduce((s, h) => s + (parseFloat(h.chargedClient) - parseFloat(h.costJeepest)), 0);
    return {
      count: history.length,
      avgCost: withCost.length ? withCost.reduce((s, h) => s + parseFloat(h.costJeepest), 0) / withCost.length : 0,
      totalLost,
      balanced: withDiff.filter(h => parseFloat(h.chargedClient) >= parseFloat(h.costJeepest)).length,
    };
  }, [history]);

  const saveShipment = (s) => {
    const updated = [s, ...history];
    setHistory(updated);
    saveLS('expedition_history', updated);
  };

  const deleteShipment = (id) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    saveLS('expedition_history', updated);
  };

  const saveRates = (newZones, newConfig) => {
    setZones(newZones);
    setConfig(newConfig);
    saveLS('expedition_zones', newZones);
    saveLS('expedition_config', newConfig);
  };

  const inputStyle = {
    background: THEME.bg.input, border: `1px solid ${THEME.border}`,
    borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13,
    fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      <TopBar title="Expédition" subtitle="Tarification & calcul de port JEEPEST" />

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '16px 14px' : '24px 28px' }}>

        {/* ── Stats ── */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Expéditions enregistrées', value: stats.count, color: THEME.accent.orange },
              { label: 'Coût moyen / expédition', value: `${stats.avgCost.toFixed(0)} €`, color: THEME.accent.blue },
              { label: 'Ports équilibrés', value: `${stats.balanced} / ${history.filter(h => h.chargedClient).length}`, color: THEME.accent.green },
              { label: 'Marge cumulée', value: `${stats.totalLost >= 0 ? '+' : ''}${stats.totalLost.toFixed(0)} €`, color: stats.totalLost >= 0 ? THEME.accent.green : THEME.accent.red },
            ].map(s => (
              <div key={s.label} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: s.color, fontFamily: 'Rajdhani, sans-serif' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── Calculateur + Grille ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Calculateur */}
          <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.orange}0A`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Calculateur de port</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                <div>
                  <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Zone de destination</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {zones.map(z => (
                      <button key={z.id} onClick={() => setCalcZone(z.id)} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 14px', borderRadius: 8, border: `1px solid ${calcZone === z.id ? THEME.accent.orange + '66' : THEME.border}`,
                        background: calcZone === z.id ? THEME.accent.orangeDim : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer', textAlign: 'left',
                      }}>
                        <span style={{ fontSize: 13, color: calcZone === z.id ? THEME.accent.orange : THEME.text.secondary, fontWeight: calcZone === z.id ? 700 : 400 }}>{z.name}</span>
                        <span style={{ fontSize: 11, color: THEME.text.muted }}>{z.delay}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Type d'anneau</div>
                    <select style={inputStyle} value={calcRing} onChange={e => setCalcRing(e.target.value)}>
                      {RING_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Quantité</div>
                    <input type="number" style={inputStyle} placeholder="ex: 10" value={calcQty} onChange={e => setCalcQty(e.target.value)} min="1" />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Mode d'envoi</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[['auto', 'Auto'], ['colis', 'Colis'], ['palette', 'Palette']].map(([val, label]) => (
                      <button key={val} onClick={() => setCalcMode(val)} style={{
                        flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                        background: calcMode === val ? THEME.accent.orange : 'rgba(255,255,255,0.06)',
                        color: calcMode === val ? '#fff' : THEME.text.secondary,
                      }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 4 }}>Auto = colis si 1-2 anneaux, palette si 3+</div>
                </div>
              </div>

              {/* Résultat */}
              {result && (
                <div style={{ marginTop: 20, padding: 18, borderRadius: 12, background: `${THEME.accent.orange}10`, border: `1px solid ${THEME.accent.orange}33` }}>
                  <div style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                    Estimation — {result.mode === 'palette' ? `${result.palettes} palette${result.palettes > 1 ? 's' : ''}` : 'Colis'}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.secondary }}>
                      <span>Transport ({result.zone.name})</span>
                      <span>{result.transport.toFixed(2)} €</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.secondary }}>
                      <span>Emballage</span>
                      <span>{result.emballage.toFixed(2)} €</span>
                    </div>
                    {result.manutention > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.secondary }}>
                        <span>Manutention</span>
                        <span>{result.manutention.toFixed(2)} €</span>
                      </div>
                    )}
                    <div style={{ borderTop: `1px solid ${THEME.accent.orange}33`, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary }}>Coût réel HT</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif' }}>{result.total.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div style={{ padding: '12px 14px', borderRadius: 9, background: `${THEME.accent.green}12`, border: `1px solid ${THEME.accent.green}33` }}>
                    <div style={{ fontSize: 11, color: THEME.accent.green, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Prix a facturer au client</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: THEME.accent.green, fontFamily: 'Rajdhani, sans-serif' }}>{result.total.toFixed(2)} €</div>
                    <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>soit {result.perRing.toFixed(2)} € / anneau</div>
                  </div>
                </div>
              )}

              {!result && (
                <div style={{ marginTop: 20, padding: 18, borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: `1px solid ${THEME.border}`, textAlign: 'center', color: THEME.text.muted, fontSize: 13 }}>
                  Sélectionne une zone et une quantité
                </div>
              )}
            </div>
          </div>

          {/* Grille tarifaire */}
          <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Grille tarifaire JEEPEST</span>
              <Btn size="sm" variant="secondary" onClick={() => setShowEditRates(true)}>Modifier</Btn>
            </div>
            <div style={{ padding: '0 0 8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    {['Zone', 'Palette', 'Colis', 'Délai'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', padding: '10px 16px', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {zones.map((z, i) => (
                    <tr key={z.id} style={{ borderBottom: i < zones.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none', background: calcZone === z.id ? `${THEME.accent.orange}08` : 'transparent' }}>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: calcZone === z.id ? THEME.accent.orange : THEME.text.primary, fontWeight: calcZone === z.id ? 700 : 400 }}>{z.name}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: THEME.text.secondary, fontWeight: 600 }}>{z.ratePalette} €</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: THEME.text.secondary }}>{z.rateColis} €</td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: THEME.text.muted }}>{z.delay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ padding: '12px 16px', borderTop: `1px solid ${THEME.border}`, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: THEME.text.muted }}>Emballage palette : <strong style={{ color: THEME.text.secondary }}>{config.emballagePalette} €</strong></span>
                <span style={{ fontSize: 11, color: THEME.text.muted }}>Manutention : <strong style={{ color: THEME.text.secondary }}>{config.manutentionPalette} €</strong></span>
                <span style={{ fontSize: 11, color: THEME.text.muted }}>Emballage colis : <strong style={{ color: THEME.text.secondary }}>{config.emballageColis} €</strong></span>
              </div>
              <div style={{ padding: '0 16px 12px', borderTop: `1px solid ${THEME.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Anneaux / palette</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {RING_TYPES.map(rt => (
                    <div key={rt} style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: THEME.text.muted }}>{rt}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>{config.ringsPerPalette[rt]}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Historique ── */}
        <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Historique des expéditions</span>
            <Btn size="sm" onClick={() => setShowAdd(true)}>+ Ajouter</Btn>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: THEME.text.muted, fontSize: 13 }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>◳</div>
              Aucune expédition enregistrée.<br />Ajoute tes factures JEEPEST pour suivre tes coûts réels.
              <div style={{ marginTop: 16 }}><Btn onClick={() => setShowAdd(true)}>+ Première expédition</Btn></div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    {['Date', 'Facture', 'Destination', 'Anneau', 'Qté', 'Coût JEEPEST', 'Facturé client', 'Écart', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', padding: '10px 14px', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const diff = h.chargedClient && h.costJeepest
                      ? parseFloat(h.chargedClient) - parseFloat(h.costJeepest)
                      : null;
                    return (
                      <tr key={h.id} style={{ borderBottom: i < history.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.text.muted, whiteSpace: 'nowrap' }}>{h.date}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.accent.orange, fontWeight: 600 }}>{h.invoice || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.text.primary }}>{h.destination || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: THEME.text.secondary }}>{h.ringType}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.text.primary, fontWeight: 700 }}>{h.qty || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.text.primary }}>{h.costJeepest ? `${parseFloat(h.costJeepest).toFixed(2)} €` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: THEME.text.primary }}>{h.chargedClient ? `${parseFloat(h.chargedClient).toFixed(2)} €` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>
                          {diff !== null ? (
                            <span style={{ color: diff >= 0 ? THEME.accent.green : THEME.accent.red }}>
                              {diff >= 0 ? '+' : ''}{diff.toFixed(2)} €
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => deleteShipment(h.id)} style={{ background: 'none', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAdd && <AddShipmentModal zones={zones} onSave={saveShipment} onClose={() => setShowAdd(false)} />}
      {showEditRates && <EditRatesModal zones={zones} config={config} onSave={saveRates} onClose={() => setShowEditRates(false)} />}
    </div>
  );
}
