import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, ProgressBar, Card, Spinner } from '../components/ui';
import { useAppContext } from '../lib/AppContext';

export function DashboardModule() {
  const { projects, vehicles, team, loading, onNavigate } = useAppContext();

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><TopBar title="Dashboard" subtitle="Chargement…" /><Spinner /></div>;

  const activeProjects = projects.filter(p => p.status === 'En cours');
  const totalBudgetSpent = projects.reduce((s, p) => s + (p.budget?.spent ?? 0), 0);
  const totalBudgetAllocated = projects.reduce((s, p) => s + (p.budget?.allocated ?? 0), 0);
  const openTasks = projects.flatMap(p => p.tasks ?? []).filter(t => t.status !== 'Terminé').length;

  const today = new Date();
  const alerts = [];
  vehicles.forEach(v => {
    const ctDays = Math.ceil((new Date(v.nextCT) - today) / 86400000);
    const revDays = Math.ceil((new Date(v.nextRevision?.date) - today) / 86400000);
    if (ctDays < 90) alerts.push({ type: 'CT', vehicle: v.name, days: ctDays });
    if (revDays < 60) alerts.push({ type: 'Révision', vehicle: v.name, days: revDays });
  });

  const kpis = [
    { label: 'Projets actifs', value: activeProjects.length, color: THEME.accent.orange, icon: '◈' },
    { label: 'Véhicules', value: vehicles.length, color: THEME.accent.blue, icon: '◎' },
    { label: 'Budget dépensé', value: `${totalBudgetSpent.toLocaleString('fr-FR')} €`, color: THEME.accent.green, icon: '◇' },
    { label: 'Tâches ouvertes', value: openTasks, color: THEME.accent.yellow, icon: '▦' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Dashboard" subtitle={`Bonjour ! Voici le résumé EasyDrift`} />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {kpis.map(kpi => (
            <Card key={kpi.label} style={{ padding: '16px 18px' }} hover={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: THEME.text.muted, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{kpi.label}</div>
                <span style={{ fontSize: 18, color: kpi.color, opacity: 0.7 }}>{kpi.icon}</span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 900, color: kpi.color, fontFamily: 'Rajdhani, sans-serif', lineHeight: 1 }}>{kpi.value}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
          {/* Active projects */}
          <Card style={{ padding: 0, overflow: 'hidden' }} hover={false}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>Projets en cours</span>
              <button onClick={() => onNavigate('projects')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: THEME.accent.orange, fontWeight: 600, fontFamily: 'inherit' }}>Voir tout →</button>
            </div>
            {activeProjects.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: THEME.text.muted, fontSize: 13 }}>Aucun projet en cours</div>}
            {activeProjects.map(p => {
              const dueDate = p.due_date ?? p.dueDate;
              const daysLeft = dueDate ? Math.ceil((new Date(dueDate) - today) / 86400000) : null;
              return (
                <div key={p.id} style={{ padding: '12px 18px', borderBottom: `1px solid ${THEME.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>{p.category}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {(p.assignees ?? []).map(uid => { const m = team.find(t => t.id === uid); return m ? <Avatar key={uid} member={m} size={22} /> : null; })}
                    </div>
                  </div>
                  <ProgressBar value={p.progress} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <span style={{ fontSize: 10, color: THEME.text.muted }}>{p.progress}%</span>
                    {daysLeft !== null && <span style={{ fontSize: 10, color: daysLeft < 7 ? THEME.accent.red : THEME.text.muted, fontWeight: 600 }}>{daysLeft < 0 ? `${Math.abs(daysLeft)}j dépassé` : `${daysLeft}j`}</span>}
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Alerts */}
            {alerts.length > 0 && (
              <Card style={{ padding: 0, overflow: 'hidden' }} hover={false}>
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${THEME.border}` }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>⚠ Alertes</span>
                </div>
                {alerts.map((a, i) => (
                  <div key={i} style={{ padding: '10px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13 }}>{a.days < 30 ? '🔴' : '🟡'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>{a.vehicle}</div>
                      <div style={{ fontSize: 11, color: THEME.text.muted }}>{a.type} dans <strong style={{ color: a.days < 30 ? THEME.accent.red : THEME.accent.yellow }}>{a.days}j</strong></div>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {/* Fleet */}
            <Card style={{ padding: 0, overflow: 'hidden' }} hover={false}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>Flotte</span>
                <button onClick={() => onNavigate('vehicles')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, color: THEME.accent.orange, fontWeight: 600, fontFamily: 'inherit' }}>Voir →</button>
              </div>
              {vehicles.map(v => (
                <div key={v.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>{v.name}</div>
                    <div style={{ fontSize: 10, color: THEME.text.muted }}>{v.plate}</div>
                  </div>
                  <StatusBadge status={v.status} small />
                </div>
              ))}
            </Card>

            {/* Budget summary */}
            <Card style={{ padding: '14px 16px' }} hover={false}>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani', marginBottom: 12 }}>Budget global</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: THEME.text.muted }}>Dépensé</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.accent.orange, fontFamily: 'Rajdhani' }}>{totalBudgetSpent.toLocaleString('fr-FR')} €</span>
              </div>
              <ProgressBar value={totalBudgetAllocated > 0 ? Math.round(totalBudgetSpent / totalBudgetAllocated * 100) : 0} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: THEME.text.muted }}>Alloué : {totalBudgetAllocated.toLocaleString('fr-FR')} €</span>
                <span style={{ fontSize: 10, color: THEME.accent.green, fontWeight: 600 }}>Reste : {(totalBudgetAllocated - totalBudgetSpent).toLocaleString('fr-FR')} €</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
