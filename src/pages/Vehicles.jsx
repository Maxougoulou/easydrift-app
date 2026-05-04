import { useState } from 'react';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, Btn, Card, Spinner } from '../components/ui';
import { VehicleForm, MaintenanceForm, EventForm, DocumentForm } from '../components/Forms';
import { useAppContext } from '../lib/AppContext';
import { useVehicleDocs } from '../hooks/useVehicles';

export function VehiclesModule() {
  const { vehicles, loading, projects, createVehicle, createEvent } = useAppContext();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showPlanEvent, setShowPlanEvent] = useState(false);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}><TopBar title="Véhicules" subtitle="Chargement…" /><Spinner /></div>;

  if (selectedVehicle) {
    const fresh = vehicles.find(v => v.id === selectedVehicle.id) ?? selectedVehicle;
    return <VehicleDetail vehicle={fresh} onBack={() => setSelectedVehicle(null)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Véhicules"
        subtitle={`${vehicles.length} véhicules dans la flotte`}
        actions={<Btn size="sm" onClick={() => setShowAddVehicle(true)}>+ Ajouter un véhicule</Btn>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <AlertsBar vehicles={vehicles} onPlanify={() => setShowPlanEvent(true)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 20 }}>
          {vehicles.map(v => <VehicleCard key={v.id} vehicle={v} onClick={() => setSelectedVehicle(v)} />)}
        </div>
      </div>
      {showAddVehicle && (
        <VehicleForm onSubmit={createVehicle} onClose={() => setShowAddVehicle(false)} />
      )}
      {showPlanEvent && (
        <EventForm vehicles={vehicles} projects={projects} onSubmit={createEvent} onClose={() => setShowPlanEvent(false)} />
      )}
    </div>
  );
}

function AlertsBar({ vehicles, onPlanify }) {
  const today = new Date();
  const alerts = [];
  vehicles.forEach(v => {
    const ctDate = new Date(v.nextCT);
    const revDate = new Date(v.nextRevision?.date);
    const ctDays = Math.ceil((ctDate - today) / 86400000);
    const revDays = Math.ceil((revDate - today) / 86400000);
    if (ctDays < 90) alerts.push({ type: 'CT', vehicle: v.name, days: ctDays, severity: ctDays < 30 ? 'high' : 'medium' });
    if (revDays < 60) alerts.push({ type: 'Révision', vehicle: v.name, days: revDays, severity: revDays < 14 ? 'high' : 'medium' });
  });
  if (!alerts.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, color: THEME.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>⚠ Alertes maintenance</div>
      {alerts.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: a.severity === 'high' ? THEME.accent.redDim : THEME.accent.yellowDim, border: `1px solid ${a.severity === 'high' ? THEME.accent.red + '44' : THEME.accent.yellow + '44'}` }}>
          <span style={{ fontSize: 16 }}>{a.severity === 'high' ? '🔴' : '🟡'}</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{a.vehicle}</span>
            <span style={{ fontSize: 12, color: THEME.text.secondary, marginLeft: 8 }}>
              {a.type} dans <strong style={{ color: a.severity === 'high' ? THEME.accent.red : THEME.accent.yellow }}>{a.days} jours</strong>
            </span>
          </div>
          <Btn size="sm" variant="secondary" style={{ marginLeft: 'auto' }} onClick={onPlanify}>Planifier</Btn>
        </div>
      ))}
    </div>
  );
}

