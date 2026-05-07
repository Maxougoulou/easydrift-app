import { useState } from 'react';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Card, Btn } from '../components/ui';
import { useAppContext } from '../lib/AppContext';

// ── DONNÉES (extraites des charts PDF EasyDrift) ──────────────────────────────

const RINGS = [
  {
    ref: 'DTS 230×660',
    outerDiameter: 692,
    innerDiameter: 660,
    width: 230,
    tires: [
      { w: 175, a: 75, r: 16, brand: null,       type: null,                      d: 668.9 },
      { w: 195, a: 65, r: 16, brand: null,       type: null,                      d: 659.9 },
      { w: 215, a: 60, r: 16, brand: null,       type: null,                      d: 664.4 },
      { w: 235, a: 55, r: 16, brand: null,       type: null,                      d: 664.9 },
      { w: 255, a: 50, r: 16, brand: null,       type: null,                      d: 661.4 },
      { w: 215, a: 55, r: 17, brand: null,       type: null,                      d: 668.3 },
      { w: 235, a: 50, r: 17, brand: null,       type: null,                      d: 666.8 },
      { w: 255, a: 45, r: 17, brand: null,       type: null,                      d: 661.3 },
      { w: 265, a: 45, r: 17, brand: null,       type: null,                      d: 670.3 },
      { w: 235, a: 45, r: 18, brand: 'NANKANG',  type: 'NK COMFORT AS-1 98W',     d: 668.7 },
      { w: 235, a: 45, r: 18, brand: 'Sumitomo', type: 'HTR Enhance LX2',         d: 668.7 },
      { w: 235, a: 45, r: 18, brand: 'TOYO',     type: 'Proxes 4 Plus',           d: 668.7 },
      { w: 255, a: 40, r: 18, brand: null,       type: null,                      d: 661.2 },
      { w: 265, a: 40, r: 18, brand: null,       type: null,                      d: 669.2 },
      { w: 225, a: 40, r: 19, brand: null,       type: null,                      d: 662.6 },
      { w: 235, a: 40, r: 19, brand: 'TOYO',     type: 'Proxes 4 Plus',           d: 670.6 },
      { w: 235, a: 40, r: 19, brand: 'Linglong',  type: 'Tire Crosswind',          d: 670.6 },
      { w: 235, a: 40, r: 19, brand: 'NANKANG',  type: 'NK COMFORT AS-1 96Y',     d: 670.6 },
      { w: 255, a: 35, r: 19, brand: null,       type: null,                      d: 661.1 },
      { w: 265, a: 35, r: 19, brand: null,       type: null,                      d: 668.1 },
      { w: 235, a: 35, r: 20, brand: 'NITTO',    type: 'NT 555 ZR',               d: 672.5 },
      { w: 235, a: 35, r: 20, brand: 'Michelin', type: 'Pilot Super Sport',       d: 672.5 },
      { w: 255, a: 30, r: 20, brand: null,       type: null,                      d: 661.0 },
      { w: 265, a: 30, r: 20, brand: null,       type: null,                      d: 667.0 },
      { w: 275, a: 30, r: 20, brand: null,       type: null,                      d: 673.0 },
      { w: 235, a: 30, r: 21, brand: null,       type: null,                      d: 674.4 },
    ],
  },
  {
    ref: 'DTS 200×600',
    outerDiameter: 640,
    innerDiameter: 600,
    width: 200,
    tires: [
      { w: 185, a: 60, r: 15, brand: 'CONTINENTAL', type: 'ContiPremiumContact 2 88H', d: 603.0 },
      { w: 185, a: 60, r: 15, brand: 'GENERAL',     type: 'Altimax RT',                d: 603.0 },
      { w: 185, a: 60, r: 15, brand: 'KLEBER',      type: 'Dynaxer HP3 88H-EL',        d: 603.0 },
      { w: 185, a: 60, r: 15, brand: 'NANKANG',     type: 'ECONEX ECO-2+ 88H',         d: 603.0 },
      { w: 185, a: 60, r: 15, brand: 'ROTALA',      type: 'Radial F108 84H',           d: 603.0 },
      { w: 205, a: 55, r: 15, brand: 'RIKEN EUROPE',type: 'Maystorm 2B2 88V',          d: 606.5 },
      { w: 225, a: 50, r: 15, brand: null,          type: null,                        d: 606.0 },
      { w: 185, a: 55, r: 16, brand: null,          type: null,                        d: 609.9 },
      { w: 195, a: 50, r: 16, brand: 'GOODYEAR',    type: 'Eagle F1 GSD3 84V',         d: 601.4 },
      { w: 205, a: 50, r: 16, brand: 'ASPEN',       type: 'Touring A/S',               d: 611.4 },
      { w: 215, a: 45, r: 16, brand: null,          type: null,                        d: 599.9 },
      { w: 225, a: 45, r: 16, brand: 'NANKANG',     type: 'NS20 89W',                  d: 608.9 },
      { w: 215, a: 40, r: 17, brand: 'DUNLOP',      type: 'SP Sport Maxx 87V',         d: 603.8 },
      { w: 215, a: 40, r: 17, brand: 'KUMHO',       type: 'ECSTA SPT ZR17 XL 87W',     d: 603.8 },
      { w: 215, a: 40, r: 17, brand: 'MICHELIN',    type: 'Pilot Exalto 87W XL',       d: 603.8 },
      { w: 215, a: 40, r: 17, brand: 'NANKANG',     type: 'NS2 87V',                   d: 603.8 },
      { w: 215, a: 40, r: 17, brand: 'NANKANG',     type: 'NS20 87V',                  d: 603.8 },
      { w: 215, a: 40, r: 17, brand: 'SAILUN',      type: 'Atrezzo SVA1',              d: 603.8 },
      { w: 215, a: 35, r: 18, brand: 'IMPERIAL',    type: 'ECOSPORT 84W',              d: 607.7 },
      { w: 215, a: 35, r: 18, brand: 'KUMHO',       type: 'ECSTA PA31 XL 84W',         d: 607.7 },
      { w: 215, a: 35, r: 18, brand: 'NANKANG',     type: 'NS2 84W',                   d: 607.7 },
      { w: 215, a: 35, r: 18, brand: 'NANKANG',     type: 'NS20 84Y',                  d: 607.7 },
      { w: 215, a: 35, r: 18, brand: 'RAPID',       type: 'P609 84W',                  d: 607.7 },
    ],
  },
  {
    ref: 'DTS 180×560',
    outerDiameter: 590,
    innerDiameter: 560,
    width: 180,
    tires: [
      { w: 145, a: 80, r: 13, brand: null,        type: null,                         d: 562.2 },
      { w: 165, a: 70, r: 13, brand: null,        type: null,                         d: 561.2 },
      { w: 165, a: 75, r: 13, brand: null,        type: null,                         d: 577.7 },
      { w: 175, a: 70, r: 13, brand: null,        type: null,                         d: 575.2 },
      { w: 185, a: 65, r: 13, brand: null,        type: null,                         d: 570.7 },
      { w: 205, a: 60, r: 13, brand: null,        type: null,                         d: 576.2 },
      { w: 155, a: 70, r: 14, brand: null,        type: null,                         d: 572.6 },
      { w: 165, a: 65, r: 14, brand: null,        type: null,                         d: 570.1 },
      { w: 175, a: 60, r: 14, brand: null,        type: null,                         d: 565.6 },
      { w: 185, a: 55, r: 14, brand: null,        type: null,                         d: 559.1 },
      { w: 185, a: 60, r: 14, brand: null,        type: null,                         d: 577.6 },
      { w: 195, a: 55, r: 14, brand: null,        type: null,                         d: 570.1 },
      { w: 145, a: 65, r: 15, brand: null,        type: null,                         d: 569.5 },
      { w: 155, a: 60, r: 15, brand: null,        type: null,                         d: 567.0 },
      { w: 165, a: 55, r: 15, brand: null,        type: null,                         d: 562.5 },
      { w: 175, a: 55, r: 15, brand: 'Continental',type: 'ContiEcoContact EP 77T',    d: 573.5 },
      { w: 185, a: 50, r: 15, brand: null,        type: null,                         d: 566.0 },
      { w: 195, a: 50, r: 15, brand: 'LING LONG', type: 'Greenmax HP',                d: 576.0 },
      { w: 195, a: 50, r: 15, brand: 'RAPID',     type: 'P609 82V',                   d: 576.0 },
      { w: 195, a: 50, r: 15, brand: 'Riken',     type: 'Maystorm 2, 82V',            d: 576.0 },
      { w: 205, a: 45, r: 15, brand: 'TOYO',      type: 'Proxes T1 R 81V',            d: 565.5 },
      { w: 205, a: 45, r: 15, brand: 'STARMAXX',  type: 'Ultra Sport ST730 81V',      d: 565.5 },
      { w: 205, a: 40, r: 16, brand: 'NANKANG',   type: 'NS20 83V',                   d: 570.4 },
    ],
  },
];

