import { THEME } from '../lib/theme';
import { useAppContext } from '../lib/AppContext';
import { NotificationBell } from './Notifications';

export function TopBar({ title, subtitle, actions }) {
  const { onToggleSidebar, onNavigate, notifications, unreadCount, onMarkAllRead, onMarkRead, isMobile } = useAppContext();

  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center',
      padding: isMobile ? '0 16px' : '0 24px',
      borderBottom: `1px solid ${THEME.border}`,
      background: THEME.bg.app, gap: isMobile ? 10 : 16, flexShrink: 0,
    }}>
      {!isMobile && (
        <button
          onClick={onToggleSidebar}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.secondary, fontSize: 18, padding: '4px 8px', borderRadius: 6 }}
        >☰</button>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.03em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        {subtitle && !isMobile && <div style={{ fontSize: 11, color: THEME.text.muted }}>{subtitle}</div>}
      </div>

      {actions && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {actions}
        </div>
      )}

      <NotificationBell
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={onMarkAllRead}
        onMarkRead={onMarkRead}
        onNavigate={onNavigate}
      />
    </div>
  );
}
