import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { THEME } from '../lib/theme';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  STEPS, UI, MOUNT_POSITIONS, TIRE_VIDEO_URL,
  t, isDisplayField, isFileField,
} from '../lib/savForm';

// Déclaration d'anneau défectueux — lien public /sav/:token, SANS compte.
// Remplace le Google Form : bilingue FR/EN, multi-étapes, pensé mobile.
// Le brouillon est sauvegardé sur l'appareil du client à chaque frappe :
// une coupure réseau sur un chantier ou un circuit ne lui fait rien perdre.

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const draftKey = (token) => `sav-draft-${token}`;

// ── Primitives de formulaire ─────────────────────────────────────────────────

function Field({ field, locale, error, children }) {
  const label = t(field.label, locale);
  const hint = t(field.hint, locale);
  return (
    <div style={{ marginBottom: 26 }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 15, fontWeight: 700, lineHeight: 1.4,
          color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif',
          letterSpacing: '0.01em', marginBottom: hint ? 4 : 10,
        }}>
          {label}
          {field.required && <span style={{ color: THEME.accent.orange, marginLeft: 5 }}>*</span>}
        </label>
      )}
      {hint && (
        <div style={{ fontSize: 12.5, color: THEME.text.secondary, lineHeight: 1.5, marginBottom: 10 }}>
          {hint}
        </div>
      )}
      {children}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginTop: 8,
          fontSize: 12.5, color: THEME.accent.red, fontWeight: 600,
        }}>
          <span style={{ fontSize: 13 }}>⚠</span>{error}
        </div>
      )}
    </div>
  );
}

const inputStyle = (invalid) => ({
  width: '100%', boxSizing: 'border-box',
  background: 'rgba(255,255,255,0.04)',
  border: `1px solid ${invalid ? THEME.accent.red : THEME.border}`,
  borderRadius: 12, padding: '14px 16px',
  color: THEME.text.primary, fontSize: 16, // 16px : empêche le zoom auto iOS
  fontFamily: 'inherit', outline: 'none',
  transition: 'border-color 0.15s, background 0.15s',
});

function TextInput({ field, value, onChange, invalid, locale, type = 'text' }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type}
      value={value ?? ''}
      inputMode={type === 'email' ? 'email' : undefined}
      autoComplete={type === 'email' ? 'email' : 'off'}
      placeholder={t(field.placeholder, locale)}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        ...inputStyle(invalid),
        borderColor: invalid ? THEME.accent.red : focus ? THEME.accent.orange : THEME.border,
        background: focus ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
      }}
    />
  );
}

function TextArea({ field, value, onChange, invalid, locale }) {
  const [focus, setFocus] = useState(false);
  return (
    <textarea
      rows={field.rows ?? 4}
      value={value ?? ''}
      placeholder={t(field.placeholder, locale)}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        ...inputStyle(invalid), resize: 'vertical', lineHeight: 1.55,
        borderColor: invalid ? THEME.accent.red : focus ? THEME.accent.orange : THEME.border,
      }}
    />
  );
}

function YesNo({ value, onChange, invalid, locale }) {
  const opts = [
    { v: 'yes', label: t(UI.yes, locale) },
    { v: 'no', label: t(UI.no, locale) },
  ];
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {opts.map(o => {
        const on = value === o.v;
        return (
          <button
            key={o.v} type="button" onClick={() => onChange(o.v)}
            style={{
              flex: 1, padding: '15px 10px', borderRadius: 12, cursor: 'pointer',
              border: `1.5px solid ${on ? THEME.accent.orange : invalid ? THEME.accent.red : THEME.border}`,
              background: on ? THEME.accent.orangeDim : 'rgba(255,255,255,0.03)',
              color: on ? THEME.accent.orange : THEME.text.secondary,
              fontSize: 15, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.04em', transition: 'all 0.15s',
            }}
          >{o.label}</button>
        );
      })}
    </div>
  );
}

function OtherInput({ value, onChange, locale }) {
  return (
    <input
      value={value ?? ''}
      placeholder={t(UI.otherSpec, locale)}
      onChange={e => onChange(e.target.value)}
      style={{
        ...inputStyle(false), marginTop: 10, fontSize: 15,
        padding: '12px 14px', background: 'rgba(240,120,20,0.06)',
        borderColor: `${THEME.accent.orange}55`,
      }}
    />
  );
}

