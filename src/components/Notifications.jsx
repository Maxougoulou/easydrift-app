import { useState, useRef, useEffect } from 'react';
import { THEME } from '../lib/theme';

export function NotificationBell({ notifications, unreadCount, onMarkAllRead, onMarkRead, onNavigate }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const typeIcon = { mention: '💬', task: '✅', email: '📧', info: 'ℹ️' };
  const typeColor = { mention: THEME.accent.orange, task: THEME.accent.green, email: THEME.accent.blue };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: open ? THEME.accent.orangeDim : 'transparent',
          border: `1px solid ${open ? THEME.accent.orange + '44' : 'transparent'}`,
          cursor: 'pointer', color: open ? THEME.accent.orange : THEME.text.secondary,
          fontSize: 17, padding: '6px 8px', borderRadius: 8,
          position: 'relative', transition: 'all 0.15s', display: 'flex', alignItems: 'center',
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: 8,
            background: THEME.accent.orange, border: `2px solid ${THEME.bg.app}`,
            fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Rajdhani, sans-serif', padding: '0 3px',
          }}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 360, background: THEME.bg.card, border: `1px solid ${THEME.border}`,
          borderRadius: 12, boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: THEME.accent.orangeDim, color: THEME.accent.orange, padding: '2px 7px', borderRadius: 8 }}>
                  {unreadCount} nouvelles
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: THEME.accent.orange, fontWeight: 600, fontFamily: 'inherit' }}>
                Tout marquer lu
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: THEME.text.muted, fontSize: 13 }}>Aucune notification 🎉</div>
            )}
            {notifications.map(notif => {
              const member = notif.from_member;
              return (
                <div
                  key={notif.id}
                  onClick={() => { onMarkRead(notif.id); setOpen(false); if (notif.project_id && onNavigate) onNavigate('projects'); }}
                  style={{
                    display: 'flex', gap: 10, padding: '12px 16px', cursor: 'pointer',
                    background: notif.read ? 'transparent' : `${THEME.accent.orange}08`,
                    borderBottom: `1px solid ${THEME.border}`, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.read ? 'transparent' : `${THEME.accent.orange}08`}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: '50%',
                      background: `${member?.color ?? THEME.accent.orange}22`,
                      border: `1.5px solid ${member?.color ?? THEME.accent.orange}66`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: member?.color ?? THEME.accent.orange,
                    }}>{member?.avatar ?? '?'}</div>
                    <span style={{
                      position: 'absolute', bottom: -2, right: -2, fontSize: 11,
                      background: THEME.bg.card, borderRadius: '50%',
                      width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{typeIcon[notif.type] ?? 'ℹ️'}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary, marginBottom: 2 }}>{notif.text}</div>
                    {notif.detail && (
                      <div style={{
                        fontSize: 11, color: THEME.text.muted, background: 'rgba(255,255,255,0.04)',
                        borderRadius: 6, padding: '4px 8px', marginBottom: 4,
                        borderLeft: `2px solid ${typeColor[notif.type] ?? THEME.accent.orange}44`, fontStyle: 'italic',
                      }}>{notif.detail}</div>
                    )}
                    <div style={{ fontSize: 10, color: THEME.text.muted }}>{notif.date} à {notif.time}</div>
                  </div>
                  {!notif.read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: THEME.accent.orange, flexShrink: 0, marginTop: 4 }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(toast => <ToastItem key={toast.id} toast={toast} />)}
    </div>
  );
}

function ToastItem({ toast }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const icons  = { mention: '💬', task: '✅', email: '📧', info: 'ℹ️', success: '✓', error: '✕' };
  const colors = { mention: THEME.accent.orange, task: THEME.accent.green, email: THEME.accent.blue, info: THEME.text.muted, success: THEME.accent.green, error: THEME.accent.red };

  return (
    <div style={{
      pointerEvents: 'all',
      background: THEME.bg.card,
      border: `1px solid ${colors[toast.type] ?? THEME.border}44`,
      borderLeft: `3px solid ${colors[toast.type] ?? THEME.accent.orange}`,
      borderRadius: 10, padding: '12px 16px',
      minWidth: 300, maxWidth: 380,
      display: 'flex', gap: 10, alignItems: 'flex-start',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      transform: visible ? 'translateX(0)' : 'translateX(120%)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{icons[toast.type] ?? 'ℹ️'}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 2 }}>{toast.title}</div>
        {toast.message && <div style={{ fontSize: 12, color: THEME.text.secondary, lineHeight: 1.4 }}>{toast.message}</div>}
      </div>
    </div>
  );
}

export function MentionInput({ onSend, placeholder, team, currentMemberId }) {
  const [value, setValue] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = e.target.value;
    setValue(val);
    const atMatch = val.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1].toLowerCase());
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const newVal = value.replace(/@\w*$/, `@${member.name} `);
    setValue(newVal);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!value.trim()) return;
    const mentions = team.filter(m => value.includes(`@${m.name}`) && m.id !== currentMemberId);
    onSend(value, mentions.map(m => m.id));
    setValue('');
  };

  const filteredTeam = (team ?? []).filter(m => m.name.toLowerCase().startsWith(mentionQuery) && m.id !== currentMemberId);

  return (
    <div style={{ position: 'relative' }}>
      {showMentions && filteredTeam.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0, marginBottom: 4,
          background: THEME.bg.card, border: `1px solid ${THEME.border}`,
          borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100, minWidth: 180,
        }}>
          <div style={{ padding: '6px 10px', fontSize: 10, color: THEME.text.muted, borderBottom: `1px solid ${THEME.border}`, letterSpacing: '0.06em' }}>MENTIONNER</div>
          {filteredTeam.map(member => (
            <div key={member.id} onClick={() => insertMention(member)} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${member.color}22`, border: `1.5px solid ${member.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: member.color }}>{member.avatar}</div>
              <span style={{ fontSize: 13, color: THEME.text.primary, fontWeight: 600 }}>{member.name}</span>
              <span style={{ fontSize: 10, color: THEME.text.muted, marginLeft: 'auto' }}>📧 notif</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={placeholder ?? 'Écrire un message… utilisez @ pour mentionner'}
          style={{ flex: 1, background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '10px 14px', color: THEME.text.primary, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={handleSend} style={{ background: THEME.accent.orange, border: 'none', borderRadius: 8, padding: '10px 16px', color: '#fff', cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13 }}>
          Envoyer
        </button>
      </div>
    </div>
  );
}

export function CommentText({ text, team }) {
  const parts = text.split(/(@\w+)/g);
  return (
    <span>
      {parts.map((part, i) => {
        const match = (team ?? []).find(m => part === `@${m.name}`);
        if (match) {
          return (
            <span key={i} style={{ color: match.color, background: `${match.color}18`, borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
