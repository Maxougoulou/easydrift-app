import { useState, useRef, useEffect } from 'react';
import { THEME, STATUS_CONFIG, PRIORITY_CONFIG } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, PriorityBadge, ProgressBar, Card, Btn, Spinner } from '../components/ui';
import { MentionInput, CommentText } from '../components/Notifications';
import { ProjectForm, TaskForm } from '../components/Forms';
import { useAppContext } from '../lib/AppContext';
import { useProjectAttachments } from '../hooks/useProjects';

const WORKSPACES = [
  { id: 'easydrift', label: 'EasyDrift', color: THEME.accent.orange },
  { id: 'toyah_games', label: 'Toyah Games', color: THEME.accent.purple },
];

export function ProjectsModule() {
  const { projects, loading, createProject, updateProject, deleteProject, updateTaskStatus, addTask, deleteTask, addComment, team, currentMember, workspace, setWorkspace, isMobile } = useAppContext();
  const [view, setView] = useState('kanban');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectStatus, setNewProjectStatus] = useState('À faire');

  const filteredProjects = projects.filter(p => (p.workspace ?? 'easydrift') === workspace);
  const activeWs = WORKSPACES.find(w => w.id === workspace) ?? WORKSPACES[0];

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
        subtitle={`${filteredProjects.length} projets • ${filteredProjects.filter(p => p.status === 'En cours').length} en cours`}
        actions={
          <>
            {!isMobile && (
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {['kanban', 'list'].map(v => (
                <button key={v} onClick={() => setView(v)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: view === v ? THEME.accent.orange : 'transparent', color: view === v ? '#fff' : THEME.text.secondary, fontSize: 12, fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit' }}>
                  {v === 'kanban' ? '⬛ Kanban' : '☰ Liste'}
                </button>
              ))}
            </div>
          )}
            <Btn size="sm" onClick={() => { setNewProjectStatus('À faire'); setShowNewProject(true); }}>{isMobile ? '+ Projet' : '+ Nouveau projet'}</Btn>
          </>
        }
      />

      {/* Workspace switcher — shown on mobile (sidebar sub-menu not visible) or when sidebar is collapsed */}
      {isMobile && (
        <div style={{ display: 'flex', padding: '8px 16px', borderBottom: `1px solid ${THEME.border}`, gap: 6, flexShrink: 0 }}>
          {WORKSPACES.map(ws => {
            const isActive = workspace === ws.id;
            return (
              <button
                key={ws.id}
                onClick={() => setWorkspace(ws.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: isActive ? `${ws.color}20` : 'rgba(255,255,255,0.04)',
                  color: isActive ? ws.color : THEME.text.muted,
                  fontSize: 12, fontWeight: isActive ? 700 : 500,
                  fontFamily: 'inherit', transition: 'all 0.15s',
                  outline: isActive ? `1px solid ${ws.color}44` : 'none',
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? ws.color : THEME.text.muted, flexShrink: 0 }} />
                {ws.label}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'hidden', padding: isMobile ? '12px 8px' : '20px 24px' }}>
        {view === 'kanban'
          ? <KanbanView
              projects={filteredProjects}
              team={team}
              onSelectProject={setSelectedProject}
              onAddProject={(status) => { setNewProjectStatus(status); setShowNewProject(true); }}
              onMoveProject={(id, status) => updateProject(id, { status })}
              onDeleteProject={deleteProject}
            />
          : <ListView projects={filteredProjects} team={team} onSelectProject={setSelectedProject} onDeleteProject={deleteProject} />
        }
      </div>

      {showNewProject && (
        <ProjectForm
          team={team}
          onSubmit={(data) => createProject({ ...data, status: newProjectStatus, workspace })}
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
    <div style={{ overflow: 'auto', height: '100%' }}>
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 680 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 100px 140px 80px 32px', padding: '8px 16px', marginBottom: 4, fontSize: 10, color: THEME.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600 }}>
        <span>Projet</span><span>Statut</span><span>Priorité</span><span>Avancement</span><span>Responsable</span><span>Échéance</span><span />
      </div>
      {projects.map(project => <ListRow key={project.id} project={project} team={team} onClick={() => onSelectProject(project)} onDelete={onDeleteProject} />)}
    </div>
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

// ─── DÉTAIL PROJET — style Notion ─────────────────────────────────────────────

function NotionProp({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 32, padding: '4px 0', borderBottom: `1px solid rgba(255,255,255,0.04)` }}>
      <span style={{ fontSize: 11, color: THEME.text.muted, width: 100, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function InlineSelect({ value, options, renderValue, renderOption, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 5, padding: '2px 6px', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        {renderValue(value)}
        <span style={{ fontSize: 9, color: THEME.text.muted, lineHeight: 1 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 500, background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.55)', minWidth: 160 }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{ padding: '8px 14px', cursor: 'pointer', background: opt === value ? 'rgba(255,255,255,0.05)' : 'transparent', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = opt === value ? 'rgba(255,255,255,0.05)' : 'transparent'}
            >{renderOption(opt)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDetail({ project, onBack, team, currentMember, updateTaskStatus, deleteTask, addTask, addComment, updateProject }) {
  const { isMobile, addNotification } = useAppContext();
  const { attachments, uploading, upload, remove: removeAttachment } = useProjectAttachments(project.id);
  const [showEdit, setShowEdit] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [contentTab, setContentTab] = useState('tasks');
  const [mobileTab, setMobileTab] = useState('main');
  const fileInputRef = useRef(null);

  const comments = project.comments ?? [];
  const tasks    = project.tasks ?? [];
  const doneTasks = tasks.filter(t => t.status === 'Terminé').length;
  const daysLeft  = project.due_date ? Math.ceil((new Date(project.due_date) - new Date()) / 86400000) : null;

  const handleSendComment = async (text, mentionIds = []) => {
    if (!currentMember) return;
    await addComment(project.id, currentMember.id, text);
    for (const memberId of mentionIds) {
      if (memberId !== currentMember.id) {
        await addNotification({ type: 'mention', from: currentMember.id, to: memberId, text: `${currentMember.name} t'a mentionné dans « ${project.name} »`, detail: text, projectId: project.id });
      }
    }
  };

  const STATUSES   = ['À faire', 'En attente', 'En cours', 'Terminé', 'Bloqué'];
  const PRIORITIES = ['Haute', 'Moyenne', 'Basse'];

  // ── Panneau gauche : titre + contenu ──────────────────────────────────────
  const mainContent = (
    <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '24px 18px' : '40px 52px', minWidth: 0 }}>

      {/* Grand titre */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: isMobile ? 26 : 34, fontWeight: 900, fontFamily: 'Rajdhani, sans-serif', color: THEME.text.primary, lineHeight: 1.15, marginBottom: 10 }}>
          {project.name}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {project.category && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: THEME.accent.orangeDim, color: THEME.accent.orange, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              {project.category}
            </span>
          )}
          {(project.tags ?? []).map(tag => (
            <span key={tag} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: THEME.text.muted, border: `1px solid rgba(255,255,255,0.08)` }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Barre de progression */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 11, color: THEME.text.muted }}>Avancement</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: THEME.accent.orange, fontFamily: 'Rajdhani' }}>{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} height={5} />
      </div>

      {/* Description */}
      {project.description && (
        <div style={{ marginBottom: 28, padding: '14px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', borderLeft: `3px solid rgba(240,120,20,0.35)` }}>
          <p style={{ margin: 0, fontSize: 13, color: THEME.text.secondary, lineHeight: 1.75 }}>{project.description}</p>
        </div>
      )}

      {/* Tab bar tâches / documents */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
          {[['tasks', `Tâches (${tasks.length})`], ['documents', `Documents${attachments.length > 0 ? ` (${attachments.length})` : ''}`]].map(([val, label]) => (
            <button key={val} onClick={() => setContentTab(val)} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', background: contentTab === val ? THEME.accent.orange : 'transparent', color: contentTab === val ? '#fff' : THEME.text.secondary, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{label}</button>
          ))}
        </div>
        {contentTab === 'tasks' && <Btn size="sm" variant="secondary" onClick={() => setShowNewTask(true)}>+ Tâche</Btn>}
        {contentTab === 'documents' && (
          <>
            <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={async (e) => { const f = e.target.files?.[0]; if (f && currentMember) { await upload(f, currentMember.id); e.target.value = ''; } }} />
            <Btn size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>{uploading ? 'Envoi…' : '+ Fichier'}</Btn>
          </>
        )}
      </div>

      {contentTab === 'tasks' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.length === 0 && <div style={{ textAlign: 'center', padding: '32px 0', color: THEME.text.muted, fontSize: 13 }}>Aucune tâche — cliquez sur + Tâche !</div>}
          {tasks.map(task => <TaskRow key={task.id} task={task} team={team} onToggle={updateTaskStatus} onDelete={deleteTask} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {attachments.length === 0 && !uploading && <div style={{ textAlign: 'center', padding: '32px 0', color: THEME.text.muted, fontSize: 13 }}>Aucun fichier joint.</div>}
          {uploading && <div style={{ textAlign: 'center', padding: 16, color: THEME.text.muted, fontSize: 12 }}>Envoi en cours…</div>}
          {attachments.map(att => <AttachmentRow key={att.id} att={att} onDelete={() => removeAttachment(att)} />)}
        </div>
      )}
    </div>
  );

  // ── Panneau droit : propriétés + discussion ────────────────────────────────
  const sidePanel = (
    <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, borderLeft: isMobile ? 'none' : `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Propriétés */}
      <div style={{ padding: '22px 18px 16px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 10 }}>Propriétés</div>

        <NotionProp label="Statut">
          <InlineSelect
            value={project.status ?? 'À faire'}
            options={STATUSES}
            renderValue={(s) => <StatusBadge status={s} small />}
            renderOption={(s) => <StatusBadge status={s} small />}
            onChange={(s) => updateProject(project.id, { status: s })}
          />
        </NotionProp>

        <NotionProp label="Priorité">
          <InlineSelect
            value={project.priority ?? 'Moyenne'}
            options={PRIORITIES}
            renderValue={(p) => {
              const cfg = PRIORITY_CONFIG[p];
              return cfg ? <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span> : <span style={{ fontSize: 11, color: THEME.text.muted }}>—</span>;
            }}
            renderOption={(p) => {
              const cfg = PRIORITY_CONFIG[p];
              return cfg ? <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span> : <span>{p}</span>;
            }}
            onChange={(p) => updateProject(project.id, { priority: p })}
          />
        </NotionProp>

        <NotionProp label="Responsables">
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {(project.assignees ?? []).length === 0
              ? <span style={{ fontSize: 12, color: THEME.text.muted }}>—</span>
              : (project.assignees ?? []).map(uid => { const m = team.find(t => t.id === uid); return m ? <Avatar key={uid} member={m} size={22} showName /> : null; })}
          </div>
        </NotionProp>

        <NotionProp label="Échéance">
          <span style={{ fontSize: 12, fontWeight: daysLeft !== null ? 600 : 400, color: daysLeft !== null && daysLeft < 0 ? THEME.accent.red : daysLeft !== null && daysLeft < 7 ? THEME.accent.yellow : THEME.text.secondary }}>
            {project.due_date ? new Date(project.due_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
            {daysLeft !== null && (
              <span style={{ fontSize: 10, marginLeft: 6, opacity: 0.7 }}>
                {daysLeft < 0 ? `(${Math.abs(daysLeft)}j dépassé)` : daysLeft === 0 ? '(auj.)' : `(dans ${daysLeft}j)`}
              </span>
            )}
          </span>
        </NotionProp>

        {(project.budget?.allocated ?? 0) > 0 && (
          <NotionProp label="Budget">
            <span style={{ fontSize: 12, color: THEME.text.secondary }}>
              {(project.budget.spent ?? 0).toLocaleString('fr-FR')} € / {project.budget.allocated.toLocaleString('fr-FR')} €
            </span>
          </NotionProp>
        )}

        <NotionProp label="Tâches">
          <span style={{ fontSize: 12, color: THEME.text.secondary }}>{doneTasks}/{tasks.length} terminées</span>
        </NotionProp>

        <div style={{ marginTop: 14 }}>
          <Btn size="sm" variant="secondary" onClick={() => setShowEdit(true)} style={{ width: '100%', justifyContent: 'center' }}>Modifier le projet</Btn>
        </div>
      </div>

      {/* Discussion */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.09em' }}>Discussion</span>
        {comments.length > 0 && <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.07)', color: THEME.text.muted, borderRadius: 8, padding: '0 6px', fontWeight: 600 }}>{comments.length}</span>}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, gap: 6, padding: '24px 0', opacity: 0.6 }}>
            <span style={{ fontSize: 22 }}>💬</span>
            <span style={{ fontSize: 11 }}>Démarrez la discussion</span>
          </div>
        )}
        {comments.map(c => {
          const member = c.team_members ?? team.find(m => m.id === (c.author_id ?? c.author));
          const isMe = (c.author_id ?? c.author) === currentMember?.id;
          return (
            <div key={c.id} style={{ display: 'flex', gap: 7, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              <Avatar member={member} size={24} />
              <div style={{ maxWidth: '80%' }}>
                {!isMe && <div style={{ fontSize: 10, fontWeight: 700, color: member?.color, marginBottom: 3 }}>{member?.name}</div>}
                <div style={{ background: isMe ? THEME.accent.orange : THEME.bg.card, border: `1px solid ${isMe ? 'transparent' : THEME.border}`, borderRadius: isMe ? '10px 3px 10px 10px' : '3px 10px 10px 10px', padding: '7px 11px', fontSize: 12, color: isMe ? '#fff' : THEME.text.primary, lineHeight: 1.5 }}>
                  <CommentText text={c.text} team={team} />
                </div>
                <div style={{ fontSize: 9, color: THEME.text.muted, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{c.date} à {c.time}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: '10px 12px', borderTop: `1px solid ${THEME.border}`, flexShrink: 0 }}>
        {currentMember
          ? <MentionInput onSend={handleSendComment} placeholder="Message… @ pour notifier" team={team} currentMemberId={currentMember.id} />
          : <div style={{ fontSize: 11, color: THEME.accent.red, textAlign: 'center', padding: '10px 0', background: THEME.accent.redDim, borderRadius: 8 }}>Compte non lié — mets à jour auth_user_id dans Supabase</div>
        }
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header slim */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 24px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: THEME.accent.orange, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}>← Projets</button>
          <span style={{ color: THEME.text.muted, fontSize: 12 }}>/</span>
          <span style={{ color: THEME.text.muted, fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
        </div>
        {isMobile && (
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            {[['main', 'Tâches'], ['side', 'Infos']].map(([val, label]) => (
              <button key={val} onClick={() => setMobileTab(val)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mobileTab === val ? THEME.accent.orange : 'transparent', color: mobileTab === val ? '#fff' : THEME.text.secondary, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Corps */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {isMobile
          ? mobileTab === 'main' ? mainContent : sidePanel
          : <>{mainContent}{sidePanel}</>
        }
      </div>

      {showEdit    && <ProjectForm project={project} team={team} onSubmit={(data) => updateProject(project.id, data)} onClose={() => setShowEdit(false)} />}
      {showNewTask && <TaskForm team={team} onSubmit={(data) => addTask(project.id, data)} onClose={() => setShowNewTask(false)} />}
    </div>
  );
}

// ─── PIÈCE JOINTE ────────────────────────────────────────────────────────────

function AttachmentRow({ att, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hov, setHov] = useState(false);
  const ext = att.name.split('.').pop().toUpperCase().slice(0, 4);
  const sizeStr = att.size
    ? att.size < 1024 * 1024
      ? `${(att.size / 1024).toFixed(0)} Ko`
      : `${(att.size / 1024 / 1024).toFixed(1)} Mo`
    : '';
  const dateStr = att.created_at ? new Date(att.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        background: THEME.bg.card,
        border: `1px solid ${hov ? 'rgba(240,120,20,0.2)' : THEME.border}`,
        borderRadius: 8, transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 6, flexShrink: 0,
        background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: THEME.text.muted, letterSpacing: '0.03em',
      }}>{ext}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
        <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 2 }}>{[sizeStr, dateStr].filter(Boolean).join(' · ')}</div>
      </div>
      <a href={att.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 600, textDecoration: 'none', flexShrink: 0, padding: '4px 8px', borderRadius: 5, background: THEME.accent.orangeDim }}>
        Ouvrir
      </a>
      {confirmDelete ? (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button onClick={onDelete} style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '3px 9px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
          <button onClick={() => setConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '3px 9px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
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
