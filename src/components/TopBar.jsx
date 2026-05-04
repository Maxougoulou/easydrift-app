import { THEME } from '../lib/theme';
import { useAppContext } from '../lib/AppContext';
import { NotificationBell } from './Notifications';

export function TopBar({ title, subtitle, actions }) {
  const { onToggleSidebar, onNavigate, notifications, unreadCount, onMarkAllRead, onMarkRead } = useAppContext();

  return (
    <div style={{
      height: 60, display: 'flex', alignItems: 'center',
      padding: '0 24px', borderBottom: `1px solid ${THEME.border}`,
      background: THEME.bg.app, gap: 16, flexShrink: 0,
    }}>
      <button
        onClick={onToggleSidebar}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: THEME.text.secondary, fontSize: 18, padding: '4px 8px', borderRadius: 6 }}
      >☰</button>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.03em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: THEME.text.muted }}>{subtitle}</div>}
      </div>

      {actions && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{actions}</div>}

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
