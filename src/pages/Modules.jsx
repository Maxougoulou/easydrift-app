import { useState } from 'react';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, ProgressBar, Card, Btn, Spinner } from '../components/ui';
import { MentionInput, CommentText } from '../components/Notifications';
import { useAppContext } from '../lib/AppContext';
import { useMessages } from '../hooks/useMessages';

// ─── CALENDRIER ───────────────────────────────────────────────────────────────
export function CalendarModule() {
  const { events, loading } = useAppContext();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const adjustedFirstDay = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const eventsByDate = {};
  (events ?? []).forEach(e => {
    const d = e.date;
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(e);
  });

  let cells = Array(adjustedFirstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Calendrier"
        subtitle="Projets, maintenance, événements"
        actions={
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.text.secondary, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>‹</button>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, minWidth: 120, textAlign: 'center', fontFamily: 'Rajdhani', letterSpacing: '0.04em', textTransform: 'capitalize' }}>{monthName}</span>
            <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} style={{ background: 'transparent', border: `1px solid ${THEME.border}`, color: THEME.text.secondary, borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 14 }}>›</button>
          </div>
        }
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
          {dayLabels.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: THEME.text.muted, padding: '6px 0', letterSpacing: '0.06em' }}>{d}</div>)}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {week.map((day, di) => {
              if (!day) return <div key={di} />;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayEvents = eventsByDate[dateStr] ?? [];
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              return (
                <div key={di} style={{ minHeight: 72, background: THEME.bg.card, borderRadius: 8, border: `1px solid ${isToday ? THEME.accent.orange + '66' : THEME.border}`, padding: '6px 8px' }}>
                  <div style={{ fontSize: 12, fontWeight: isToday ? 900 : 600, color: isToday ? THEME.accent.orange : THEME.text.secondary, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isToday && <span style={{ width: 6, height: 6, borderRadius: '50%', background: THEME.accent.orange }} />}
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayEvents.slice(0, 2).map(evt => (
                      <div key={evt.id} style={{ fontSize: 9, fontWeight: 600, padding: '2px 5px', borderRadius: 3, background: `${evt.color}22`, color: evt.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', border: `1px solid ${evt.color}33` }}>{evt.title}</div>
                    ))}
                    {dayEvents.length > 2 && <div style={{ fontSize: 9, color: THEME.text.muted }}>+{dayEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[{ label: 'Projets', color: THEME.accent.orange }, { label: 'Maintenance', color: THEME.accent.blue }, { label: 'CT', color: THEME.accent.red }, { label: 'Événements', color: THEME.accent.purple }].map(l => (
            <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
              <span style={{ fontSize: 11, color: THEME.text.muted }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── BUDGET ───────────────────────────────────────────────────────────────────
export function BudgetModule() {
  const { projects, budget, loading } = useAppContext();
  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><TopBar title="Budget" subtitle="Chargement…" /><Spinner /></div>;

  const totalSpent = (budget?.categories ?? []).reduce((s, c) => s + c.amount, 0);
  const maxBar = Math.max(...(budget?.monthly ?? [{ income: 1, expenses: 1 }]).map(m => Math.max(m.income, m.expenses)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Budget" subtitle="Suivi financier des projets" actions={<Btn size="sm">+ Dépense</Btn>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total dépensé (projets)', value: `${projects.reduce((s, p) => s + (p.budget?.spent ?? 0), 0).toLocaleString('fr-FR')} €`, color: THEME.accent.red },
            { label: 'Budget alloué (projets)', value: `${projects.reduce((s, p) => s + (p.budget?.allocated ?? 0), 0).toLocaleString('fr-FR')} €`, color: THEME.accent.orange },
            { label: 'Budget disponible', value: `${(projects.reduce((s, p) => s + (p.budget?.allocated ?? 0), 0) - projects.reduce((s, p) => s + (p.budget?.spent ?? 0), 0)).toLocaleString('fr-FR')} €`, color: THEME.accent.green },
          ].map(k => (
            <Card key={k.label} style={{ padding: 16 }} hover={false}>
              <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: k.color, fontFamily: 'Rajdhani' }}>{k.value}</div>
            </Card>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
          <Card style={{ padding: '16px 20px' }} hover={false}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 16, fontFamily: 'Rajdhani' }}>Recettes vs Dépenses (mensuel)</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
              {(budget?.monthly ?? []).map(m => (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 130 }}>
                    <div style={{ width: 16, borderRadius: '4px 4px 0 0', height: `${(m.income / maxBar) * 120}px`, background: `linear-gradient(180deg, ${THEME.accent.green}, ${THEME.accent.green}88)`, minHeight: 4 }} />
                    <div style={{ width: 16, borderRadius: '4px 4px 0 0', height: `${(m.expenses / maxBar) * 120}px`, background: `linear-gradient(180deg, ${THEME.accent.orange}, ${THEME.accent.orange}88)`, minHeight: 4 }} />
                  </div>
                  <span style={{ fontSize: 10, color: THEME.text.muted }}>{m.month}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: THEME.accent.green, borderRadius: 2 }} /><span style={{ fontSize: 11, color: THEME.text.muted }}>Recettes</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 10, background: THEME.accent.orange, borderRadius: 2 }} /><span style={{ fontSize: 11, color: THEME.text.muted }}>Dépenses</span></div>
            </div>
          </Card>
          <Card style={{ padding: '16px 20px' }} hover={false}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, marginBottom: 16, fontFamily: 'Rajdhani' }}>Répartition des dépenses</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(budget?.categories ?? []).map(cat => (
                <div key={cat.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: THEME.text.secondary }}>{cat.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: cat.color, fontFamily: 'Rajdhani' }}>{cat.amount.toLocaleString('fr-FR')} €</span>
                  </div>
                  <ProgressBar value={totalSpent > 0 ? Math.round(cat.amount / totalSpent * 100) : 0} color={cat.color} height={5} />
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card style={{ marginTop: 16, padding: 0, overflow: 'hidden' }} hover={false}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${THEME.border}`, fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>Budget par projet</div>
          {projects.filter(p => (p.budget?.allocated ?? 0) > 0).map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 120px 120px 160px', padding: '12px 20px', borderBottom: `1px solid ${THEME.border}`, alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: THEME.text.primary, fontWeight: 600 }}>{p.name}</span>
              <span style={{ color: THEME.text.muted }}>{(p.budget?.allocated ?? 0).toLocaleString('fr-FR')} €</span>
              <span style={{ color: THEME.accent.orange }}>{(p.budget?.spent ?? 0).toLocaleString('fr-FR')} €</span>
              <span style={{ color: THEME.accent.green }}>{((p.budget?.allocated ?? 0) - (p.budget?.spent ?? 0)).toLocaleString('fr-FR')} €</span>
              <div style={{ width: '100%' }}><ProgressBar value={p.budget?.allocated ? Math.round(p.budget.spent / p.budget.allocated * 100) : 0} height={4} /></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export function MessagesModule() {
  const { projects, team, currentMember } = useAppContext();
  const [activeProject, setActiveProject] = useState(projects[0] ?? null);

  const { messages, loading: msgLoading, sendMessage } = useMessages(activeProject?.id);

  const handleSend = async (text, mentionIds) => {
    if (!currentMember) return;
    await sendMessage(currentMember.id, text);
  };

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ width: 240, borderRight: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: `1px solid ${THEME.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>Messages</div>
          <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>Par projet</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {projects.map(p => {
            const isActive = activeProject?.id === p.id;
            return (
              <button key={p.id} onClick={() => setActiveProject(p)} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: isActive ? THEME.accent.orangeDim : 'transparent', transition: 'all 0.15s', marginBottom: 2 }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isActive ? THEME.accent.orange : THEME.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>{p.name}</span>
                </div>
                <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 2 }}>{p.category}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeProject ? (
          <>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{activeProject.name}</div>
                <div style={{ fontSize: 11, color: THEME.text.muted }}>{activeProject.category} • {messages.length} messages</div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                {(activeProject.assignees ?? []).map(uid => { const m = team.find(t => t.id === uid); return m ? <Avatar key={uid} member={m} size={28} /> : null; })}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {msgLoading && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, fontSize: 13 }}>Chargement…</div>}
              {!msgLoading && messages.length === 0 && <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, fontSize: 13 }}>Démarrez la discussion !</div>}
              {messages.map(msg => {
                const member = msg.author ?? team.find(m => m.id === (msg.author_id));
                const isMe = (msg.author_id ?? msg.author?.id) === currentMember?.id;
                return (
                  <div key={msg.id} style={{ display: 'flex', gap: 10, flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                    <Avatar member={member} size={30} />
                    <div style={{ maxWidth: '65%' }}>
                      {!isMe && <div style={{ fontSize: 11, fontWeight: 700, color: member?.color, marginBottom: 4 }}>{member?.name}</div>}
                      <div style={{
                        background: isMe ? THEME.accent.orange : THEME.bg.card,
                        border: `1px solid ${isMe ? 'transparent' : THEME.border}`,
                        borderRadius: isMe ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                        padding: '10px 14px', fontSize: 13, color: isMe ? '#fff' : THEME.text.primary, lineHeight: 1.5,
                      }}><CommentText text={msg.text} team={team} /></div>
                      <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>{msg.time}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${THEME.border}` }}>
              <MentionInput onSend={handleSend} placeholder={`Message sur ${activeProject.name}…`} team={team} currentMemberId={currentMember?.id} />
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted }}>Sélectionnez un projet</div>
        )}
      </div>
    </div>
  );
}

// ─── GALERIE ──────────────────────────────────────────────────────────────────
export function GalleryModule() {
  const { projects } = useAppContext();
  const categories = ['Tous', ...new Set(projects.map(p => p.category))];
  const [filter, setFilter] = useState('Tous');
  const filtered = filter === 'Tous' ? projects : projects.filter(p => p.category === filter);
  const placeholderColors = ['#1a0a00', '#001a1a', '#0a0010', '#001000', '#1a1000'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Galerie" subtitle="Photos par projet et véhicule" actions={<Btn size="sm">+ Ajouter des photos</Btn>} />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilter(cat)} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === cat ? THEME.accent.orange : 'rgba(255,255,255,0.06)', color: filter === cat ? '#fff' : THEME.text.secondary, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{cat}</button>
          ))}
        </div>
        {filtered.map((p, pi) => (
          <div key={p.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <StatusBadge status={p.status} small />
              <span style={{ fontSize: 14, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{p.name}</span>
              <span style={{ fontSize: 11, color: THEME.text.muted, marginLeft: 4 }}>0 photos</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ height: 100, borderRadius: 8, cursor: 'pointer', background: `repeating-linear-gradient(45deg, ${placeholderColors[pi % placeholderColors.length]}, ${placeholderColors[pi % placeholderColors.length]} 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)`, border: `1px dashed ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 20, opacity: 0.3 }}>📷</span>
                  <span style={{ fontSize: 9, color: THEME.text.muted, fontFamily: 'monospace' }}>photo</span>
                </div>
              ))}
              <div style={{ height: 100, borderRadius: 8, cursor: 'pointer', border: `1px dashed ${THEME.border}`, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, fontSize: 22 }}>+</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