function VehicleCard({ vehicle, onClick }) {
  const [hov, setHov] = useState(false);
  const today = new Date();
  const ctDays = Math.ceil((new Date(vehicle.nextCT) - today) / 86400000);
  const revDays = Math.ceil((new Date(vehicle.nextRevision?.date) - today) / 86400000);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? THEME.bg.cardHover : THEME.bg.card, border: `1px solid ${hov ? 'rgba(240,120,20,0.3)' : THEME.border}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s ease' }}
    >
      <div style={{ height: 100, background: `linear-gradient(135deg, ${vehicle.color} 0%, #0D0D0F 100%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${THEME.border}` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%)`, backgroundSize: '20px 20px' }} />
        <div style={{ fontSize: 40, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>🚗</div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}><StatusBadge status={vehicle.status} small /></div>
        <div style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.15em', fontFamily: 'Rajdhani, sans-serif' }}>{vehicle.plate}</div>
      </div>
      <div style={{ padding: '14px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: THEME.text.primary, marginBottom: 2, fontFamily: 'Rajdhani, sans-serif' }}>{vehicle.name}</div>
        <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 14 }}>{vehicle.role} • {vehicle.year}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 2 }}>KILOMÉTRAGE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{vehicle.mileage.toLocaleString('fr-FR')} km</div>
          </div>
          <div style={{ background: ctDays < 30 ? THEME.accent.redDim : ctDays < 90 ? THEME.accent.yellowDim : 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 2 }}>PROCHAIN CT</div>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'Rajdhani', color: ctDays < 30 ? THEME.accent.red : ctDays < 90 ? THEME.accent.yellow : THEME.accent.green }}>
              {new Date(vehicle.nextCT).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: THEME.text.muted, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
          <span>Prochaine révision</span>
          <span style={{ fontWeight: 700, color: revDays < 14 ? THEME.accent.red : revDays < 30 ? THEME.accent.yellow : THEME.text.secondary }}>
            {vehicle.nextRevision?.mileage?.toLocaleString('fr-FR')} km
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DÉTAIL VÉHICULE ──────────────────────────────────────────────────────────

function VehicleDetail({ vehicle, onBack }) {
  const { team, updateVehicle, deleteVehicle, addMaintenance, deleteMaintenance, vehicles, projects, createEvent, isMobile } = useAppContext();
  const [activeTab, setActiveTab] = useState('history');
  const [showEdit, setShowEdit] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showPlanEvent, setShowPlanEvent] = useState(false);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState(false);
  const tabs = ['history', 'parts', 'documents'];
  const tabLabels = { history: 'Historique', parts: 'Pièces installées', documents: 'Documents' };
  const totalCost = (vehicle.maintenance ?? []).reduce((s, m) => s + m.cost, 0);

  const handleDeleteVehicle = async () => {
    await deleteVehicle(vehicle.id);
    onBack();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={vehicle.name}
        subtitle={`${vehicle.plate} • ${vehicle.year} • ${vehicle.mileage.toLocaleString('fr-FR')} km`}
        actions={<>
          <StatusBadge status={vehicle.status} />
          <Btn size="sm" variant="secondary" onClick={() => setShowEdit(true)}>✏ Modifier</Btn>
          <Btn size="sm" onClick={() => setShowAddMaintenance(true)}>+ Intervention</Btn>
        </>}
      />

      {/* Fil d'Ariane */}
      <div style={{ padding: '10px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: THEME.accent.orange, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >← Véhicules</button>
          <span style={{ color: THEME.text.muted, fontSize: 12 }}>/</span>
          <span style={{ color: THEME.text.secondary, fontSize: 12, fontWeight: 600 }}>{vehicle.name}</span>
        </div>
        {/* Suppression véhicule */}
        {confirmDeleteVehicle ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.accent.red, fontWeight: 700 }}>Supprimer définitivement ?</span>
            <button onClick={handleDeleteVehicle} style={{ background: THEME.accent.red, border: 'none', borderRadius: 6, padding: '4px 12px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui, supprimer</button>
            <button onClick={() => setConfirmDeleteVehicle(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '4px 12px', color: THEME.text.secondary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeleteVehicle(true)}
            style={{ background: 'none', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '4px 10px', color: THEME.text.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.accent.red; e.currentTarget.style.color = THEME.accent.red; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = THEME.border; e.currentTarget.style.color = THEME.text.muted; }}
          >Supprimer</button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'CT Dernier', value: new Date(vehicle.lastCT?.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }), sub: vehicle.lastCT?.result, color: vehicle.lastCT?.result === 'Favorable' ? THEME.accent.green : THEME.accent.yellow },
            { label: 'Prochain CT', value: new Date(vehicle.nextCT).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }), sub: `dans ${Math.ceil((new Date(vehicle.nextCT) - new Date()) / 86400000)} jours`, color: THEME.accent.orange },
            { label: 'Prochaine révision', value: `${vehicle.nextRevision?.mileage?.toLocaleString('fr-FR')} km`, sub: new Date(vehicle.nextRevision?.date).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }), color: THEME.accent.blue },
            { label: 'Coût total maintenance', value: `${totalCost.toLocaleString('fr-FR')} €`, sub: `${vehicle.maintenance?.length ?? 0} interventions`, color: THEME.text.primary },
          ].map(stat => (
            <Card key={stat.label} style={{ padding: 14 }}>
              <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: stat.color, fontFamily: 'Rajdhani' }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 2 }}>{stat.sub}</div>
            </Card>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeTab === tab ? THEME.accent.orange : 'transparent', color: activeTab === tab ? '#fff' : THEME.text.secondary, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{tabLabels[tab]}</button>
          ))}
        </div>

        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(vehicle.maintenance ?? []).map((entry, idx) => (
              <MaintenanceRow
                key={entry.id}
                entry={entry}
                team={team}
                isLast={idx === vehicle.maintenance.length - 1}
                onDelete={deleteMaintenance}
              />
            ))}
            {(vehicle.maintenance ?? []).length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: THEME.text.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
                <div style={{ marginBottom: 12 }}>Aucune intervention enregistrée</div>
                <Btn size="sm" onClick={() => setShowAddMaintenance(true)}>+ Ajouter une intervention</Btn>
              </div>
            )}
          </div>
        )}

        {activeTab === 'parts' && (() => {
          const allParts = (vehicle.maintenance ?? []).flatMap(m => (m.parts ?? []).map(p => ({ part: p, date: m.date, km: m.km }))).filter(p => p.part);
          return allParts.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: THEME.text.muted }}>Aucune pièce enregistrée.</div>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allParts.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: THEME.bg.card, border: `1px solid ${THEME.border}` }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: THEME.accent.orange, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: THEME.text.primary }}>{p.part}</span>
                    <span style={{ fontSize: 11, color: THEME.text.muted }}>{new Date(p.date).toLocaleDateString('fr-FR')} • {p.km.toLocaleString('fr-FR')} km</span>
                  </div>
                ))}
              </div>;
        })()}

        {activeTab === 'documents' && (
          <DocumentsTab vehicleId={vehicle.id} />
        )}
      </div>

      {showEdit && (
        <VehicleForm vehicle={vehicle} onSubmit={(data) => updateVehicle(vehicle.id, data)} onClose={() => setShowEdit(false)} />
      )}
      {showAddMaintenance && (
        <MaintenanceForm team={team} onSubmit={(data) => addMaintenance(vehicle.id, data)} onClose={() => setShowAddMaintenance(false)} />
      )}
      {showPlanEvent && (
        <EventForm vehicles={vehicles} projects={projects} onSubmit={createEvent} onClose={() => setShowPlanEvent(false)} />
      )}
    </div>
  );
}

