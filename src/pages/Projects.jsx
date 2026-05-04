import { useState } from 'react';
import { THEME, STATUS_CONFIG } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, PriorityBadge, ProgressBar, Card, Btn, Spinner } from '../components/ui';
import { MentionInput, CommentText } from '../components/Notifications';
import { useAppContext } from '../lib/AppContext';

export function ProjectsModule() {
  const { projects, loading, updateTaskStatus, addComment, team, currentMember } = useAppContext();
  const [view, setView] = useState('kanban');
  const [selectedProject, setSelectedProject] = useState(null);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><TopBar title="Projets" subtitle="Chargement…" /><Spinner /></div>;

  if (selectedProject) {
    const fresh = projects.find(p => p.id === selectedProject.id) ?? selectedProject;
    return <ProjectDetail project={fresh} onBack={() => setSelectedProject(null)} team={team} currentMember={currentMember} updateTaskStatus={updateTaskStatus} addComment={addComment} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Projets"
        subtitle={`${projects.length} projets • ${projects.filter(p => p.status === 'En cours').length} en cours`}
        actions={
          <>
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {['kanban', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: view === v ? THEME.accent.orange : 'transparent',
                  color: view === v ? '#fff' : THEME.text.secondary,
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit',
                }}>
                  {v === 'kanban' ? '⬛ Kanban' : '☰ Liste'}
                </button>
              ))}
            </div>
            <Btn size="sm">+ Nouveau projet</Btn>
          </>
        }
      />
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 24px' }}>
        {view === 'kanban'
          ? <KanbanView projects={projects} team={team} onSelectProject={setSelectedProject} />
          : <ListView projects={projects} team={team} onSelectProject={setSelectedProject} />
        }
      </div>
    </div>
  );
}

function KanbanView({ projects, team, onSelectProject }) {
  const columns = ['À faire', 'En attente', 'En cours', 'Terminé'];
  const grouped = columns.reduce((acc, col) => {
    acc[col] = projects.filter(p => col === 'À faire' ? !['En cours', 'En attente', 'Terminé'].includes(p.status) : p.status === col);
    return acc;
  }, {});
  projects.forEach(p => {
    if (!['En attente', 'En cours', 'Terminé'].includes(p.status) && !grouped['À faire'].find(x => x.id === p.id)) {
      grouped['À faire'].push(p);
    }
  });

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'auto', paddingBottom: 8 }}>
      {columns.map(col => {
        const items = grouped[col] ?? [];
        const cfg = STATUS_CONFIG[col] ?? STATUS_CONFIG['À faire'];
        return (
          <div key={col} style={{ minWidth: 280, maxWidth: 320, flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text.secondary, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{col}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: THEME.text.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
              {items.map(project => <KanbanCard key={project.id} project={project} team={team} onClick={() => onSelectProject(project)} />)}
              <button style={{ border: `1px dashed ${THEME.border}`, background: 'transparent', borderRadius: 10, padding: '10px', color: THEME.text.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Ajouter
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ project, team, onClick }) {
  const [hov, setHov] = useState(false);
  const doneTasks = (project.tasks ?? []).filter(t => t.status === 'Terminé').length;
  const totalTasks = (project.tasks ?? []).length;
  const daysLeft = Math.ceil((new Date(project.due_date ?? project.dueDate) - new Date()) / 86400000);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? THEME.bg.cardHover : THEME.bg.card,
        border: `1px solid ${hov ? 'rgba(240,120,20,0.25)' : THEME.border}`,
        borderRadius: 10, padding: '14px', cursor: 'pointer', transition: 'all 0.15s ease',
        borderLeft: `3px solid ${STATUS_CONFIG[project.status]?.dot ?? '#444'}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: THEME.text.muted, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {project.category}
        </span>
        <PriorityBadge priority={project.priority} />
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 8, lineHeight: 1.3 }}>{project.name}</div>
      <ProgressBar value={project.progress} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 10, color: THEME.text.muted }}>{doneTasks}/{totalTasks} tâches</span>
        <span style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 600 }}>{project.progress}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {(project.assignees ?? []).map(uid => {
            const m = team.find(t => t.id === uid);
            return m ? <Avatar key={uid} member={m} size={22} /> : null;
          })}
        </div>
        {(project.due_date ?? project.dueDate) && (
          <span style={{ fontSize: 10, color: daysLeft < 7 ? THEME.accent.red : daysLeft < 14 ? THEME.accent.yellow : THEME.text.muted, fontWeight: 600 }}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}j dépassé` : `${daysLeft}j restants`}
          </span>
        )}
      </div>
    </div>
  );
}

function ListView({ projects, team, onSelectProject }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 140px 80px', padding: '8px 16px', marginBottom: 4, fontSize: 10, color: THEME.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>Projet</span><span>Statut</span><span>Priorité</span><span>Avancement</span><span>Responsable</span><span>Échéance</span>
      </div>
      {projects.map(project => <ListRow key={project.id} project={project} team={team} onClick={() => onSelectProject(project)} />)}
    </div>
  );
}

function ListRow({ project, team, onClick }) {
  const [hov, setHov] = useState(false);
  const dueDate = project.due_date ?? project.dueDate;
  const daysLeft = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 140px 80px',
        padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
        background: hov ? THEME.bg.cardHover : 'transparent',
        border: `1px solid ${hov ? 'rgba(240,120,20,0.15)' : 'transparent'}`,
        alignItems: 'center', transition: 'all 0.15s', marginBottom: 2,
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>{project.name}</div>
        <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>{project.category}</div>
      </div>
      <StatusBadge status={project.status} small />
      <PriorityBadge priority={project.priority} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProgressBar value={project.progress} height={3} />
        <span style={{ fontSize: 10, color: THEME.text.muted }}>{project.progress}%</span>
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {(project.assignees ?? []).map(uid => {
          const m = team.find(t => t.id === uid);
          return m ? <Avatar key={uid} member={m} size={24} /> : null;
        })}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: daysLeft < 0 ? THEME.accent.red : daysLeft < 7 ? THEME.accent.yellow : THEME.text.muted }}>
        {dueDate ? new Date(dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
      </span>
    </div>
  );
}

