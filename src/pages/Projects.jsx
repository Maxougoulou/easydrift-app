import { useState, useRef } from 'react';
import { THEME, STATUS_CONFIG } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, PriorityBadge, ProgressBar, Card, Btn, Spinner } from '../components/ui';
import { MentionInput, CommentText } from '../components/Notifications';
import { ProjectForm, TaskForm } from '../components/Forms';
import { useAppContext } from '../lib/AppContext';

export function ProjectsModule() {
  const { projects, loading, createProject, updateProject, deleteProject, updateTaskStatus, addTask, deleteTask, addComment, team, currentMember } = useAppContext();
  const [view, setView] = useState('kanban');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectStatus, setNewProjectStatus] = useState('À faire');

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><TopBar title="Projets" subtitle="Chargement…" /><Spinner /></div>;

  if (selectedProject) {
    const fresh = projects.find(p => p.id === selectedProject.id) ?? selectedProject;
    return (
      <ProjectDetail
        project={fresh}
        onBack={() => setSelectedProject(null)}
        team={team}
        currentMember={currentMember}
        updateTaskStatus={updateTaskStatus}
        deleteTask={deleteTask}
        addTask={addTask}
        addComment={addComment}
        updateProject={updateProject}
      />
    );
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
                <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? THEME.accent.orange : 'transparent', color: view === v ? '#fff' : THEME.text.secondary, fontSize: 12, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {v === 'kanban' ? '⬛ Kanban' : '☰ Liste'}
                </button>
              ))}
            </div>
            <Btn size="sm" onClick={() => { setNewProjectStatus('À faire'); setShowNewProject(true); }}>+ Nouveau projet</Btn>
          </>
        }
      />
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 24px' }}>
        {view === 'kanban'
          ? <KanbanView
              projects={projects}
              team={team}
              onSelectProject={setSelectedProject}
              onAddProject={(status) => { setNewProjectStatus(status); setShowNewProject(true); }}
              onMoveProject={(id, status) => updateProject(id, { status })}
              onDeleteProject={deleteProject}
            />
          : <ListView projects={projects} team={team} onSelectProject={setSelectedProject} onDeleteProject={deleteProject} />
        }
      </div>

      {showNewProject && (
        <ProjectForm
          team={team}
          onSubmit={(data) => createProject({ ...data, status: newProjectStatus })}
          onClose={() => setShowNewProject(false)}
        />
      )}
    </div>
  );
}

// ─── KANBAN ───────────────────────────────────────────────────────────────────

