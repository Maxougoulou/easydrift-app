import { useState, useEffect } from 'react';
import { AppContext } from './lib/AppContext';
import { useAuth } from './hooks/useAuth';
import { useTeam } from './hooks/useTeam';
import { useProjects } from './hooks/useProjects';
import { useVehicles } from './hooks/useVehicles';
import { useEvents } from './hooks/useEvents';
import { useBudget } from './hooks/useBudget';
import { useNotifications } from './hooks/useNotifications';
import { useIsMobile } from './hooks/useIsMobile';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Notifications';
import { LoginPage } from './pages/Login';
import { DashboardModule } from './pages/Dashboard';
import { ProjectsModule } from './pages/Projects';
import { VehiclesModule } from './pages/Vehicles';
import { CalendarModule, BudgetModule, MessagesModule, GalleryModule } from './pages/Modules';
import { TrackDaysModule } from './pages/TrackDays';
import { Spinner } from './components/ui';
import { THEME, NAV_ITEMS } from './lib/theme';

function MobileNav({ activeSection, onNavigate, currentMember, onSignOut }) {
  const [showAccount, setShowAccount] = useState(false);

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000,
        background: THEME.bg.sidebar,
        borderTop: `1px solid ${THEME.border}`,
        display: 'flex', alignItems: 'stretch',
        height: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: isActive ? THEME.accent.orange : THEME.text.muted,
                borderTop: isActive ? `2px solid ${THEME.accent.orange}` : '2px solid transparent',
                transition: 'color 0.15s',
              }}
            >
              <span style={{ fontSize: 17, lineHeight: 1 }}>{item.icon}</span>
              <span style={{ fontSize: 8, fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setShowAccount(true)}
          style={{
            width: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer',
            borderLeft: `1px solid ${THEME.border}`,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: `${currentMember?.color ?? THEME.accent.orange}22`,
            border: `1.5px solid ${currentMember?.color ?? THEME.accent.orange}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: currentMember?.color ?? THEME.accent.orange,
          }}>{currentMember?.avatar ?? '?'}</div>
        </button>
      </div>

      {showAccount && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000 }}
          onClick={() => setShowAccount(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: THEME.bg.card, borderRadius: '16px 16px 0 0',
              border: `1px solid ${THEME.border}`,
              padding: '20px 24px 36px',
            }}
          >
            <div style={{ width: 36, height: 4, background: THEME.border, borderRadius: 2, margin: '0 auto 20px' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${THEME.border}` }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: `${currentMember?.color}22`, border: `2px solid ${currentMember?.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: currentMember?.color,
              }}>{currentMember?.avatar}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{currentMember?.name}</div>
                <div style={{ fontSize: 11, color: THEME.text.muted }}>EasyDrift</div>
              </div>
            </div>
            <button onClick={onSignOut} style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: 'rgba(239,68,68,0.1)', color: THEME.accent.red,
              cursor: 'pointer', fontFamily: 'Rajdhani, sans-serif',
              fontWeight: 700, fontSize: 14, letterSpacing: '0.04em',
            }}>Se déconnecter</button>
          </div>
        </div>
      )}
    </>
  );
}

export default function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { team, loading: teamLoading } = useTeam();
  const { projects, loading: projectsLoading, createProject, updateProject, deleteProject, updateTaskStatus, addTask, deleteTask, addComment } = useProjects();
  const { vehicles, loading: vehiclesLoading, createVehicle, updateVehicle, deleteVehicle, addMaintenance, deleteMaintenance } = useVehicles();
  const { events, createEvent, deleteEvent } = useEvents();
  const { budget, addBudgetEntry, updateCategory } = useBudget();
  const isMobile = useIsMobile();
  const [section, setSection] = useState('dashboard');
  const [workspace, setWorkspace] = useState('easydrift');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);

  useEffect(() => {
    if (user && team.length > 0) {
      supabase.from('team_members').select('*').eq('auth_user_id', user.id).single()
        .then(({ data }) => { if (data) setCurrentMember(data); });
    }
  }, [user, team]);

  const { notifications, toasts, unreadCount, markAllRead, markRead, addNotification, showToast } = useNotifications(currentMember?.id);

  const dataLoading = projectsLoading || vehiclesLoading || teamLoading;

  if (authLoading) {
    return (
      <div style={{ height: '100%', width: '100vw', background: THEME.bg.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (!user) return <LoginPage onSignIn={signIn} />;

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <DashboardModule />;
      case 'projects':   return <ProjectsModule />;
      case 'trackdays':  return <TrackDaysModule />;
      case 'vehicles':   return <VehiclesModule />;
      case 'calendar': return <CalendarModule />;
      case 'budget': return <BudgetModule />;
      case 'messages': return <MessagesModule />;
      case 'gallery': return <GalleryModule />;
      default: return <DashboardModule />;
    }
  };

  const contextValue = {
    projects,
    vehicles,
    team,
    events,
    budget,
    currentMember,
    loading: dataLoading,
    isMobile,
    workspace,
    setWorkspace,
    onNavigate: setSection,
    onToggleSidebar: () => setSidebarCollapsed(c => !c),
    // Projects
    createProject,
    updateProject,
    deleteProject,
    updateTaskStatus,
    addTask,
    deleteTask,
    addComment,
    // Vehicles
    createVehicle,
    updateVehicle,
    deleteVehicle,
    addMaintenance,
    deleteMaintenance,
    // Events
    createEvent,
    deleteEvent,
    // Budget
    addBudgetEntry,
    updateCategory,
    // Notifications
    notifications,
    unreadCount,
    onMarkAllRead: markAllRead,
    onMarkRead: markRead,
    addNotification,
    showToast,
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div style={{
        display: 'flex', flexDirection: 'row',
        height: '100%', width: '100vw',
        overflow: 'hidden', background: THEME.bg.app,
      }}>
        {!isMobile && (
          <Sidebar
            activeSection={section}
            onNavigate={setSection}
            collapsed={sidebarCollapsed}
            team={team}
            currentMember={currentMember}
            onSignOut={signOut}
          />
        )}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', minWidth: 0, minHeight: 0,
          paddingBottom: isMobile ? 'calc(56px + env(safe-area-inset-bottom, 0px))' : 0,
        }}>
          {renderSection()}
        </div>
        {isMobile && (
          <MobileNav
            activeSection={section}
            onNavigate={setSection}
            currentMember={currentMember}
            onSignOut={signOut}
          />
        )}
        <ToastContainer toasts={toasts} />
      </div>
    </AppContext.Provider>
  );
}
