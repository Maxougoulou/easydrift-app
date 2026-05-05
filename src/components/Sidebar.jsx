import { useState } from 'react';
import { THEME, NAV_ITEMS } from '../lib/theme';
import { useAppContext } from '../lib/AppContext';

const WORKSPACES = [
  { id: 'easydrift', label: 'EasyDrift', color: THEME.accent.orange },
  { id: 'toyah_games', label: 'Toyah Games', color: THEME.accent.purple },
];

export function Sidebar({ activeSection, onNavigate, collapsed, team, currentMember, onSignOut }) {
  const { workspace, setWorkspace } = useAppContext();
  const [showAccount, setShowAccount] = useState(false);

  return (
    <div style={{
      width: collapsed ? 60 : 220,
      background: THEME.bg.sidebar,
      borderRight: `1px solid ${THEME.border}`,
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.25s ease',
      flexShrink: 0, height: '100%', overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '16px 10px' : '14px 14px',
        borderBottom: `1px solid ${THEME.border}`,
        display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start',
        minHeight: 60, overflow: 'hidden',
      }}>
        {!collapsed ? (
          <img src="/logo-easydrift.png" alt="EasyDrift" style={{ height: 26, objectFit: 'contain', objectPosition: 'left center' }} />
        ) : (
          <div style={{
            width: 32, height: 32, background: THEME.accent.orangeDim, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: THEME.accent.orange, fontWeight: 900, fontFamily: 'Rajdhani, sans-serif',
          }}>E</div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          const isProjects = item.id === 'projects';

          return (
            <div key={item.id}>
              <button
                onClick={() => onNavigate(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: 10, padding: collapsed ? '10px 0' : '10px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: isActive ? THEME.accent.orangeDim : 'transparent',
                  color: isActive ? THEME.accent.orange : THEME.text.secondary,
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.15s ease', marginBottom: 2, fontFamily: 'inherit',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = THEME.text.primary; } }}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = THEME.text.secondary; } }}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
                {!collapsed && isProjects && (
                  <span style={{ fontSize: 10, color: isActive ? THEME.accent.orange : THEME.text.muted, opacity: 0.7 }}>
                    {isActive ? '▾' : '▸'}
                  </span>
                )}
                {!collapsed && !isProjects && isActive && (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: THEME.accent.orange }} />
                )}
              </button>

              {/* Workspace sub-menu */}
              {isProjects && isActive && !collapsed && (
                <div style={{ paddingLeft: 12, paddingBottom: 4 }}>
                  {WORKSPACES.map(ws => {
                    const wsActive = workspace === ws.id;
                    return (
                      <button
                        key={ws.id}
                        onClick={() => { setWorkspace(ws.id); onNavigate('projects'); }}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                          padding: '7px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: wsActive ? `${ws.color}18` : 'transparent',
                          color: wsActive ? ws.color : THEME.text.muted,
                          fontSize: 12, fontWeight: wsActive ? 700 : 500,
                          fontFamily: 'inherit', transition: 'all 0.15s', marginBottom: 1,
                        }}
                        onMouseEnter={e => { if (!wsActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                        onMouseLeave={e => { if (!wsActive) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsActive ? ws.color : THEME.text.muted, flexShrink: 0, transition: 'background 0.15s' }} />
                        {ws.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Team */}
      {!collapsed && (
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${THEME.border}` }}>
          <div style={{ fontSize: 10, color: THEME.text.muted, letterSpacing: '0.1em', marginBottom: 10, textTransform: 'uppercase' }}>Équipe</div>
          {team.map(member => (
            <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `${member.color}22`, border: `1.5px solid ${member.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: member.color,
              }}>{member.avatar}</div>
              <div>
                <div style={{ fontSize: 12, color: THEME.text.primary, fontWeight: 600 }}>{member.name}</div>
                <div style={{ fontSize: 10, color: THEME.text.muted }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22C55E', display: 'inline-block', marginRight: 4 }} />
                  En ligne
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current user */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 16px',
        borderTop: `1px solid ${THEME.border}`,
        display: 'flex', alignItems: 'center', gap: 8,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: `${currentMember?.color ?? THEME.accent.orange}22`,
          border: `1.5px solid ${currentMember?.color ?? THEME.accent.orange}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: currentMember?.color ?? THEME.accent.orange, flexShrink: 0,
        }}>{currentMember?.avatar ?? '?'}</div>
        {!collapsed && (
          <>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary }}>{currentMember?.name ?? '—'}</div>
              <div style={{ fontSize: 10, color: THEME.text.muted }}>Membre</div>
            </div>
            <button
              title="Se déconnecter"
              onClick={() => setShowAccount(true)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.muted, fontSize: 15, padding: '4px', borderRadius: 6 }}
              onMouseEnter={e => e.currentTarget.style.color = THEME.text.primary}
              onMouseLeave={e => e.currentTarget.style.color = THEME.text.muted}
            >⚙</button>
          </>
        )}
      </div>

      {showAccount && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }}
          onClick={() => setShowAccount(false)}
        >
          <div onClick={e => e.stopPropagation()} style={{
            background: THEME.bg.card, border: `1px solid ${THEME.border}`,
            borderRadius: 16, padding: '28px 32px', width: 360,
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${THEME.border}` }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: `${currentMember?.color}22`, border: `2px solid ${currentMember?.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: currentMember?.color,
              }}>{currentMember?.avatar}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{currentMember?.name}</div>
                <div style={{ fontSize: 11, color: THEME.text.muted }}>EasyDrift</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <button onClick={onSignOut} style={{
                width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                background: 'rgba(239,68,68,0.1)', color: THEME.accent.red,
                cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif',
                fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
              }}>Se déconnecter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