function RadioList({ field, value, other, onChange, onOther, invalid, locale }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {field.options.map(o => {
        const on = value === o.value;
        return (
          <button
            key={o.value} type="button" onClick={() => onChange(o.value)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              border: `1.5px solid ${on ? THEME.accent.orange : invalid ? `${THEME.accent.red}80` : THEME.border}`,
              background: on ? THEME.accent.orangeDim : 'rgba(255,255,255,0.03)',
              color: on ? THEME.text.primary : THEME.text.secondary,
              fontSize: 14.5, fontWeight: on ? 700 : 500, fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${on ? THEME.accent.orange : THEME.text.muted}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {on && <span style={{ width: 10, height: 10, borderRadius: '50%', background: THEME.accent.orange }} />}
            </span>
            {t(o.label, locale)}
          </button>
        );
      })}
      {field.allowOther && value === 'autre' && (
        <OtherInput value={other} onChange={onOther} locale={locale} />
      )}
    </div>
  );
}

function Chips({ field, value, other, onChange, onOther, invalid, locale }) {
  const arr = Array.isArray(value) ? value : [];
  const toggle = (v) => onChange(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {field.options.map(o => {
          const on = arr.includes(o.value);
          return (
            <button
              key={o.value} type="button" onClick={() => toggle(o.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '11px 15px', borderRadius: 999, cursor: 'pointer',
                border: `1.5px solid ${on ? THEME.accent.orange : invalid ? `${THEME.accent.red}80` : THEME.border}`,
                background: on ? THEME.accent.orangeDim : 'rgba(255,255,255,0.03)',
                color: on ? THEME.accent.orange : THEME.text.secondary,
                fontSize: 14, fontWeight: on ? 700 : 500, fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
            >
              {o.icon && <span style={{ fontSize: 14 }}>{o.icon}</span>}
              {t(o.label, locale)}
            </button>
          );
        })}
      </div>
      {field.allowOther && arr.includes('autre') && (
        <OtherInput value={other} onChange={onOther} locale={locale} />
      )}
    </div>
  );
}

// Curseur d'usure : la couleur passe du vert (neuf) au rouge (usé).
function Scale({ field, value, onChange, invalid, locale }) {
  const { min = 0, max = 10 } = field;
  const sel = value === undefined || value === null || value === '' ? null : Number(value);
  const colorFor = (n) => {
    const r = (n - min) / (max - min);
    if (r <= 0.33) return THEME.accent.green;
    if (r <= 0.66) return THEME.accent.yellow;
    return THEME.accent.red;
  };
  const cur = sel === null ? THEME.text.muted : colorFor(sel);
  const steps = [];
  for (let i = min; i <= max; i++) steps.push(i);

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, fontSize: 11.5, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.07em',
      }}>
        <span style={{ color: THEME.accent.green }}>{t(field.minLabel, locale)}</span>
        <span style={{
          fontSize: 26, fontFamily: 'Rajdhani, sans-serif', fontWeight: 800,
          color: cur, letterSpacing: 0,
        }}>{sel === null ? '—' : sel}</span>
        <span style={{ color: THEME.accent.red }}>{t(field.maxLabel, locale)}</span>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 4,
      }}>
        {steps.map(n => {
          const on = sel !== null && n <= sel;
          const isSel = sel === n;
          return (
            <button
              key={n} type="button" onClick={() => onChange(n)}
              aria-label={String(n)}
              style={{
                height: 46, borderRadius: 8, cursor: 'pointer', padding: 0,
                border: `1.5px solid ${isSel ? colorFor(n) : invalid ? `${THEME.accent.red}60` : THEME.border}`,
                background: on ? `${colorFor(n)}${isSel ? '44' : '22'}` : 'rgba(255,255,255,0.03)',
                color: on ? colorFor(n) : THEME.text.muted,
                fontSize: 13, fontWeight: isSel ? 800 : 600,
                fontFamily: 'Rajdhani, sans-serif', transition: 'all 0.12s',
              }}
            >{n}</button>
          );
        })}
      </div>
    </div>
  );
}

