import { useState, useEffect } from 'react';
import { AppContext } from './lib/AppContext';
import { useAuth } from './hooks/useAuth';
import { useTeam } from './hooks/useTeam';
import { useProjects } from './hooks/useProjects';
import { useVehicles } from './hooks/useVehicles';
import { useEvents } from './hooks/useEvents';
import { useBudget } from './hooks/useBudget';
import { useNotifications } from './hooks/useNotifications';
import { supabase } from './lib/supabase';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/Notifications';
import { LoginPage } from './pages/Login';
import { DashboardModule } from './pages/Dashboard';
import { ProjectsModule } from './pages/Projects';
import { VehiclesModule } from './pages/Vehicles';
import { CalendarModule, BudgetModule, MessagesModule, GalleryModule } from './pages/Modules';
import { Spinner } from './components/ui';
import { THEME } from './lib/theme';

export default function App() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  const { team, loading: teamLoading } = useTeam();
  const { projects, loading: projectsLoading, createProject, updateProject, deleteProject, updateTaskStatus, addTask, deleteTask, addComment } = useProjects();
  const { vehicles, loading: vehiclesLoading, createVehicle, updateVehicle, deleteVehicle, addMaintenance, deleteMaintenance } = useVehicles();
  const { events, createEvent, deleteEvent } = useEvents();
  const { budget, addBudgetEntry, updateCategory } = useBudget();
  const [section, setSection] = useState('dashboard');
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
      <div style={{ height: '100vh', width: '100vw', background: THEME.bg.app, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    );
  }

  if (!user) return <LoginPage onSignIn={signIn} />;

  const renderSection = () => {
    switch (section) {
      case 'dashboard': return <DashboardModule />;
      case 'projects': return <ProjectsModule />;
      case 'vehicles': return <VehiclesModule />;
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
      <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: THEME.bg.app }}>
        <Sidebar
          activeSection={section}
          onNavigate={setSection}
          collapsed={sidebarCollapsed}
          team={team}
          currentMember={currentMember}
          onSignOut={signOut}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {renderSection()}
        </div>
        <ToastContainer toasts={toasts} />
      </div>
    </AppContext.Provider>
  );
}