function ProjectDetail({ project, onBack, team, currentMember, updateTaskStatus, addComment }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const tabs = ['tasks', 'comments', 'budget'];
  const tabLabels = { tasks: 'Tâches', comments: 'Discussion', budget: 'Budget' };
  const dueDate = project.due_date ?? project.dueDate;

  const handleSendComment = async (text, mentionIds) => {
    await addComment(project.id, currentMember.id, text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={project.name}
        subtitle={project.category}
        actions={<>
          <StatusBadge status={project.status} />
          <Btn size="sm" variant="secondary" onClick={onBack}>← Retour</Btn>
          <Btn size="sm">Modifier</Btn>
        </>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Avancement', value: `${project.progress}%`, color: THEME.accent.orange },
            { label: 'Tâches restantes', value: (project.tasks ?? []).filter(t => t.status !== 'Terminé').length, color: THEME.accent.blue },
            { label: 'Budget utilisé', value: project.budget?.allocated ? `${Math.round(project.budget.spent / project.budget.allocated * 100)}%` : '—', color: THEME.accent.green },
            { label: 'Échéance', value: dueDate ? new Date(dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', color: THEME.text.secondary },
          ].map(stat => (
            <Card key={stat.label} style={{ padding: 14 }}>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 6 }}>{stat.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'Rajdhani, sans-serif' }}>{stat.value}</div>
            </Card>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}><ProgressBar value={project.progress} height={6} /></div>
        <Card style={{ marginBottom: 20, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 13, color: THEME.text.secondary, lineHeight: 1.6 }}>{project.description}</p>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(project.tags ?? []).map(tag => (
              <span key={tag} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: THEME.accent.orangeDim, color: THEME.accent.orange, fontWeight: 600 }}>{tag}</span>
            ))}
          </div>
        </Card>
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: activeTab === tab ? THEME.accent.orange : 'transparent',
              color: activeTab === tab ? '#fff' : THEME.text.secondary,
              fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s',
            }}>{tabLabels[tab]}</button>
          ))}
        </div>
        {activeTab === 'tasks' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(project.tasks ?? []).map(task => (
              <TaskRow key={task.id} task={task} team={team} onToggle={updateTaskStatus} />
            ))}
          </div>
        )}
        {activeTab === 'comments' && (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {(project.comments ?? []).length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: THEME.text.muted, fontSize: 13 }}>Pas encore de messages. Commencez la discussion !</div>
              )}
              {(project.comments ?? []).map(c => {
                const member = c.team_members ?? team.find(m => m.id === (c.author_id ?? c.author));
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                    <Avatar member={member} size={32} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: member?.color ?? THEME.text.primary }}>{member?.name}</span>
                        <span style={{ fontSize: 10, color: THEME.text.muted }}>{c.date} à {c.time}</span>
                      </div>
                      <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: '4px 12px 12px 12px', padding: '10px 14px', fontSize: 13, color: THEME.text.primary, lineHeight: 1.5 }}>
                        <CommentText text={c.text} team={team} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <MentionInput onSend={handleSendComment} placeholder="Écrire un message… utilisez @ pour notifier" team={team} currentMemberId={currentMember?.id} />
          </div>
        )}
        {activeTab === 'budget' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 12 }}>BUDGET ALLOUÉ</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{(project.budget?.allocated ?? 0).toLocaleString('fr-FR')} €</div>
            </Card>
            <Card>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 12 }}>DÉPENSÉ</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: THEME.accent.orange, fontFamily: 'Rajdhani' }}>{(project.budget?.spent ?? 0).toLocaleString('fr-FR')} €</div>
              {project.budget?.allocated > 0 && <div style={{ marginTop: 8 }}><ProgressBar value={Math.round(project.budget.spent / project.budget.allocated * 100)} /></div>}
            </Card>
            <Card style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 8 }}>RESTANT</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent.green, fontFamily: 'Rajdhani' }}>{((project.budget?.allocated ?? 0) - (project.budget?.spent ?? 0)).toLocaleString('fr-FR')} €</div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskRow({ task, team, onToggle }) {
  const [done, setDone] = useState(task.status === 'Terminé');
  const assigneeMember = team.find(m => m.id === (task.assignee_id ?? task.assignee));

  const toggle = async () => {
    const next = !done;
    setDone(next);
    await onToggle(task.id, next);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
      background: THEME.bg.card, border: `1px solid ${THEME.border}`,
      opacity: done ? 0.6 : 1, transition: 'opacity 0.2s',
    }}>
      <button onClick={toggle} style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        background: done ? THEME.accent.green : 'transparent',
        border: `2px solid ${done ? THEME.accent.green : THEME.text.muted}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: '#fff', transition: 'all 0.15s',
      }}>{done ? '✓' : ''}</button>
      <span style={{ flex: 1, fontSize: 13, color: THEME.text.primary, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</span>
      <PriorityBadge priority={task.priority} />
      {assigneeMember && <Avatar member={assigneeMember} size={24} />}
    </div>
  );
}