function Temperature({ value, onChange, locale }) {
  const v = typeof value === 'object' && value !== null ? value : { value: '', unit: 'C' };
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <input
        type="number" inputMode="decimal" value={v.value ?? ''}
        placeholder={locale === 'fr' ? 'ex. 18' : 'e.g. 18'}
        onChange={e => onChange({ ...v, value: e.target.value })}
        style={{ ...inputStyle(false), flex: 1 }}
      />
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {['C', 'F'].map(u => {
          const on = v.unit === u;
          return (
            <button
              key={u} type="button" onClick={() => onChange({ ...v, unit: u })}
              style={{
                width: 56, borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${on ? THEME.accent.orange : THEME.border}`,
                background: on ? THEME.accent.orangeDim : 'rgba(255,255,255,0.03)',
                color: on ? THEME.accent.orange : THEME.text.secondary,
                fontSize: 15, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif',
                transition: 'all 0.15s',
              }}
            >°{u}</button>
          );
        })}
      </div>
    </div>
  );
}

// Vue de dessus du véhicule : le client touche directement la roue concernée,
// bien plus clair qu'une liste « avant droit / arrière gauche ».
function Wheels({ value, onChange, invalid, locale }) {
  const W = 200, H = 290;
  const wheel = { w: 30, h: 62 };
  const pos = {
    front_left:  { x: 14,            y: 44 },
    front_right: { x: W - 14 - wheel.w, y: 44 },
    rear_left:   { x: 14,            y: H - 44 - wheel.h },
    rear_right:  { x: W - 14 - wheel.w, y: H - 44 - wheel.h },
  };

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'center',
        padding: '8px 0 14px',
      }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ maxWidth: '100%', height: 'auto' }}>
          {/* Carrosserie vue de dessus */}
          <rect
            x="38" y="16" width={W - 76} height={H - 32} rx="34"
            fill="rgba(255,255,255,0.045)" stroke={invalid ? `${THEME.accent.red}80` : THEME.border} strokeWidth="1.5"
          />
          {/* Pare-brise + lunette arrière, pour donner le sens de marche */}
          <path d={`M 56 74 Q ${W / 2} 54 ${W - 56} 74 L ${W - 62} 104 Q ${W / 2} 92 62 104 Z`} fill="rgba(255,255,255,0.05)" />
          <path d={`M 60 ${H - 104} Q ${W / 2} ${H - 92} ${W - 60} ${H - 104} L ${W - 56} ${H - 74} Q ${W / 2} ${H - 56} 56 ${H - 74} Z`} fill="rgba(255,255,255,0.035)" />
          <text x={W / 2} y="40" textAnchor="middle" fill={THEME.text.muted} fontSize="10" fontWeight="700" letterSpacing="2.5">
            {locale === 'fr' ? 'AVANT' : 'FRONT'}
          </text>

          {MOUNT_POSITIONS.map(p => {
            const on = value === p.value;
            const { x, y } = pos[p.value];
            return (
              <g key={p.value} onClick={() => onChange(p.value)} style={{ cursor: 'pointer' }}>
                {/* Zone tactile généreuse autour de la roue */}
                <rect x={x - 12} y={y - 12} width={wheel.w + 24} height={wheel.h + 24} fill="transparent" />
                {on && (
                  <rect
                    x={x - 7} y={y - 7} width={wheel.w + 14} height={wheel.h + 14} rx="14"
                    fill={`${THEME.accent.orange}22`} stroke={`${THEME.accent.orange}66`} strokeWidth="1.5"
                  />
                )}
                <rect
                  x={x} y={y} width={wheel.w} height={wheel.h} rx="9"
                  fill={on ? THEME.accent.orange : 'rgba(255,255,255,0.1)'}
                  stroke={on ? THEME.accent.orangeLight : THEME.border}
                  strokeWidth="1.5"
                  style={{ transition: 'fill 0.15s' }}
                />
                {on && (
                  <text x={x + wheel.w / 2} y={y + wheel.h / 2 + 6} textAnchor="middle" fill="#fff" fontSize="17" fontWeight="800">✓</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {value && (
        <div style={{
          textAlign: 'center', fontSize: 14, fontWeight: 700,
          color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif',
          letterSpacing: '0.04em',
        }}>
          {t(MOUNT_POSITIONS.find(p => p.value === value)?.label, locale)}
        </div>
      )}
    </div>
  );
}

// Schéma de l'anneau : où trouver les marquages à photographier.
function RingDiagram({ locale }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: `1px solid ${THEME.border}`,
      borderRadius: 14, padding: '16px 14px', marginBottom: 26,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: THEME.accent.orange,
        textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, textAlign: 'center',
      }}>
        {locale === 'fr' ? 'Repérer les marquages' : 'Finding the markings'}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <svg width="230" height="150" viewBox="0 0 230 150" style={{ maxWidth: '100%', height: 'auto' }}>
          {/* Anneau vu de trois quarts */}
          <ellipse cx="115" cy="75" rx="82" ry="52" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="15" />
          <ellipse cx="115" cy="75" rx="82" ry="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          <ellipse cx="115" cy="75" rx="56" ry="33" fill={THEME.bg.app} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

          {/* Marquage 1 — coulée */}
          <rect x="52" y="40" width="17" height="11" rx="2.5" fill={THEME.accent.orange} />
          <line x1="52" y1="40" x2="22" y2="20" stroke={THEME.accent.orange} strokeWidth="1.3" />
          <circle cx="22" cy="20" r="2.5" fill={THEME.accent.orange} />

          {/* Marquage 2 — usinage */}
          <rect x="166" y="86" width="12" height="9" rx="2.5" fill={THEME.accent.blue} />
          <line x1="178" y1="92" x2="208" y2="118" stroke={THEME.accent.blue} strokeWidth="1.3" />
          <circle cx="208" cy="118" r="2.5" fill={THEME.accent.blue} />
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: THEME.text.secondary }}>
          <span style={{ width: 13, height: 9, borderRadius: 2, background: THEME.accent.orange, flexShrink: 0 }} />
          {t(UI.castingTag, locale)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, color: THEME.text.secondary }}>
          <span style={{ width: 13, height: 9, borderRadius: 2, background: THEME.accent.blue, flexShrink: 0 }} />
          {t(UI.machiningTag, locale)}
        </div>
      </div>
      <div style={{ fontSize: 12, color: THEME.text.muted, marginTop: 11, lineHeight: 1.5, textAlign: 'center' }}>
        {t(UI.ringHelp, locale)}
      </div>
    </div>
  );
}

function VideoLink({ field, locale }) {
  return (
    <a
      href={TIRE_VIDEO_URL} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 13, marginBottom: 26,
        padding: '14px 16px', borderRadius: 12, textDecoration: 'none',
        background: 'rgba(239,68,68,0.07)', border: `1px solid ${THEME.accent.red}33`,
      }}
    >
      <span style={{
        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
        background: THEME.accent.red, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
      }}>▶</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif' }}>
          {t(field.label, locale)}
        </span>
        <span style={{ display: 'block', fontSize: 12, color: THEME.text.muted, marginTop: 1 }}>
          {t(UI.watchVideo, locale)} · YouTube
        </span>
      </span>
      <span style={{ color: THEME.text.muted, fontSize: 16 }}>↗</span>
    </a>
  );
}

// Dépôt de fichiers : envoi immédiat vers Supabase Storage, vignette, retrait.
function FilesInput({ field, files, onChange, invalid, locale, token }) {
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState(null);
  const inputRef = useRef(null);
  const list = files ?? [];
  const full = list.length >= field.max;

  const pick = async (e) => {
    const chosen = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!chosen.length) return;
    setErr(null);

    const room = field.max - list.length;
    if (room <= 0) { setErr(t(UI.maxFiles, locale)); return; }
    const batch = chosen.slice(0, room);
    if (chosen.length > room) setErr(t(UI.maxFiles, locale));

    setBusy(b => b + batch.length);
    for (const file of batch) {
      if (file.size > MAX_FILE_BYTES) {
        setErr(t(UI.fileTooBig, locale));
        setBusy(b => b - 1);
        continue;
      }
      const safe = file.name
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `sav/${token}/${field.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
      const { error } = await supabase.storage.from('vehicle-files').upload(path, file);
      if (error) {
        setErr(t(UI.uploadFailed, locale));
      } else {
        const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
        onChange(prev => [...(prev ?? []), {
          url: pub.publicUrl, name: file.name, type: file.type, size: file.size,
        }]);
      }
      setBusy(b => b - 1);
    }
  };

  const remove = (url) => onChange(prev => (prev ?? []).filter(f => f.url !== url));

  return (
    <div>
      {list.length > 0 && (
        <div style={{
          display: 'grid', gap: 8, marginBottom: 10,
          gridTemplateColumns: 'repeat(auto-fill, minmax(92px, 1fr))',
        }}>
          {list.map(f => (
            <div key={f.url} style={{
              position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.border}`,
            }}>
              {f.type?.startsWith('image/') ? (
                <img src={f.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 5, padding: 6,
                }}>
                  <span style={{ fontSize: 20 }}>{f.type?.startsWith('video/') ? '🎬' : '📄'}</span>
                  <span style={{
                    fontSize: 9, color: THEME.text.muted, textAlign: 'center',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
                  }}>{f.name}</span>
                </div>
              )}
              <button
                type="button" onClick={() => remove(f.url)} aria-label="×"
                style={{
                  position: 'absolute', top: 4, right: 4, width: 24, height: 24,
                  borderRadius: '50%', border: 'none', cursor: 'pointer',
                  background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}
              >×</button>
            </div>
          ))}
          {busy > 0 && Array.from({ length: busy }).map((_, i) => (
            <div key={`busy-${i}`} style={{
              aspectRatio: '1', borderRadius: 10,
              border: `1px dashed ${THEME.accent.orange}66`,
              background: 'rgba(240,120,20,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: THEME.accent.orange, fontWeight: 600,
            }}>{t(UI.uploading, locale)}</div>
          ))}
        </div>
      )}

      {!full && (
        <>
          <input
            ref={inputRef} type="file" accept={field.accept}
            multiple={field.max > 1} onChange={pick} style={{ display: 'none' }}
          />
          <button
            type="button" onClick={() => inputRef.current?.click()}
            style={{
              width: '100%', padding: '16px', borderRadius: 12, cursor: 'pointer',
              border: `1.5px dashed ${invalid ? THEME.accent.red : `${THEME.accent.orange}66`}`,
              background: invalid ? 'rgba(239,68,68,0.05)' : 'rgba(240,120,20,0.05)',
              color: THEME.accent.orange, fontSize: 14.5, fontWeight: 700,
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span style={{ fontSize: 17 }}>＋</span>
            {t(field.max > 1 ? UI.addFiles : UI.addFile, locale)}
            <span style={{ color: THEME.text.muted, fontWeight: 600, fontSize: 12.5 }}>
              {list.length}/{field.max}
            </span>
          </button>
        </>
      )}

      {err && (
        <div style={{ fontSize: 12.5, color: THEME.accent.red, marginTop: 8, fontWeight: 600 }}>{err}</div>
      )}
    </div>
  );
}

// ── Coquille de page ─────────────────────────────────────────────────────────

// index.html pose `body { overflow: hidden }` : le viewport ne defile pas.
// Chaque page publique doit donc porter son propre conteneur de defilement,
// comme le font deja FichePublique et VehiculePublique. Sans cela le
// formulaire est fige sur son premier ecran, inutilisable au doigt.
const SCROLL_ID = 'sav-scroll';
const scrollTop = () => document.getElementById(SCROLL_ID)?.scrollTo({ top: 0, behavior: 'smooth' });

function Shell({ children, locale, setLocale, progress }) {
  return (
    <div id={SCROLL_ID} style={{
      height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      background: THEME.bg.app,
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: THEME.text.primary,
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20, background: THEME.bg.sidebar,
        borderBottom: `1px solid ${THEME.border}`,
      }}>
        <div style={{
          maxWidth: 680, margin: '0 auto', padding: '11px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <img src="/logo-easydrift.png" alt="EASYDRIFT" style={{ height: 22, display: 'block' }} />
          <div style={{ flex: 1 }} />
          {setLocale && (
            <div style={{
              display: 'flex', background: 'rgba(255,255,255,0.06)',
              borderRadius: 999, padding: 3, gap: 2,
            }}>
              {['fr', 'en'].map(l => {
                const on = locale === l;
                return (
                  <button
                    key={l} type="button" onClick={() => setLocale(l)}
                    style={{
                      padding: '5px 13px', borderRadius: 999, border: 'none', cursor: 'pointer',
                      background: on ? THEME.accent.orange : 'transparent',
                      color: on ? '#fff' : THEME.text.secondary,
                      fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em',
                      fontFamily: 'Rajdhani, sans-serif', transition: 'all 0.15s',
                    }}
                  >{l.toUpperCase()}</button>
                );
              })}
            </div>
          )}
        </div>
        {progress !== undefined && (
          <div style={{ height: 3, background: 'rgba(255,255,255,0.06)' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: `linear-gradient(90deg, ${THEME.accent.orange}, ${THEME.accent.orangeLight})`,
              transition: 'width 0.35s ease',
            }} />
          </div>
        )}
      </header>
      <main style={{ maxWidth: 680, margin: '0 auto', padding: '0 16px' }}>
        {children}
      </main>
    </div>
  );
}

function Centered({ icon, title, body, tone = THEME.accent.orange }) {
  return (
    <div style={{ textAlign: 'center', padding: '70px 10px 90px' }}>
      <div style={{
        width: 74, height: 74, borderRadius: '50%', margin: '0 auto 22px',
        background: `${tone}18`, border: `1.5px solid ${tone}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
      }}>{icon}</div>
      <div style={{
        fontSize: 22, fontWeight: 800, color: THEME.text.primary,
        fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.01em', marginBottom: 10,
      }}>{title}</div>
      <div style={{
        fontSize: 14.5, color: THEME.text.secondary, lineHeight: 1.6,
        maxWidth: 400, margin: '0 auto',
      }}>{body}</div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function SavPublique({ token }) {
  const isMobile = useIsMobile();
  const [locale, setLocale] = useState('fr');
  const [state, setState] = useState('loading'); // loading | intro | form | done | already | notfound
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [stepError, setStepError] = useState(null);
  const [sending, setSending] = useState(false);
  const [restored, setRestored] = useState(false);
  const topRef = useRef(null);

  // Chargement + brouillon local
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('sav_public_get', { p_token: token });
      if (error || !data) { setState('notfound'); return; }

      const saved = (() => {
        try { return JSON.parse(localStorage.getItem(draftKey(token)) ?? 'null'); } catch { return null; }
      })();

      setLocale(saved?.locale ?? data.locale ?? 'fr');

      if (data.submitted_at) { setState('already'); return; }

      if (saved) {
        setAnswers(saved.answers ?? {});
        setFiles(saved.files ?? {});
        setStepIdx(Math.min(saved.stepIdx ?? 0, STEPS.length - 1));
        setRestored(true);
      } else if (data.client_email) {
        setAnswers({ email: data.client_email });
      }
      setState('intro');
    })();
  }, [token]);

  // Sauvegarde du brouillon à chaque frappe : une coupure réseau ne perd rien.
  useEffect(() => {
    if (state !== 'form' && state !== 'intro') return;
    try {
      localStorage.setItem(draftKey(token), JSON.stringify({ answers, files, stepIdx, locale }));
    } catch { /* quota plein ou navigation privée : on continue sans brouillon */ }
  }, [answers, files, stepIdx, locale, state, token]);

  const setAnswer = useCallback((id, v) => {
    setAnswers(a => ({ ...a, [id]: v }));
    setErrors(e => (e[id] ? { ...e, [id]: undefined } : e));
  }, []);

  const setFileField = useCallback((id, updater) => {
    setFiles(f => ({ ...f, [id]: typeof updater === 'function' ? updater(f[id]) : updater }));
    setErrors(e => (e[id] ? { ...e, [id]: undefined } : e));
  }, []);

  const step = STEPS[stepIdx];

  const validateStep = () => {
    const next = {};
    for (const f of step.fields) {
      if (isDisplayField(f) || !f.required) continue;
      const v = isFileField(f) ? files[f.id] : answers[f.id];
      const empty = v === undefined || v === null || v === ''
        || (Array.isArray(v) && v.length === 0)
        || (f.type === 'temperature' && !v?.value);
      if (empty) { next[f.id] = t(UI.errRequired, locale); continue; }
      if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim())) {
        next[f.id] = t(UI.errEmail, locale);
      }
    }
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    setStepError(ok ? null : t(UI.errStep, locale));
    if (!ok) {
      const firstId = Object.keys(next)[0];
      document.getElementById(`sav-${firstId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return ok;
  };

  const goTo = (i) => {
    setStepIdx(i);
    setStepError(null);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const next = () => {
    if (!validateStep()) return;
    if (stepIdx < STEPS.length - 1) goTo(stepIdx + 1);
    else submit();
  };

  const submit = async () => {
    setSending(true);
    setStepError(null);

    // Les fichiers sont déjà en ligne : on envoie la liste à plat avec le champ d'origine.
    const flat = Object.entries(files).flatMap(([fieldId, arr]) =>
      (arr ?? []).map(f => ({ field: fieldId, ...f }))
    );

    const { data, error } = await supabase.rpc('sav_public_submit', {
      p_token: token, p_locale: locale, p_reponses: answers, p_fichiers: flat,
    });

    setSending(false);

    if (error || !data?.ok) {
      if (data?.error === 'already_submitted') {
        try { localStorage.removeItem(draftKey(token)); } catch { /* ignore */ }
        setState('already');
        return;
      }
      setStepError(t(UI.errSubmit, locale));
      return;
    }

    try { localStorage.removeItem(draftKey(token)); } catch { /* ignore */ }
    setState('done');
    scrollTop();
  };

  // ── États hors formulaire ──
  if (state === 'loading') {
    return <Shell locale={locale}><div style={{ textAlign: 'center', padding: 80, color: THEME.text.muted }}>{t(UI.loading, locale)}</div></Shell>;
  }
  if (state === 'notfound') {
    return <Shell locale={locale} setLocale={setLocale}><Centered icon="🔍" tone={THEME.text.muted} title={t(UI.nfTitle, locale)} body={t(UI.nfBody, locale)} /></Shell>;
  }
  if (state === 'already') {
    return <Shell locale={locale} setLocale={setLocale}><Centered icon="✓" tone={THEME.accent.green} title={t(UI.alreadyTitle, locale)} body={t(UI.alreadyBody, locale)} /></Shell>;
  }
  if (state === 'done') {
    return <Shell locale={locale} setLocale={setLocale}><Centered icon="✓" tone={THEME.accent.green} title={t(UI.doneTitle, locale)} body={t(UI.doneBody, locale)} /></Shell>;
  }

  // ── Écran d'accueil ──
  if (state === 'intro') {
    return (
      <Shell locale={locale} setLocale={setLocale}>
        <div style={{ padding: '36px 0 60px' }}>
          <div style={{
            fontSize: 11, fontWeight: 800, color: THEME.accent.orange,
            textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12,
          }}>{t(UI.brandLine, locale)}</div>

          <h1 style={{
            fontSize: isMobile ? 27 : 33, fontWeight: 800, lineHeight: 1.15, margin: '0 0 18px',
            fontFamily: 'Rajdhani, sans-serif', color: THEME.text.primary, letterSpacing: '0.01em',
          }}>{t(UI.introTitle, locale)}</h1>

          <p style={{ fontSize: 15, lineHeight: 1.65, color: THEME.text.secondary, margin: '0 0 24px' }}>
            {t(UI.introBody, locale)}
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 9, marginBottom: 26,
            padding: '12px 15px', borderRadius: 11,
            background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}`,
            fontSize: 13, color: THEME.text.secondary,
          }}>
            <span style={{ fontSize: 15 }}>⏱</span>{t(UI.introTime, locale)}
          </div>

          {/* Sommaire des étapes : le client sait à quoi s'attendre */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginBottom: 26 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '11px 4px',
                borderBottom: i < STEPS.length - 1 ? `1px solid ${THEME.border}` : 'none',
              }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)', color: THEME.text.muted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11.5, fontWeight: 800, fontFamily: 'Rajdhani, sans-serif',
                }}>{i + 1}</span>
                <span style={{ fontSize: 14.5, color: THEME.text.secondary, fontWeight: 500 }}>
                  {t(s.title, locale)}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => { setState('form'); scrollTop(); }}
            style={{
              width: '100%', padding: '17px', borderRadius: 13, border: 'none', cursor: 'pointer',
              background: THEME.accent.orange, color: '#fff',
              fontSize: 16, fontWeight: 800, fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.05em', boxShadow: '0 8px 22px rgba(240,120,20,0.26)',
            }}
          >
            {restored
              ? (locale === 'fr' ? 'Reprendre où j’en étais' : 'Resume where I left off')
              : t(UI.introStart, locale)}
          </button>

          <div style={{ fontSize: 12.5, color: THEME.text.muted, marginTop: 14, textAlign: 'center', lineHeight: 1.5 }}>
            {t(UI.introTip, locale)}
          </div>
        </div>
      </Shell>
    );
  }

  // ── Formulaire ──
  const isLast = stepIdx === STEPS.length - 1;
  const progress = ((stepIdx + 1) / STEPS.length) * 100;

  return (
    <Shell locale={locale} setLocale={setLocale} progress={progress}>
      <div ref={topRef} style={{ paddingTop: 22 }} />

      {/* Pastilles d'étapes — cliquables vers l'arrière uniquement */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const cur = i === stepIdx;
          return (
            <button
              key={s.id} type="button"
              onClick={() => { if (i < stepIdx) goTo(i); }}
              aria-label={t(s.title, locale)}
              style={{
                flex: 1, height: 4, borderRadius: 2, border: 'none', padding: 0,
                cursor: done ? 'pointer' : 'default',
                background: cur ? THEME.accent.orange : done ? `${THEME.accent.orange}66` : 'rgba(255,255,255,0.08)',
                transition: 'background 0.25s',
              }}
            />
          );
        })}
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, color: THEME.text.muted,
        textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 7,
      }}>
        {t(UI.step, locale)} {stepIdx + 1} {t(UI.of, locale)} {STEPS.length}
      </div>

      <h2 style={{
        fontSize: isMobile ? 23 : 27, fontWeight: 800, margin: '0 0 7px',
        fontFamily: 'Rajdhani, sans-serif', color: THEME.text.primary,
        letterSpacing: '0.01em', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 22 }}>{step.icon}</span>
        {t(step.title, locale)}
      </h2>

      {step.subtitle && (
        <p style={{ fontSize: 14, color: THEME.text.secondary, lineHeight: 1.55, margin: '0 0 26px' }}>
          {t(step.subtitle, locale)}
        </p>
      )}

      {/* Champs */}
      <div>
        {step.fields.map(f => {
          if (f.type === 'ringDiagram') return <RingDiagram key={f.id} locale={locale} />;
          if (f.type === 'videoLink') return <VideoLink key={f.id} field={f} locale={locale} />;

          const err = errors[f.id];
          const invalid = Boolean(err);
          const val = answers[f.id];
          const other = answers[`${f.id}_autre`];
          const set = (v) => setAnswer(f.id, v);
          const setOther = (v) => setAnswer(`${f.id}_autre`, v);

          let control;
          switch (f.type) {
            case 'textarea':
              control = <TextArea field={f} value={val} onChange={set} invalid={invalid} locale={locale} />; break;
            case 'yesno':
              control = <YesNo value={val} onChange={set} invalid={invalid} locale={locale} />; break;
            case 'radio':
              control = <RadioList field={f} value={val} other={other} onChange={set} onOther={setOther} invalid={invalid} locale={locale} />; break;
            case 'chips':
              control = <Chips field={f} value={val} other={other} onChange={set} onOther={setOther} invalid={invalid} locale={locale} />; break;
            case 'scale':
              control = <Scale field={f} value={val} onChange={set} invalid={invalid} locale={locale} />; break;
            case 'temperature':
              control = <Temperature value={val} onChange={set} locale={locale} />; break;
            case 'wheels':
              control = <Wheels value={val} onChange={set} invalid={invalid} locale={locale} />; break;
            case 'files':
              control = <FilesInput field={f} files={files[f.id]} onChange={(u) => setFileField(f.id, u)} invalid={invalid} locale={locale} token={token} />; break;
            case 'date':
              control = <TextInput field={f} value={val} onChange={set} invalid={invalid} locale={locale} type="date" />; break;
            case 'email':
              control = <TextInput field={f} value={val} onChange={set} invalid={invalid} locale={locale} type="email" />; break;
            default:
              control = <TextInput field={f} value={val} onChange={set} invalid={invalid} locale={locale} />;
          }

          return (
            <div key={f.id} id={`sav-${f.id}`}>
              <Field field={f} locale={locale} error={err}>{control}</Field>
            </div>
          );
        })}
      </div>

      {stepError && (
        <div style={{
          padding: '12px 15px', borderRadius: 11, marginBottom: 14,
          background: 'rgba(239,68,68,0.09)', border: `1px solid ${THEME.accent.red}44`,
          color: THEME.accent.red, fontSize: 13.5, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚠</span>{stepError}
        </div>
      )}

      <div style={{
        fontSize: 11.5, color: THEME.text.muted, textAlign: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        padding: '4px 0 16px',
      }}>
        <span style={{ color: THEME.accent.green }}>✓</span>{t(UI.draftSaved, locale)}
      </div>

      {/* Barre d'action collée en bas */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 15,
        background: `linear-gradient(to top, ${THEME.bg.app} 70%, transparent)`,
        padding: `14px 0 calc(env(safe-area-inset-bottom, 0px) + 16px)`,
        display: 'flex', gap: 10,
      }}>
        {stepIdx > 0 && (
          <button
            type="button" onClick={() => goTo(stepIdx - 1)} disabled={sending}
            style={{
              padding: '16px 22px', borderRadius: 13, cursor: sending ? 'default' : 'pointer',
              border: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.05)',
              color: THEME.text.secondary, fontSize: 15, fontWeight: 700,
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em', flexShrink: 0,
            }}
          >← {t(UI.back, locale)}</button>
        )}
        <button
          type="button" onClick={next} disabled={sending}
          style={{
            flex: 1, padding: '16px', borderRadius: 13, border: 'none',
            cursor: sending ? 'default' : 'pointer',
            background: sending ? THEME.text.muted : isLast ? THEME.accent.green : THEME.accent.orange,
            color: '#fff', fontSize: 16, fontWeight: 800,
            fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em',
            boxShadow: sending ? 'none' : `0 8px 22px ${isLast ? 'rgba(34,197,94,0.26)' : 'rgba(240,120,20,0.26)'}`,
            transition: 'background 0.2s',
          }}
        >
          {sending ? t(UI.sending, locale) : isLast ? t(UI.submit, locale) : `${t(UI.next, locale)} →`}
        </button>
      </div>
    </Shell>
  );
}
