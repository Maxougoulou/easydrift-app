import { useState } from 'react';
import { THEME } from '../lib/theme';
import { Modal, FormField, Input, Select, Textarea, FormActions } from './Modal';

// ─── PROJET ───────────────────────────────────────────────────────────────────
export function ProjectForm({ project, team, onSubmit, onClose }) {
  const editing = !!project;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: project?.name ?? '',
    status: project?.status ?? 'À faire',
    priority: project?.priority ?? 'Moyenne',
    category: project?.category ?? '',
    description: project?.description ?? '',
    due_date: project?.due_date ?? project?.dueDate ?? '',
    budget_allocated: project?.budget?.allocated ?? project?.budget_allocated ?? 0,
    budget_spent: project?.budget?.spent ?? project?.budget_spent ?? 0,
    progress: project?.progress ?? 0,
    tags: (project?.tags ?? []).join(', '),
    assignees: project?.assignees ?? [],
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const toggleAssignee = (id) => {
    set('assignees', form.assignees.includes(id) ? form.assignees.filter(a => a !== id) : [...form.assignees, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      name: form.name,
      status: form.status,
      priority: form.priority,
      category: form.category,
      description: form.description,
      due_date: form.due_date || null,
      budget_allocated: Number(form.budget_allocated),
      budget_spent: Number(form.budget_spent),
      progress: Number(form.progress),
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      assignees: form.assignees,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={editing ? 'Modifier le projet' : 'Nouveau projet'} onClose={onClose} width={580}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          <FormField label="Nom du projet" required>
            <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="BMW E46 — Build Drift" required />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Statut">
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                {['À faire', 'En attente', 'En cours', 'Terminé', 'Bloqué'].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Priorité">
              <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['Haute', 'Moyenne', 'Basse'].map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Catégorie">
              <Select value={form.category} onChange={e => set('category', e.target.value)}>
                <option value="">— Choisir —</option>
                {['Build véhicule', 'Partenariat', 'Application', 'Événement', 'Marketing', 'Autre'].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Échéance">
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Description">
            <Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Décrivez le projet…" />
          </FormField>
          <FormField label="Tags (séparés par des virgules)">
            <Input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="Drift, Build, Compétition" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <FormField label="Budget alloué (€)">
              <Input type="number" value={form.budget_allocated} onChange={e => set('budget_allocated', e.target.value)} min="0" />
            </FormField>
            <FormField label="Budget dépensé (€)">
              <Input type="number" value={form.budget_spent} onChange={e => set('budget_spent', e.target.value)} min="0" />
            </FormField>
            <FormField label="Avancement (%)">
              <Input type="number" value={form.progress} onChange={e => set('progress', e.target.value)} min="0" max="100" />
            </FormField>
          </div>
          <FormField label="Assignés">
            <div style={{ display: 'flex', gap: 8 }}>
              {team.map(m => {
                const active = form.assignees.includes(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggleAssignee(m.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 8,
                    border: `1px solid ${active ? m.color : THEME.border}`,
                    background: active ? `${m.color}18` : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${m.color}22`, border: `1.5px solid ${m.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: m.color }}>{m.avatar}</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? m.color : THEME.text.secondary }}>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitLabel={editing ? 'Enregistrer' : 'Créer le projet'} loading={loading} />
      </form>
    </Modal>
  );
}

// ─── TÂCHE ────────────────────────────────────────────────────────────────────
export function TaskForm({ team, onSubmit, onClose }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'Moyenne', assignee_id: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ title: form.title, priority: form.priority, assignee_id: form.assignee_id ? Number(form.assignee_id) : null, status: 'À faire' });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title="Ajouter une tâche" onClose={onClose} width={420}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          <FormField label="Titre de la tâche" required>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ex: Installer les amortisseurs" required />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Priorité">
              <Select value={form.priority} onChange={e => set('priority', e.target.value)}>
                {['Haute', 'Moyenne', 'Basse'].map(p => <option key={p} value={p}>{p}</option>)}
              </Select>
            </FormField>
            <FormField label="Assigné à">
              <Select value={form.assignee_id} onChange={e => set('assignee_id', e.target.value)}>
                <option value="">— Personne —</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel="Ajouter la tâche" loading={loading} />
      </form>
    </Modal>
  );
}

// ─── VÉHICULE ─────────────────────────────────────────────────────────────────
export function VehicleForm({ vehicle, onSubmit, onClose }) {
  const editing = !!vehicle;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: vehicle?.name ?? '',
    plate: vehicle?.plate ?? '',
    year: vehicle?.year ?? new Date().getFullYear(),
    mileage: vehicle?.mileage ?? 0,
    role: vehicle?.role ?? '',
    color: vehicle?.color ?? '#1a1a2e',
    status: vehicle?.status ?? 'Opérationnel',
    next_ct: vehicle?.next_ct ?? vehicle?.nextCT ?? '',
    last_ct_date: vehicle?.last_ct_date ?? vehicle?.lastCT?.date ?? '',
    last_ct_result: vehicle?.last_ct_result ?? vehicle?.lastCT?.result ?? 'Favorable',
    last_ct_center: vehicle?.last_ct_center ?? vehicle?.lastCT?.center ?? '',
    next_revision_mileage: vehicle?.next_revision_mileage ?? vehicle?.nextRevision?.mileage ?? 0,
    next_revision_date: vehicle?.next_revision_date ?? vehicle?.nextRevision?.date ?? '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      ...form,
      year: Number(form.year),
      mileage: Number(form.mileage),
      next_revision_mileage: Number(form.next_revision_mileage),
      next_ct: form.next_ct || null,
      last_ct_date: form.last_ct_date || null,
      next_revision_date: form.next_revision_date || null,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title={editing ? 'Modifier le véhicule' : 'Ajouter un véhicule'} onClose={onClose} width={580}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Nom" required>
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="BMW E46 330i" required />
            </FormField>
            <FormField label="Immatriculation">
              <Input value={form.plate} onChange={e => set('plate', e.target.value)} placeholder="EZ-046-DR" />
            </FormField>
            <FormField label="Année">
              <Input type="number" value={form.year} onChange={e => set('year', e.target.value)} />
            </FormField>
            <FormField label="Kilométrage">
              <Input type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} min="0" />
            </FormField>
            <FormField label="Rôle">
              <Input value={form.role} onChange={e => set('role', e.target.value)} placeholder="Voiture de drift principale" />
            </FormField>
            <FormField label="Statut">
              <Select value={form.status} onChange={e => set('status', e.target.value)}>
                {['Opérationnel', 'En préparation', 'Attention', 'Hors service'].map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </FormField>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Couleur d'affichage</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ width: 40, height: 32, borderRadius: 6, border: `1px solid ${THEME.border}`, cursor: 'pointer', background: 'transparent', padding: 2 }} />
              <span style={{ fontSize: 12, color: THEME.text.muted }}>{form.color}</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingTop: 8, borderTop: `1px solid ${THEME.border}` }}>Contrôle technique</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Dernier CT (date)">
              <Input type="date" value={form.last_ct_date} onChange={e => set('last_ct_date', e.target.value)} />
            </FormField>
            <FormField label="Résultat">
              <Select value={form.last_ct_result} onChange={e => set('last_ct_result', e.target.value)}>
                {['Favorable', 'Favorable avec observations', 'Défavorable'].map(r => <option key={r} value={r}>{r}</option>)}
              </Select>
            </FormField>
            <FormField label="Centre CT">
              <Input value={form.last_ct_center} onChange={e => set('last_ct_center', e.target.value)} placeholder="Autovision Lyon" />
            </FormField>
            <FormField label="Prochain CT">
              <Input type="date" value={form.next_ct} onChange={e => set('next_ct', e.target.value)} />
            </FormField>
          </div>
          <div style={{ fontSize: 11, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingTop: 8, borderTop: `1px solid ${THEME.border}` }}>Prochaine révision</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Kilométrage révision">
              <Input type="number" value={form.next_revision_mileage} onChange={e => set('next_revision_mileage', e.target.value)} min="0" />
            </FormField>
            <FormField label="Date prévue révision">
              <Input type="date" value={form.next_revision_date} onChange={e => set('next_revision_date', e.target.value)} />
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel={editing ? 'Enregistrer' : 'Ajouter le véhicule'} loading={loading} />
      </form>
    </Modal>
  );
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
export function MaintenanceForm({ team, onSubmit, onClose }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    km: '',
    type: 'Révision',
    parts: '',
    cost: '',
    technician_id: '',
    notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      date: form.date,
      km: Number(form.km),
      type: form.type,
      parts: form.parts.split(',').map(p => p.trim()).filter(Boolean),
      cost: Number(form.cost),
      technician_id: form.technician_id ? Number(form.technician_id) : null,
      notes: form.notes,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title="Ajouter une intervention" onClose={onClose} width={500}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </FormField>
            <FormField label="Kilométrage" required>
              <Input type="number" value={form.km} onChange={e => set('km', e.target.value)} placeholder="187450" required min="0" />
            </FormField>
            <FormField label="Type">
              <Select value={form.type} onChange={e => set('type', e.target.value)}>
                {['Révision', 'CT', 'Pièces', 'Réparation', 'Autre'].map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Coût (€)">
              <Input type="number" value={form.cost} onChange={e => set('cost', e.target.value)} placeholder="320" min="0" />
            </FormField>
          </div>
          <FormField label="Pièces (séparées par des virgules)">
            <Input value={form.parts} onChange={e => set('parts', e.target.value)} placeholder="Huile moteur 5W40, Filtre à huile…" />
          </FormField>
          <FormField label="Technicien">
            <Select value={form.technician_id} onChange={e => set('technician_id', e.target.value)}>
              <option value="">— Aucun —</option>
              {team.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Notes">
            <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Observations, remarques…" />
          </FormField>
        </div>
        <FormActions onCancel={onClose} submitLabel="Ajouter l'intervention" loading={loading} />
      </form>
    </Modal>
  );
}

// ─── ÉVÉNEMENT ────────────────────────────────────────────────────────────────
export function EventForm({ vehicles, projects, onSubmit, onClose }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    type: 'event',
    color: '#F07814',
    vehicle_id: '',
    project_id: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const typeColors = { project: '#F07814', maintenance: '#3B82F6', ct: '#EF4444', event: '#A855F7' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({
      title: form.title,
      date: form.date,
      type: form.type,
      color: typeColors[form.type] ?? form.color,
      vehicle_id: form.vehicle_id ? Number(form.vehicle_id) : null,
      project_id: form.project_id ? Number(form.project_id) : null,
    });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title="Ajouter un événement" onClose={onClose} width={460}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          <FormField label="Titre" required>
            <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Drift Masters Dijon" required />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Date" required>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
            </FormField>
            <FormField label="Type">
              <Select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="event">Événement</option>
                <option value="project">Projet</option>
                <option value="maintenance">Maintenance</option>
                <option value="ct">CT</option>
              </Select>
            </FormField>
            <FormField label="Projet lié">
              <Select value={form.project_id} onChange={e => set('project_id', e.target.value)}>
                <option value="">— Aucun —</option>
                {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </FormField>
            <FormField label="Véhicule lié">
              <Select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)}>
                <option value="">— Aucun —</option>
                {(vehicles ?? []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitLabel="Ajouter l'événement" loading={loading} />
      </form>
    </Modal>
  );
}

// ─── DÉPENSE BUDGET ───────────────────────────────────────────────────────────
export function BudgetForm({ onSubmit, onClose }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('category'); // 'category' | 'monthly'
  const [form, setForm] = useState({ name: '', amount: '', color: '#F07814', month: '', income: '', expenses: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit({ mode, ...form });
    setLoading(false);
    onClose();
  };

  return (
    <Modal title="Ajouter une entrée budget" onClose={onClose} width={420}>
      <form onSubmit={handleSubmit}>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3 }}>
            {[['category', 'Catégorie de dépense'], ['monthly', 'Mois recettes/dépenses']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => setMode(val)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mode === val ? THEME.accent.orange : 'transparent', color: mode === val ? '#fff' : THEME.text.secondary, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>{label}</button>
            ))}
          </div>
          {mode === 'category' ? (
            <>
              <FormField label="Nom de la catégorie" required>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Pièces & Mécanique" required />
              </FormField>
              <FormField label="Montant (€)">
                <Input type="number" value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="1500" min="0" />
              </FormField>
              <FormField label="Couleur">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={form.color} onChange={e => set('color', e.target.value)} style={{ width: 40, height: 32, borderRadius: 6, border: `1px solid ${THEME.border}`, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: 12, color: THEME.text.muted }}>{form.color}</span>
                </div>
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Mois" required>
                <Input value={form.month} onChange={e => set('month', e.target.value)} placeholder="Jun" required />
              </FormField>
              <FormField label="Recettes (€)">
                <Input type="number" value={form.income} onChange={e => set('income', e.target.value)} placeholder="5000" min="0" />
              </FormField>
              <FormField label="Dépenses (€)">
                <Input type="number" value={form.expenses} onChange={e => set('expenses', e.target.value)} placeholder="3000" min="0" />
              </FormField>
            </>
          )}
        </div>
        <FormActions onCancel={onClose} submitLabel="Ajouter" loading={loading} />
      </form>
    </Modal>
  );
}