function KanbanView({ projects, team, onSelectProject, onAddProject, onMoveProject, onDeleteProject }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const columns = ['À faire', 'En attente', 'En cours', 'Terminé'];
  const grouped = columns.reduce((acc, col) => {
    acc[col] = projects.filter(p =>
      col === 'À faire'
        ? !['En cours', 'En attente', 'Terminé'].includes(p.status)
        : p.status === col
    );
    return acc;
  }, {});

  const handleDrop = (col) => {
    if (draggingId !== null) {
      const project = projects.find(p => p.id === draggingId);
      if (project && project.status !== col) {
        onMoveProject(draggingId, col);
      }
    }
    setDraggingId(null);
    setDragOverCol(null);
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', overflow: 'auto', paddingBottom: 8 }}>
      {columns.map(col => {
        const items = grouped[col] ?? [];
        const cfg = STATUS_CONFIG[col] ?? STATUS_CONFIG['À faire'];
        const isOver = dragOverCol === col && draggingId !== null;
        return (
          <div
            key={col}
            style={{ minWidth: 280, maxWidth: 320, flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 8 }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverCol(col); }}
            onDragLeave={(e) => { if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null); }}
            onDrop={(e) => { e.preventDefault(); handleDrop(col); }}
          >
            {/* En-tête colonne */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: isOver ? THEME.accent.orange : cfg.dot, transition: 'background 0.15s' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: isOver ? THEME.accent.orange : THEME.text.secondary, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'color 0.15s' }}>{col}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: THEME.text.muted, background: 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 10 }}>{items.length}</span>
            </div>
            {/* Zone de drop */}
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto',
              borderRadius: 10,
              border: `2px dashed ${isOver ? THEME.accent.orange + '55' : 'transparent'}`,
              background: isOver ? 'rgba(240,120,20,0.04)' : 'transparent',
              padding: isOver ? 6 : 0,
              transition: 'all 0.15s',
              minHeight: 60,
            }}>
              {items.map(project => (
                <KanbanCard
                  key={project.id}
                  project={project}
                  team={team}
                  onClick={() => onSelectProject(project)}
                  onDragStart={() => setDraggingId(project.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}
                  isDragging={draggingId === project.id}
                  onDelete={onDeleteProject}
                />
              ))}
              <button
                onClick={() => onAddProject(col)}
                style={{ border: `1px dashed ${THEME.border}`, background: 'transparent', borderRadius: 10, padding: '10px', color: THEME.text.muted, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.accent.orange; e.currentTarget.style.color = THEME.accent.orange; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.text.muted; }}
              >+ Ajouter</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ project, team, onClick, onDragStart, onDragEnd, isDragging, onDelete }) {
  const [hov, setHov] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const justDragged = useRef(false);
  const doneTasks = (project.tasks ?? []).filter(t => t.status === 'Terminé').length;
  const totalTasks = (project.tasks ?? []).length;
  const daysLeft = project.due_date ? Math.ceil((new Date(project.due_date) - new Date()) / 86400000) : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        justDragged.current = true;
        onDragStart();
      }}
      onDragEnd={() => {
        onDragEnd();
        setTimeout(() => { justDragged.current = false; }, 50);
      }}
      onClick={() => { if (!justDragged.current && !confirmDelete) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
      style={{
        position: 'relative',
        background: hov && !isDragging ? THEME.bg.cardHover : THEME.bg.card,
        border: `1px solid ${hov && !isDragging ? 'rgba(240,120,20,0.25)' : THEME.border}`,
        borderRadius: 10, padding: '14px',
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'all 0.15s ease',
        borderLeft: `3px solid ${STATUS_CONFIG[project.status]?.dot ?? '#444'}`,
        opacity: isDragging ? 0.35 : 1,
        userSelect: 'none',
      }}
    >
      {/* Bouton × au survol */}
      {hov && !confirmDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 5, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, fontSize: 14, cursor: 'pointer', zIndex: 1, transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = THEME.accent.red; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = THEME.text.muted; }}
        >×</button>
      )}

      {/* Overlay de confirmation */}
      {confirmDelete && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(0,0,0,0.88)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 2, backdropFilter: 'blur(2px)' }}
        >
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, textAlign: 'center', padding: '0 12px' }}>Supprimer « {project.name} » ?</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '0 16px', lineHeight: 1.4 }}>Toutes les tâches et commentaires seront supprimés.</span>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
              style={{ background: THEME.accent.red, border: 'none', borderRadius: 7, padding: '6px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >Supprimer</button>
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
              style={{ background: 'rgba(255,255,255,0.1)', border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 7, padding: '6px 16px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: THEME.text.muted, background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{project.category}</span>
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
          {(project.assignees ?? []).map(uid => { const m = team.find(t => t.id === uid); return m ? <Avatar key={uid} member={m} size={22} /> : null; })}
        </div>
        {daysLeft !== null && (
          <span style={{ fontSize: 10, color: daysLeft < 0 ? THEME.accent.red : daysLeft < 7 ? THEME.accent.yellow : THEME.text.muted, fontWeight: 600 }}>
            {daysLeft < 0 ? `${Math.abs(daysLeft)}j dépassé` : `${daysLeft}j restants`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── LISTE ────────────────────────────────────────────────────────────────────

function ListView({ projects, team, onSelectProject, onDeleteProject }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 140px 80px 32px', padding: '8px 16px', marginBottom: 4, fontSize: 10, color: THEME.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>Projet</span><span>Statut</span><span>Priorité</span><span>Avancement</span><span>Responsable</span><span>Échéance</span><span />
      </div>
      {projects.map(project => <ListRow key={project.id} project={project} team={team} onClick={() => onSelectProject(project)} onDelete={onDeleteProject} />)}
    </div>
  );
}

function ListRow({ project, team, onClick, onDelete }) {
  const [hov, setHov] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const daysLeft = project.due_date ? Math.ceil((new Date(project.due_date) - new Date()) / 86400000) : null;
  return (
    <div
      onClick={() => { if (!confirmDelete) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
      style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 140px 80px 32px', padding: '12px 16px', borderRadius: 8, cursor: 'pointer', background: hov ? THEME.bg.cardHover : 'transparent', border: `1px solid ${confirmDelete ? THEME.accent.red + '44' : hov ? 'rgba(240,120,20,0.15)' : 'transparent'}`, alignItems: 'center', transition: 'all 0.15s', marginBottom: 2 }}
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
        {(project.assignees ?? []).map(uid => { const m = team.find(t => t.id === uid); return m ? <Avatar key={uid} member={m} size={24} /> : null; })}
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: daysLeft === null ? THEME.text.muted : daysLeft < 0 ? THEME.accent.red : daysLeft < 7 ? THEME.accent.yellow : THEME.text.muted }}>
        {project.due_date ? new Date(project.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '—'}
      </span>
      {/* Suppression */}
      {confirmDelete ? (
        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, gridColumn: '1 / -1', paddingTop: 8, borderTop: `1px solid ${THEME.accent.red}33`, marginTop: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: THEME.accent.red, fontWeight: 700, flex: 1 }}>Supprimer « {project.name} » ?</span>
          <button onClick={() => onDelete(project.id)} style={{ background: THEME.accent.red, border: 'none', borderRadius: 6, padding: '4px 12px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
          <button onClick={() => setConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '4px 12px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
        </div>
      ) : (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          style={{ background: 'transparent', border: 'none', color: hov ? THEME.text.muted : 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s', justifySelf: 'center' }}
          onMouseEnter={e => e.currentTarget.style.color = THEME.accent.red}
          onMouseLeave={e => e.currentTarget.style.color = hov ? THEME.text.muted : 'transparent'}
        >×</button>
      )}
    </div>
  );
}

// ─── DÉTAIL PROJET ────────────────────────────────────────────────────────────

function ProjectDetail({ project, onBack, team, currentMember, updateTaskStatus, deleteTask, addTask, addComment, updateProject }) {
  const { isMobile, addNotification } = useAppContext();
  const [showEdit, setShowEdit] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [mobileTab, setMobileTab] = useState('tasks');

  const comments = project.comments ?? [];
  const tasks = project.tasks ?? [];

  const handleSendComment = async (text, mentionIds = []) => {
    if (!currentMember) return;
    await addComment(project.id, currentMember.id, text);
    for (const memberId of mentionIds) {
      if (memberId !== currentMember.id) {
        await addNotification({
          type: 'mention',
          from: currentMember.id,
          to: memberId,
          text: `${currentMember.name} t'a mentionné dans « ${project.name} »`,
          detail: text,
          projectId: project.id,
        });
      }
    }
  };

  const StatsAndTasks = () => (
    <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Avancement', value: `${project.progress}%`, color: THEME.accent.orange },
          { label: 'Tâches restantes', value: tasks.filter(t => t.status !== 'Terminé').length, color: THEME.accent.blue },
          { label: 'Budget utilisé', value: project.budget?.allocated ? `${Math.round(project.budget.spent / project.budget.allocated * 100)}%` : '—', color: THEME.accent.green },
          { label: 'Échéance', value: project.due_date ? new Date(project.due_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—', color: THEME.text.secondary },
        ].map(stat => (
          <Card key={stat.label} style={{ padding: 14 }}>
            <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 6 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: stat.color, fontFamily: 'Rajdhani, sans-serif' }}>{stat.value}</div>
          </Card>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}><ProgressBar value={project.progress} height={6} /></div>
      <Card style={{ marginBottom: 20, padding: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: THEME.text.secondary, lineHeight: 1.6 }}>{project.description || <em style={{ color: THEME.text.muted }}>Aucune description</em>}</p>
        {(project.tags ?? []).length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {project.tags.map(tag => <span key={tag} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: THEME.accent.orangeDim, color: THEME.accent.orange, fontWeight: 600 }}>{tag}</span>)}
          </div>
        )}
      </Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani', letterSpacing: '0.03em' }}>Tâches</span>
        <Btn size="sm" variant="secondary" onClick={() => setShowNewTask(true)}>+ Tâche</Btn>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: THEME.text.muted, fontSize: 13 }}>Aucune tâche. Ajoutez-en une !</div>}
        {tasks.map(task => (
          <TaskRow key={task.id} task={task} team={team} onToggle={updateTaskStatus} onDelete={deleteTask} />
        ))}
      </div>
    </div>
  );

  const DiscussionPanel = () => (
    <div style={{ width: isMobile ? 'auto' : 320, flexShrink: 0, display: 'flex', flexDirection: 'column', borderLeft: isMobile ? 'none' : `1px solid ${THEME.border}`, flex: isMobile ? 1 : 'unset', minHeight: 0 }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>Discussion</span>
        <span style={{ fontSize: 11, color: THEME.text.muted }}>{comments.length} message{comments.length !== 1 ? 's' : ''}</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, gap: 8, padding: '20px 0' }}>
            <span style={{ fontSize: 28 }}>💬</span>
            <span style={{ fontSize: 12 }}>Démarrez la discussion !</span>
            <span style={{ fontSize: 11, color: THEME.text.muted, textAlign: 'center' }}>Utilisez @ pour notifier un membre</span>
          </div>
        )}
        {comments.map(c => {
          const member = c.team_members ?? team.find(m => m.id === (c.author_id ?? c.author));
          const isMe = (c.author_id ?? c.author) === currentMember?.id;
          return (
            <div key={c.id} style={{ display: 'flex', gap: 8, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              <Avatar member={member} size={26} />
              <div style={{ maxWidth: '78%' }}>
                {!isMe && <div style={{ fontSize: 10, fontWeight: 700, color: member?.color, marginBottom: 3 }}>{member?.name}</div>}
                <div style={{
                  background: isMe ? THEME.accent.orange : THEME.bg.card,
                  border: `1px solid ${isMe ? 'transparent' : THEME.border}`,
                  borderRadius: isMe ? '10px 3px 10px 10px' : '3px 10px 10px 10px',
                  padding: '8px 12px', fontSize: 12, color: isMe ? '#fff' : THEME.text.primary, lineHeight: 1.5,
                }}><CommentText text={c.text} team={team} /></div>
                <div style={{ fontSize: 9, color: THEME.text.muted, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{c.date} à {c.time}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${THEME.border}`, flexShrink: 0 }}>
        {currentMember ? (
          <MentionInput onSend={handleSendComment} placeholder="Message… @ pour notifier" team={team} currentMemberId={currentMember.id} />
        ) : (
          <div style={{ fontSize: 11, color: THEME.accent.red, textAlign: 'center', padding: '10px 0', background: THEME.accent.redDim, borderRadius: 8 }}>
            Compte non lié — mets à jour <code>auth_user_id</code> dans Supabase
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={project.name}
        subtitle={project.category}
        actions={<>
          <StatusBadge status={project.status} />
          <Btn size="sm" onClick={() => setShowEdit(true)}>Modifier</Btn>
        </>}
      />

      <div style={{ padding: '10px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: THEME.accent.orange, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >← Projets</button>
          <span style={{ color: THEME.text.muted, fontSize: 12 }}>/</span>
          <span style={{ color: THEME.text.secondary, fontSize: 12, fontWeight: 600 }}>{project.name}</span>
        </div>
        {isMobile && (
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            {[['tasks', 'Tâches'], ['discussion', 'Discussion']].map(([val, label]) => (
              <button key={val} onClick={() => setMobileTab(val)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mobileTab === val ? THEME.accent.orange : 'transparent', color: mobileTab === val ? '#fff' : THEME.text.secondary, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {isMobile ? (
          mobileTab === 'tasks' ? <StatsAndTasks /> : <DiscussionPanel />
        ) : (
          <>
            <StatsAndTasks />
            <DiscussionPanel />
          </>
        )}
      </div>

      {showEdit && (
        <ProjectForm
          project={project}
          team={team}
          onSubmit={(data) => updateProject(project.id, data)}
          onClose={() => setShowEdit(false)}
        />
      )}
      {showNewTask && (
        <TaskForm
          team={team}
          onSubmit={(data) => addTask(project.id, data)}
          onClose={() => setShowNewTask(false)}
        />
      )}
    </div>
  );
}

// ─── LIGNE DE TÂCHE ───────────────────────────────────────────────────────────

function TaskRow({ task, team, onToggle, onDelete }) {
  const [done, setDone] = useState(task.status === 'Terminé');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hov, setHov] = useState(false);
  const assigneeMember = team.find(m => m.id === (task.assignee_id ?? task.assignee));

  const toggle = async () => {
    const next = !done;
    setDone(next);
    await onToggle(task.id, next);
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8,
        background: THEME.bg.card,
        border: `1px solid ${confirmDelete ? THEME.accent.red + '55' : THEME.border}`,
        opacity: done ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      <button
        onClick={toggle}
        style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: done ? THEME.accent.green : 'transparent', border: `2px solid ${done ? THEME.accent.green : THEME.text.muted}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', transition: 'all 0.15s' }}
      >{done ? '✓' : ''}</button>

      <span style={{ flex: 1, fontSize: 13, color: THEME.text.primary, textDecoration: done ? 'line-through' : 'none' }}>{task.title}</span>

      <PriorityBadge priority={task.priority} />
      {assigneeMember && <Avatar member={assigneeMember} size={24} />}

      {/* Zone de suppression */}
      {confirmDelete ? (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: THEME.accent.red, fontWeight: 700 }}>Supprimer ?</span>
          <button
            onClick={() => onDelete(task.id)}
            style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '3px 9px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >Oui</button>
          <button
            onClick={() => setConfirmDelete(false)}
            style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '3px 9px', color: THEME.text.secondary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
          >Non</button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ background: 'transparent', border: 'none', color: hov ? THEME.text.muted : 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4, flexShrink: 0, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = THEME.accent.red}
          onMouseLeave={e => e.currentTarget.style.color = hov ? THEME.text.muted : 'transparent'}
        >×</button>
      )}
    </div>
  );
}