// ─── ONGLET DOCUMENTS ────────────────────────────────────────────────────────

function DocumentsTab({ vehicleId }) {
  const { docs, loading, addDoc, deleteDoc } = useVehicleDocs(vehicleId);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const typeIcons = { document: '📄', facture: '🧾', contrat: '📋', assurance: '🛡', autre: '📎' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: THEME.text.muted }}>Chargement…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Btn size="sm" onClick={() => setShowAddDoc(true)}>+ Ajouter un document</Btn>
      </div>
      {docs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.text.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 13 }}>Aucun document enregistré</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {docs.map(doc => (
          <div
            key={doc.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
              borderRadius: 10, background: THEME.bg.card,
              border: `1px solid ${confirmDelete === doc.id ? THEME.accent.red + '55' : THEME.border}`,
              transition: 'border-color 0.2s',
            }}
          >
            <span style={{ fontSize: 22 }}>{typeIcons[doc.type] ?? '📎'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
              <div style={{ fontSize: 11, color: THEME.text.muted, textTransform: 'capitalize' }}>{doc.type}</div>
            </div>
            {doc.url && (
              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}>Ouvrir →</a>
            )}
            {confirmDelete === doc.id ? (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={() => { deleteDoc(doc.id); setConfirmDelete(null); }} style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
                <button onClick={() => setConfirmDelete(null)} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '3px 8px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(doc.id)} style={{ background: 'transparent', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4, flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = THEME.accent.red}
                onMouseLeave={e => e.currentTarget.style.color = THEME.text.muted}
              >×</button>
            )}
          </div>
        ))}
      </div>
      {showAddDoc && (
        <DocumentForm onSubmit={addDoc} onClose={() => setShowAddDoc(false)} />
      )}
    </div>
  );
}

// ─── LIGNE MAINTENANCE ────────────────────────────────────────────────────────

function MaintenanceRow({ entry, team, isLast, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hov, setHov] = useState(false);
  const typeColors = { 'Révision': THEME.accent.orange, 'CT': THEME.accent.green, 'Pièces': THEME.accent.blue };
  const color = typeColors[entry.type] ?? THEME.text.muted;
  const techMember = team.find(m => m.id === (entry.technician_id ?? entry.technician));

  return (
    <div style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, border: `2px solid ${color}`, flexShrink: 0, marginTop: 4 }} />
        {!isLast && <div style={{ flex: 1, width: 2, background: THEME.border, minHeight: 24, marginTop: 4 }} />}
      </div>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
        style={{ flex: 1, background: THEME.bg.card, border: `1px solid ${confirmDelete ? THEME.accent.red + '55' : THEME.border}`, borderRadius: 10, padding: '12px 14px', transition: 'border-color 0.2s' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${color}22`, color, letterSpacing: '0.05em' }}>{entry.type}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{entry.km.toLocaleString('fr-FR')} km</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.text.muted }}>{new Date(entry.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.accent.orange, fontFamily: 'Rajdhani' }}>{entry.cost} €</span>
            {/* Bouton suppression */}
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button
                  onClick={() => onDelete(entry.id)}
                  style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                >Oui</button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '3px 8px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                >Non</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'transparent', border: 'none', color: hov ? THEME.text.muted : 'transparent', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '1px 4px', borderRadius: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = THEME.accent.red}
                onMouseLeave={e => e.currentTarget.style.color = hov ? THEME.text.muted : 'transparent'}
              >×</button>
            )}
          </div>
        </div>
        {(entry.parts ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {entry.parts.map((p, i) => <span key={i} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: THEME.text.secondary }}>{p}</span>)}
          </div>
        )}
        {entry.notes && <p style={{ margin: 0, fontSize: 12, color: THEME.text.muted, lineHeight: 1.5, fontStyle: 'italic' }}>{entry.notes}</p>}
        {techMember && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Avatar member={techMember} size={18} />
            <span style={{ fontSize: 11, color: THEME.text.muted }}>{techMember.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
