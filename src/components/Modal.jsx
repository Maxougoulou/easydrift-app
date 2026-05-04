import { useEffect } from 'react';
import { THEME } from '../lib/theme';

export function Modal({ title, onClose, children, width = 520 }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(4px)', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 16, width: '100%', maxWidth: width, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.03em' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.muted, fontSize: 18, lineHeight: 1, padding: '2px 6px', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = THEME.text.primary}
            onMouseLeave={e => e.currentTarget.style.color = THEME.text.muted}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 11, color: THEME.text.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}{required && <span style={{ color: THEME.accent.orange, marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', required, min, max }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder} required={required} min={min} max={max}
      style={{ width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
    />
  );
}

export function Select({ value, onChange, children, required }) {
  return (
    <select
      value={value} onChange={onChange} required={required}
      style={{ width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer' }}
    >
      {children}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{ width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '9px 12px', color: THEME.text.primary, fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
    />
  );
}

export function FormActions({ onCancel, submitLabel = 'Enregistrer', loading }) {
  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 24px', borderTop: `1px solid ${THEME.border}` }}>
      <button type="button" onClick={onCancel} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '8px 18px', color: THEME.text.secondary, cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13 }}>
        Annuler
      </button>
      <button type="submit" disabled={loading} style={{ background: loading ? 'rgba(240,120,20,0.5)' : THEME.accent.orange, border: 'none', borderRadius: 8, padding: '8px 22px', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em' }}>
        {loading ? 'Enregistrement…' : submitLabel}
      </button>
    </div>
  );
}
