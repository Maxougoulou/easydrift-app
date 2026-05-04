import { useState } from 'react';
import { THEME, STATUS_CONFIG, PRIORITY_CONFIG } from '../lib/theme';

export function Avatar({ member, size = 32, showName = false }) {
  if (!member) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `${member.color}22`,
        border: `1.5px solid ${member.color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, color: member.color,
        flexShrink: 0, fontFamily: 'Rajdhani, sans-serif',
      }}>
        {member.avatar}
      </div>
      {showName && <span style={{ fontSize: 13, color: THEME.text.secondary }}>{member.name}</span>}
    </div>
  );
}

export function StatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status] || { color: '#8A8790', bg: 'rgba(138,135,144,0.12)', dot: '#8A8790' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: small ? '2px 7px' : '3px 10px',
      borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 600,
      background: cfg.bg, color: cfg.color,
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      border: `1px solid ${cfg.color}33`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || { color: '#8A8790', label: priority };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

export function ProgressBar({ value, color = '#F07814', height = 4 }) {
  return (
    <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.08)', borderRadius: height }}>
      <div style={{
        width: `${Math.min(value, 100)}%`, height: '100%', borderRadius: height,
        background: value >= 100 ? '#22C55E' : `linear-gradient(90deg, ${color}, ${color}CC)`,
        transition: 'width 0.5s ease',
      }} />
    </div>
  );
}

export function Card({ children, style = {}, onClick, hover = true }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => hover && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: isHovered && hover ? THEME.bg.cardHover : THEME.bg.card,
        border: `1px solid ${isHovered && hover ? 'rgba(240,120,20,0.2)' : THEME.border}`,
        borderRadius: 12, padding: 20,
        transition: 'all 0.18s ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({ children, variant = 'primary', size = 'md', onClick, style: extraStyle = {}, type = 'button' }) {
  const [hov, setHov] = useState(false);
  const base = {
    border: 'none', borderRadius: 8, cursor: 'pointer',
    fontFamily: 'Rajdhani, sans-serif', fontWeight: 700,
    letterSpacing: '0.04em', transition: 'all 0.15s ease',
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: size === 'sm' ? 12 : size === 'lg' ? 15 : 13,
    padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '12px 24px' : '8px 16px',
  };
  const variants = {
    primary: { background: hov ? '#FF9A3C' : THEME.accent.orange, color: '#fff' },
    secondary: { background: hov ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)', color: THEME.text.primary, border: `1px solid ${THEME.border}` },
    ghost: { background: 'transparent', color: THEME.text.secondary },
    danger: { background: hov ? '#dc2626' : THEME.accent.red, color: '#fff' },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variants[variant], ...extraStyle }}
    >{children}</button>
  );
}

export function Spinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100%', width: '100%',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: `3px solid rgba(255,255,255,0.1)`,
        borderTop: `3px solid ${THEME.accent.orange}`,
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