// ── CALCULS ──────────────────────────────────────────────────────────────────

function calcTWD(width, aspect, rim) {
  return rim * 25.4 + 2 * (width * aspect / 100);
}

function findBestRing(mas) {
  const compatible = RINGS.filter(r => r.outerDiameter <= mas);
  if (!compatible.length) return null;
  compatible.sort((a, b) => b.outerDiameter - a.outerDiameter);
  return { ring: compatible[0], alternatives: compatible.slice(1) };
}

function sortedTires(ring) {
  return [...ring.tires].sort((a, b) => {
    const aNan = a.brand?.toUpperCase() === 'NANKANG' ? 0 : 1;
    const bNan = b.brand?.toUpperCase() === 'NANKANG' ? 0 : 1;
    if (aNan !== bNan) return aNan - bNan;
    if (b.r !== a.r) return b.r - a.r;   // plus grande jante
    if (a.a !== b.a) return a.a - b.a;   // aspect le plus bas
    return b.d - a.d;                    // diamètre le plus grand
  });
}

// ── COMPOSANT ────────────────────────────────────────────────────────────────

export function SetupConfiguratorModule() {
  const { isMobile } = useAppContext();
  const [mode, setMode] = useState('tire'); // 'tire' | 'measure'
  const [form, setForm] = useState({ marque: '', modele: '', annee: '', width: '', aspect: '', rim: '', masDirecte: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const calculate = () => {
    let mas, twd = null;

    if (mode === 'tire') {
      const w = parseInt(form.width), a = parseInt(form.aspect), r = parseInt(form.rim);
      if (!w || !a || !r || w < 100 || w > 400 || a < 20 || a > 100 || r < 10 || r > 24) {
        setError('Taille de pneu invalide. Format attendu : ex. 225 / 45 / 18');
        return;
      }
      twd = calcTWD(w, a, r);
      mas = twd + 20;
    } else {
      const m = parseFloat(form.masDirecte);
      if (!m || m < 300 || m > 900) {
        setError('Diamètre invalide. Saisissez la mesure en mm (ex. 660).');
        return;
      }
      mas = m;
    }

    setError('');
    const res = findBestRing(mas);
    const w = parseInt(form.width), a = parseInt(form.aspect), r = parseInt(form.rim);
    setResult({
      twd: twd ? Math.round(twd * 10) / 10 : null,
      mas: Math.round(mas * 10) / 10,
      mode,
      ...res,
      input: mode === 'tire' ? { w, a, r } : null,
    });
  };

  const reset = () => { setResult(null); setError(''); };

  const inputStyle = {
    background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8,
    padding: '10px 14px', color: THEME.text.primary, fontSize: 14, outline: 'none',
    fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Configurateur Setup"
        subtitle="Trouvez l'anneau, le pneu support et la jante idéaux pour votre véhicule"
      />

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px 12px' : '28px 32px' }}>

        {/* ── Formulaire ── */}
        {!result && (
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {/* Intro */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 32, padding: '16px 20px', borderRadius: 12, background: `${THEME.accent.orange}0A`, border: `1px solid ${THEME.accent.orange}22` }}>
              <span style={{ fontSize: 28, flexShrink: 0 }}>⚙</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', marginBottom: 4 }}>3 étapes pour votre setup parfait</div>
                <div style={{ fontSize: 12, color: THEME.text.muted, lineHeight: 1.7 }}>
                  Renseignez la <strong style={{ color: THEME.text.secondary }}>taille du pneu d'origine le plus grand</strong> de votre véhicule (visible sur l'autocollant dans le montant de porte conducteur) — le configurateur calcule automatiquement l'anneau, le pneu support et la jante compatibles.
                </div>
              </div>
            </div>

            {/* Véhicule (optionnel) */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Véhicule <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(facultatif)</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 120px', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: THEME.text.muted, display: 'block', marginBottom: 5 }}>Marque</label>
                  <input style={inputStyle} placeholder="BMW, Renault…" value={form.marque} onChange={e => set('marque', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.text.muted, display: 'block', marginBottom: 5 }}>Modèle</label>
                  <input style={inputStyle} placeholder="M3, Clio…" value={form.modele} onChange={e => set('modele', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.text.muted, display: 'block', marginBottom: 5 }}>Année</label>
                  <input style={inputStyle} placeholder="2020" value={form.annee} onChange={e => set('annee', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Taille pneu */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Taille du pneu d'origine <span style={{ color: THEME.accent.red, marginLeft: 2 }}>*</span></div>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 12 }}>Format : Largeur / Série / Diamètre jante — ex. <span style={{ color: THEME.accent.orange, fontWeight: 600 }}>225 / 45 / 18</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr 24px 1fr', gap: 0, alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: 11, color: THEME.text.muted, display: 'block', marginBottom: 5 }}>Largeur (mm)</label>
                  <input style={{ ...inputStyle, borderRadius: '8px 0 0 8px', borderRight: 'none' }} placeholder="225" value={form.width} onChange={e => set('width', e.target.value)} onKeyDown={e => e.key === 'Enter' && calculate()} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1, justifyContent: 'center', height: '100%', paddingTop: 20 }}>
                  <span style={{ fontSize: 20, color: THEME.text.muted, fontWeight: 300 }}>/</span>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.text.muted, display: 'block', marginBottom: 5 }}>Série (%)</label>
                  <input style={{ ...inputStyle, borderRadius: 0, borderRight: 'none' }} placeholder="45" value={form.aspect} onChange={e => set('aspect', e.target.value)} onKeyDown={e => e.key === 'Enter' && calculate()} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 1, justifyContent: 'center', height: '100%', paddingTop: 20 }}>
                  <span style={{ fontSize: 20, color: THEME.text.muted, fontWeight: 300 }}>/</span>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.text.muted, display: 'block', marginBottom: 5 }}>Jante (pouces)</label>
                  <input style={{ ...inputStyle, borderRadius: '0 8px 8px 0' }} placeholder="18" value={form.rim} onChange={e => set('rim', e.target.value)} onKeyDown={e => e.key === 'Enter' && calculate()} />
                </div>
              </div>
            </div>

            {error && <div style={{ fontSize: 12, color: THEME.accent.red, marginBottom: 12, padding: '8px 12px', background: `${THEME.accent.red}15`, borderRadius: 7, border: `1px solid ${THEME.accent.red}33` }}>{error}</div>}

            <Btn size="lg" onClick={calculate} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
              Calculer mon setup →
            </Btn>
          </div>
        )}

        {/* ── Résultats ── */}
        {result && (
          <div style={{ maxWidth: 860, margin: '0 auto' }}>

            {/* Header résultats */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>
                  Setup recommandé
                  {(form.marque || form.modele) && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text.muted, marginLeft: 12 }}>
                      — {[form.marque, form.modele, form.annee].filter(Boolean).join(' ')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: THEME.text.muted, marginTop: 4 }}>
                  Pneu d'origine : <span style={{ color: THEME.accent.orange, fontWeight: 700 }}>{result.input.w}/{result.input.a}/{result.input.r}</span>
                </div>
              </div>
              <button onClick={reset} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '8px 16px', color: THEME.text.secondary, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ← Modifier
              </button>
            </div>

            {/* Calcul TWD / MAS */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10, marginBottom: 28 }}>
              {[
                { label: 'Diamètre origine (TWD)', value: `${result.twd} mm`, color: THEME.text.primary },
                { label: 'Espace max. dispo (MAS)', value: `${Math.round((result.twd + 20) * 10) / 10} mm`, color: THEME.accent.orange, note: 'TWD + 20 mm' },
                { label: 'Anneau retenu', value: result.ring ? result.ring.ref : '—', color: result.ring ? THEME.accent.green : THEME.accent.red },
                { label: 'Diamètre ext. anneau', value: result.ring ? `${result.ring.outerDiameter} mm` : '—', color: result.ring ? THEME.accent.green : THEME.accent.red, note: result.ring ? `≤ ${Math.round(result.mas)} mm ✓` : 'Hors gamme' },
              ].map(s => (
                <div key={s.label} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, letterSpacing: '0.04em' }}>{s.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'Rajdhani, sans-serif' }}>{s.value}</div>
                  {s.note && <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 3 }}>{s.note}</div>}
                </div>
              ))}
            </div>

            {/* Aucun anneau compatible */}
            {!result.ring && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.accent.red }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Aucun anneau compatible</div>
                <div style={{ fontSize: 13, color: THEME.text.muted }}>Le diamètre de roue de votre véhicule ({result.twd} mm) est inférieur au plus petit anneau disponible (560 mm + 20 mm de marge = 580 mm min).</div>
              </div>
            )}

            {result.ring && (() => {
              const tires = sortedTires(result.ring);
              const topTires = tires.slice(0, 6);
              const nankangTires = tires.filter(t => t.brand?.toUpperCase() === 'NANKANG');
              const bestNankang = nankangTires[0];

              return (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, alignItems: 'start' }}>

                  {/* ── Étape 1 : Anneau ── */}
                  <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.green}0A`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: THEME.accent.green, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Anneau recommandé</span>
                    </div>
                    <div style={{ padding: '20px' }}>
                      <div style={{ fontSize: 28, fontWeight: 900, color: THEME.accent.green, fontFamily: 'Rajdhani, sans-serif', marginBottom: 4 }}>{result.ring.ref}</div>
                      <div style={{ fontSize: 12, color: THEME.text.muted, marginBottom: 16 }}>Ø ext. {result.ring.outerDiameter} mm · Ø int. {result.ring.innerDiameter} mm · Largeur {result.ring.width} mm</div>
                      <div style={{ fontSize: 12, color: THEME.text.secondary, lineHeight: 1.7, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: 8, borderLeft: `3px solid ${THEME.accent.green}55` }}>
                        Cet anneau s'insère dans votre passage de roue avec {Math.round(result.mas - result.ring.outerDiameter)} mm de marge.
                      </div>
                      {result.alternatives.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Alternatives compatibles</div>
                          {result.alternatives.map(r => (
                            <div key={r.ref} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: THEME.text.muted, padding: '5px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
                              <span>{r.ref}</span>
                              <span>Ø ext. {r.outerDiameter} mm</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Étape 2 : Pneu support ── */}
                  <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.orange}0A`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: THEME.accent.orange, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Pneu support</span>
                    </div>
                    <div style={{ padding: '16px 20px' }}>
                      {/* Top pick Nankang */}
                      {bestNankang && (
                        <div style={{ marginBottom: 16, padding: '14px 16px', borderRadius: 10, background: `${THEME.accent.orange}12`, border: `1px solid ${THEME.accent.orange}44` }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: THEME.accent.orange, textTransform: 'uppercase', letterSpacing: '0.06em' }}>⭐ Recommandé</span>
                            <span style={{ fontSize: 10, color: THEME.text.muted }}>Ø {bestNankang.d} mm</span>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 900, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif' }}>
                            {bestNankang.w}/{bestNankang.a}/{bestNankang.r}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary, marginTop: 2 }}>NANKANG {bestNankang.type}</div>
                        </div>
                      )}

                      {/* Liste des autres options */}
                      <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
                        {bestNankang ? 'Autres options testées' : 'Options compatibles'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {topTires.filter(t => t !== bestNankang).slice(0, 5).map((t, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)` }}>
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{t.w}/{t.a}/{t.r}</span>
                              {t.brand && <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 8 }}>{t.brand} {t.type}</span>}
                              {!t.brand && <span style={{ fontSize: 10, color: THEME.text.muted, marginLeft: 8, fontStyle: 'italic' }}>théorique</span>}
                            </div>
                            <span style={{ fontSize: 11, color: THEME.text.muted, flexShrink: 0, marginLeft: 8 }}>Ø {t.d}</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', fontSize: 11, color: THEME.text.muted, lineHeight: 1.6 }}>
                        <strong style={{ color: THEME.text.secondary }}>Règle :</strong> diamètre réel dégonflé entre +0,5% et +1,5% du diamètre intérieur de l'anneau. Préférer le profil le plus bas et le diamètre le plus proche du maximum.
                      </div>
                    </div>
                  </div>

                  {/* ── Étape 3 : Jante ── */}
                  <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden', gridColumn: isMobile ? '1' : '1 / -1' }}>
                    <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, background: `${THEME.accent.blue}0A`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: THEME.accent.blue, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>Jante</span>
                    </div>
                    <div style={{ padding: '20px', display: isMobile ? 'flex' : 'grid', gridTemplateColumns: '1fr 1fr 1fr', flexDirection: 'column', gap: 12 }}>
                      {[
                        { icon: '✓', color: THEME.accent.green, title: 'Jante d\'origine recommandée', desc: 'La solution idéale — déport (ET) et alésage central déjà adaptés à votre véhicule.' },
                        { icon: '⚠', color: THEME.accent.yellow, title: 'Jante alternative', desc: `Compatible avec une largeur de pneu support ${bestNankang ? bestNankang.w + ' mm' : 'proche de l\'origine'}. Vérifiez le déport (ET), l'alésage central et la garde au frein.` },
                        { icon: 'ℹ', color: THEME.accent.blue, title: 'Conseil de montage', desc: 'Si le système est monté sur un seul essieu, choisir un anneau proche du MAS pour éviter de modifier l\'assiette du véhicule.' },
                      ].map(item => (
                        <div key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 10, background: `${item.color}08`, border: `1px solid ${item.color}22` }}>
                          <span style={{ fontSize: 18, flexShrink: 0, color: item.color }}>{item.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 4 }}>{item.title}</div>
                            <div style={{ fontSize: 12, color: THEME.text.muted, lineHeight: 1.65 }}>{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </div>
  );
}
