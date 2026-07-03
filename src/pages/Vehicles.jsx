import { useState, useMemo } from 'react';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, Btn, Card, Spinner } from '../components/ui';
import { VehicleForm, MaintenanceForm, EventForm, DocumentForm } from '../components/Forms';
import { FicheCreateModal, FicheClotureModal, openFichePdf, ficheUrl } from '../components/FicheModals';
import { useAppContext } from '../lib/AppContext';
import { useVehicleDocs } from '../hooks/useVehicles';
import { useFiches } from '../hooks/useFiches';
import { daysUntil, formatDeadline, nextRevisionInfo } from '../lib/vehicleStatus';

// ─── SILHOUETTE VOITURE (remplace l'emoji 🚗) ────────────────────────────────

function CarSilhouette({ size = 54, color = 'rgba(255,255,255,0.85)' }) {
  return (
    <svg width={size} height={size * 0.45} viewBox="0 0 120 54" fill="none">
      <path
        d="M8 38 C8 34 10 30 16 29 L26 27 C30 20 38 14 50 13 L68 13 C80 13 90 19 96 27 L106 29 C112 30 114 34 114 38 L113 42 C113 44 111 45 109 45 L13 45 C11 45 9 44 9 42 Z"
        fill={color} opacity="0.9"
      />
      <path d="M34 26 C38 19 45 16 52 16 L58 16 L58 26 Z" fill="#0D0D0F" opacity="0.55" />
      <path d="M63 16 L70 16 C78 16 85 20 90 26 L63 26 Z" fill="#0D0D0F" opacity="0.55" />
      <circle cx="31" cy="44" r="9" fill="#0D0D0F" stroke={color} strokeWidth="3.5" />
      <circle cx="91" cy="44" r="9" fill="#0D0D0F" stroke={color} strokeWidth="3.5" />
    </svg>
  );
}

// ─── ÉDITION RAPIDE DU KILOMÉTRAGE ───────────────────────────────────────────

function EditableKm({ vehicle, style, inputWidth = 110, onDone }) {
  const { updateMileage } = useAppContext();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(vehicle.mileage);

  const save = async () => {
    setEditing(false);
    const km = parseInt(value);
    if (!isNaN(km) && km !== vehicle.mileage) await updateMileage(vehicle.id, km);
    onDone?.();
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={value}
        onClick={e => e.stopPropagation()}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
        style={{
          width: inputWidth, background: THEME.bg.input, border: `1px solid ${THEME.accent.orange}`,
          borderRadius: 6, padding: '3px 8px', color: THEME.text.primary,
          fontSize: 14, fontWeight: 800, fontFamily: 'Rajdhani, sans-serif', outline: 'none',
        }}
      />
    );
  }
  return (
    <span
      onClick={e => { e.stopPropagation(); setValue(vehicle.mileage); setEditing(true); }}
      title="Cliquer pour modifier"
      style={{ cursor: 'pointer', borderBottom: `1px dashed ${THEME.text.muted}`, ...style }}
    >
      {vehicle.mileage.toLocaleString('fr-FR')} km ✎
    </span>
  );
}

// ─── MODULE PRINCIPAL ────────────────────────────────────────────────────────

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
        <FleetStats vehicles={vehicles} />
        <AlertsBar vehicles={vehicles} onPlanify={() => setShowPlanEvent(true)} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(310px, 100%), 1fr))', gap: 16, marginTop: 20 }}>
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

// ─── STATS FLOTTE ────────────────────────────────────────────────────────────

function yearCost(vehicle, year = new Date().getFullYear()) {
  const maint = (vehicle.maintenance ?? [])
    .filter(m => new Date(m.date).getFullYear() === year)
    .reduce((s, m) => s + (parseFloat(m.cost) || 0), 0);
  const fiches = (vehicle.fiches ?? [])
    .filter(f => f.statut === 'terminée' && f.date_cloture && new Date(f.date_cloture).getFullYear() === year)
    .reduce((s, f) => s + (parseFloat(f.cout_total) || 0), 0);
  return maint + fiches;
}

function FleetStats({ vehicles }) {
  const year = new Date().getFullYear();
  const totalCost = vehicles.reduce((s, v) => s + yearCost(v, year), 0);
  const dispo = vehicles.filter(v => v.status === 'Opérationnel').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
      <Card style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Coût flotte {year}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif' }}>{totalCost.toLocaleString('fr-FR')} €</div>
      </Card>
      <Card style={{ padding: '16px 18px' }}>
        <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Véhicules disponibles</div>
        <div style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Rajdhani, sans-serif', color: dispo === vehicles.length ? THEME.accent.green : dispo === 0 ? THEME.accent.red : THEME.accent.yellow }}>
          {dispo}/{vehicles.length}
        </div>
      </Card>
    </div>
  );
}

// ─── ALERTES ─────────────────────────────────────────────────────────────────

function AlertsBar({ vehicles, onPlanify }) {
  const alerts = [];
  vehicles.forEach(v => {
    // CT
    if (v.next_ct) {
      const d = daysUntil(v.next_ct);
      if (d < 90) {
        const dl = formatDeadline(d);
        alerts.push({
          text: dl.overdue ? `CT ${dl.text}` : `CT ${dl.text}`,
          vehicle: v.name, severity: d < 30 ? 'high' : 'medium', overdue: dl.overdue,
        });
      }
    }
    // Révision par date
    if (v.next_revision_date) {
      const d = daysUntil(v.next_revision_date);
      if (d < 60) {
        const dl = formatDeadline(d);
        alerts.push({
          text: dl.overdue ? `Révision ${dl.text}` : `Révision ${dl.text}`,
          vehicle: v.name, severity: d < 14 ? 'high' : 'medium', overdue: dl.overdue,
        });
      }
    }
    // Révision par kilométrage
    if (v.next_revision_mileage && v.next_revision_mileage > 0) {
      const remaining = v.next_revision_mileage - v.mileage;
      if (remaining <= 0) {
        alerts.push({
          text: `Révision dépassée de ${Math.abs(remaining).toLocaleString('fr-FR')} km`,
          vehicle: v.name, severity: 'high', overdue: true,
        });
      } else if (remaining < 1000) {
        alerts.push({
          text: `Révision dans ${remaining.toLocaleString('fr-FR')} km`,
          vehicle: v.name, severity: 'medium', overdue: false,
        });
      }
    }
  });

  if (!alerts.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: THEME.text.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>⚠ Alertes maintenance</div>
      {alerts.map((a, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: a.severity === 'high' ? THEME.accent.redDim : THEME.accent.yellowDim, border: `1px solid ${a.severity === 'high' ? THEME.accent.red + '44' : THEME.accent.yellow + '44'}` }}>
          <span style={{ fontSize: 16 }}>{a.severity === 'high' ? '🔴' : '🟡'}</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{a.vehicle}</span>
            <span style={{ fontSize: 12, marginLeft: 8, fontWeight: a.overdue ? 700 : 400, color: a.severity === 'high' ? THEME.accent.red : THEME.accent.yellow }}>
              {a.text}
            </span>
          </div>
          <Btn size="sm" variant="secondary" style={{ marginLeft: 'auto' }} onClick={onPlanify}>Planifier</Btn>
        </div>
      ))}
    </div>
  );
}

// ─── CARD VÉHICULE ───────────────────────────────────────────────────────────

function VehicleCard({ vehicle, onClick }) {
  const [hov, setHov] = useState(false);
  const ctDays = vehicle.next_ct ? daysUntil(vehicle.next_ct) : null;
  const revInfo = nextRevisionInfo(vehicle);
  const cost = yearCost(vehicle);

  // Dernière intervention : fiche terminée ou maintenance, la plus récente
  const lastIntervention = useMemo(() => {
    const candidates = [];
    (vehicle.maintenance ?? []).forEach(m => candidates.push({ date: m.date, label: m.type, detail: (m.parts ?? [])[0] ?? m.notes }));
    (vehicle.fiches ?? []).filter(f => f.statut === 'terminée').forEach(f => candidates.push({ date: f.date_cloture, label: f.titre, detail: `${(f.taches ?? []).length} tâches` }));
    candidates.sort((a, b) => new Date(b.date) - new Date(a.date));
    return candidates[0] ?? null;
  }, [vehicle]);

  const ctColor = ctDays === null ? THEME.text.muted : ctDays < 0 ? THEME.accent.red : ctDays < 30 ? THEME.accent.yellow : THEME.accent.green;
  const ctBg = ctDays === null ? 'rgba(255,255,255,0.04)' : ctDays < 0 ? THEME.accent.redDim : ctDays < 30 ? THEME.accent.yellowDim : 'rgba(255,255,255,0.04)';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: hov ? THEME.bg.cardHover : THEME.bg.card, border: `1px solid ${hov ? 'rgba(240,120,20,0.3)' : THEME.border}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s ease' }}
    >
      {/* Header visuel : photo ou silhouette */}
      <div style={{ height: 110, background: vehicle.photo_url ? '#000' : `linear-gradient(135deg, ${vehicle.color} 0%, #0D0D0F 100%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `1px solid ${THEME.border}`, overflow: 'hidden' }}>
        {vehicle.photo_url ? (
          <img src={vehicle.photo_url} alt={vehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
        ) : (
          <>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-conic-gradient(rgba(255,255,255,0.03) 0% 25%, transparent 0% 50%)`, backgroundSize: '20px 20px' }} />
            <CarSilhouette size={78} />
          </>
        )}
        <div style={{ position: 'absolute', top: 10, right: 10 }}><StatusBadge status={vehicle.status} small /></div>
        <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.15em', fontFamily: 'Rajdhani, sans-serif', background: 'rgba(0,0,0,0.5)', padding: '2px 8px', borderRadius: 4 }}>{vehicle.plate}</div>
      </div>

      <div style={{ padding: '14px' }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: THEME.text.primary, marginBottom: 2, fontFamily: 'Rajdhani, sans-serif' }}>{vehicle.name}</div>
        <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 12 }}>{vehicle.role} • {vehicle.year}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 2 }}>KILOMÉTRAGE</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>
              <EditableKm vehicle={vehicle} />
            </div>
          </div>
          <div style={{ background: ctBg, borderRadius: 8, padding: '8px 10px' }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 2 }}>PROCHAIN CT</div>
            <div style={{ fontSize: 12, fontWeight: 800, fontFamily: 'Rajdhani', color: ctColor }}>
              {vehicle.next_ct
                ? <>{new Date(vehicle.next_ct).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
                    {ctDays < 0 && <span style={{ display: 'block', fontSize: 10 }}>dépassé de {Math.abs(ctDays)} j</span>}
                  </>
                : '—'}
            </div>
          </div>
        </div>

        {/* Prochaine révision : vrai seuil, jamais "0 km" */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: THEME.text.muted, padding: '8px 10px', background: revInfo?.overdue ? THEME.accent.redDim : 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 8 }}>
          <span>Prochaine révision</span>
          {revInfo ? (
            <span style={{ fontWeight: 700, color: revInfo.overdue ? THEME.accent.red : THEME.text.secondary, textAlign: 'right' }}>
              {revInfo.overdue ? revInfo.sub : revInfo.sub}
            </span>
          ) : (
            <span style={{ fontStyle: 'italic', color: THEME.text.muted }}>Non planifiée</span>
          )}
        </div>

        {/* Dernière intervention + coût année */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, paddingTop: 8, borderTop: `1px solid ${THEME.border}` }}>
          <span style={{ color: THEME.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
            {lastIntervention
              ? `🔧 ${lastIntervention.label} · ${new Date(lastIntervention.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
              : 'Aucune intervention'}
          </span>
          <span style={{ fontWeight: 800, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif', fontSize: 13 }}>
            {cost.toLocaleString('fr-FR')} € <span style={{ fontSize: 9, color: THEME.text.muted, fontWeight: 400 }}>/ {new Date().getFullYear()}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── DÉTAIL VÉHICULE ─────────────────────────────────────────────────────────

function VehicleDetail({ vehicle, onBack }) {
  const { team, updateVehicle, deleteVehicle, addMaintenance, deleteMaintenance, vehicles, projects, createEvent, isMobile } = useAppContext();
  const { saving, createFiche, cloturerFiche, deleteFiche } = useFiches();
  const [activeTab, setActiveTab] = useState('journal');
  const [showEdit, setShowEdit] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showPlanEvent, setShowPlanEvent] = useState(false);
  const [showNewFiche, setShowNewFiche] = useState(false);
  const [ficheACloturer, setFicheACloturer] = useState(null);
  const [confirmDeleteVehicle, setConfirmDeleteVehicle] = useState(false);

  const tabs = ['journal', 'fiches', 'documents'];
  const tabLabels = { journal: 'Journal de bord', fiches: `Fiches (${(vehicle.fiches ?? []).length})`, documents: 'Documents' };

  const ctDays = vehicle.next_ct ? daysUntil(vehicle.next_ct) : null;
  const revInfo = nextRevisionInfo(vehicle);
  const assuranceDays = vehicle.date_assurance ? daysUntil(vehicle.date_assurance) : null;

  // Coûts par année (maintenance + fiches)
  const costsByYear = useMemo(() => {
    const years = {};
    (vehicle.maintenance ?? []).forEach(m => {
      const y = new Date(m.date).getFullYear();
      years[y] = (years[y] ?? 0) + (parseFloat(m.cost) || 0);
    });
    (vehicle.fiches ?? []).filter(f => f.statut === 'terminée' && f.date_cloture).forEach(f => {
      const y = new Date(f.date_cloture).getFullYear();
      years[y] = (years[y] ?? 0) + (parseFloat(f.cout_total) || 0);
    });
    return Object.entries(years).sort((a, b) => b[0] - a[0]);
  }, [vehicle]);

  // Journal de bord : maintenance + fiches fusionnées, triées par date desc
  const journal = useMemo(() => {
    const items = [];
    (vehicle.maintenance ?? []).forEach(m => items.push({ kind: 'maintenance', date: m.date, data: m }));
    (vehicle.fiches ?? []).forEach(f => items.push({ kind: 'fiche', date: f.date_cloture ?? f.date_creation, data: f }));
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [vehicle]);

  const handleDeleteVehicle = async () => {
    await deleteVehicle(vehicle.id);
    onBack();
  };

  const handleCloture = async (opts) => {
    const ok = await cloturerFiche(ficheACloturer, opts);
    if (ok) setFicheACloturer(null);
  };

  const ficheOuverte = (vehicle.fiches ?? []).find(f => f.statut === 'envoyée');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={vehicle.name}
        subtitle={`${vehicle.plate} • ${vehicle.year}`}
        actions={<>
          <StatusBadge status={vehicle.status} />
          <Btn size="sm" variant="secondary" onClick={() => setShowEdit(true)}>✏ Modifier</Btn>
          <Btn size="sm" onClick={() => setShowNewFiche(true)}>+ Nouvelle fiche</Btn>
        </>}
      />

      {/* Fil d'Ariane */}
      <div style={{ padding: '10px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: THEME.accent.orange, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}
          >← Véhicules</button>
          <span style={{ color: THEME.text.muted, fontSize: 12 }}>/</span>
          <span style={{ color: THEME.text.secondary, fontSize: 12, fontWeight: 600 }}>{vehicle.name}</span>
        </div>
        {confirmDeleteVehicle ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: THEME.accent.red, fontWeight: 700 }}>Supprimer définitivement ?</span>
            <button onClick={handleDeleteVehicle} style={{ background: THEME.accent.red, border: 'none', borderRadius: 6, padding: '4px 12px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui, supprimer</button>
            <button onClick={() => setConfirmDeleteVehicle(false)} style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '4px 12px', color: THEME.text.secondary, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDeleteVehicle(true)}
            style={{ background: 'none', border: `1px solid ${THEME.border}`, borderRadius: 6, padding: '4px 10px', color: THEME.text.muted, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
          >Supprimer</button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
        {/* Fiche en cours — bannière */}
        {ficheOuverte && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10, background: THEME.accent.blueDim, border: `1px solid ${THEME.accent.blue}44`, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18 }}>🔧</span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>
                {ficheOuverte.titre}
                {ficheOuverte.travail_termine && <span style={{ color: THEME.accent.green, marginLeft: 8, fontSize: 12 }}>✓ Le mécano a terminé</span>}
              </div>
              <div style={{ fontSize: 11, color: THEME.text.muted }}>
                {(ficheOuverte.taches ?? []).filter(t => t.fait).length}/{(ficheOuverte.taches ?? []).length} tâches faites
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(ficheUrl(ficheOuverte)); }}>📋 Lien</Btn>
              <Btn size="sm" variant="secondary" onClick={() => openFichePdf(ficheOuverte, vehicle, ficheOuverte.taches ?? [])}>📄 PDF</Btn>
              <Btn size="sm" onClick={() => setFicheACloturer(ficheOuverte)}>Clôturer</Btn>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Kilométrage</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>
              <EditableKm vehicle={vehicle} inputWidth={130} />
            </div>
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prochain CT</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Rajdhani', color: ctDays === null ? THEME.text.muted : ctDays < 0 ? THEME.accent.red : ctDays < 30 ? THEME.accent.yellow : THEME.accent.green }}>
              {vehicle.next_ct ? new Date(vehicle.next_ct).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
            </div>
            {ctDays !== null && (
              <div style={{ fontSize: 11, color: ctDays < 0 ? THEME.accent.red : THEME.text.muted, marginTop: 2, fontWeight: ctDays < 0 ? 700 : 400 }}>
                {formatDeadline(ctDays).text}
              </div>
            )}
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prochaine révision</div>
            {revInfo ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Rajdhani', color: revInfo.overdue ? THEME.accent.red : THEME.accent.blue }}>{revInfo.label}</div>
                <div style={{ fontSize: 11, color: revInfo.overdue ? THEME.accent.red : THEME.text.muted, marginTop: 2, fontWeight: revInfo.overdue ? 700 : 400 }}>{revInfo.sub}</div>
              </>
            ) : (
              <div style={{ fontSize: 14, color: THEME.text.muted, fontStyle: 'italic' }}>Non planifiée</div>
            )}
          </Card>
          <Card style={{ padding: 14 }}>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Assurance</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Rajdhani', color: assuranceDays === null ? THEME.text.muted : assuranceDays < 0 ? THEME.accent.red : assuranceDays < 30 ? THEME.accent.yellow : THEME.text.primary }}>
              {vehicle.date_assurance ? new Date(vehicle.date_assurance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
            </div>
            {assuranceDays !== null && assuranceDays < 60 && (
              <div style={{ fontSize: 11, color: assuranceDays < 0 ? THEME.accent.red : THEME.accent.yellow, marginTop: 2, fontWeight: 700 }}>{formatDeadline(assuranceDays).text}</div>
            )}
          </Card>
        </div>

        {/* Coûts par année */}
        {costsByYear.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            {costsByYear.map(([year, cost]) => (
              <div key={year} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${THEME.border}` }}>
                <span style={{ fontSize: 11, color: THEME.text.muted, marginRight: 8 }}>{year}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif' }}>{cost.toLocaleString('fr-FR')} €</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', background: activeTab === tab ? THEME.accent.orange : 'transparent', color: activeTab === tab ? '#fff' : THEME.text.secondary, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{tabLabels[tab]}</button>
          ))}
        </div>

        {/* ── Journal de bord ── */}
        {activeTab === 'journal' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {journal.map((item, idx) => (
              item.kind === 'maintenance'
                ? <MaintenanceRow key={`m-${item.data.id}`} entry={item.data} team={team} isLast={idx === journal.length - 1} onDelete={deleteMaintenance} />
                : <FicheJournalRow key={`f-${item.data.id}`} fiche={item.data} isLast={idx === journal.length - 1} onCloturer={() => setFicheACloturer(item.data)} onDelete={deleteFiche} onPdf={() => openFichePdf(item.data, vehicle, item.data.taches ?? [])} />
            ))}
            {journal.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: THEME.text.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔧</div>
                <div style={{ marginBottom: 12 }}>Aucune intervention enregistrée</div>
                <Btn size="sm" onClick={() => setShowNewFiche(true)}>+ Créer une fiche</Btn>
              </div>
            )}
            {journal.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <Btn size="sm" variant="secondary" onClick={() => setShowAddMaintenance(true)}>+ Ajouter une entrée manuelle</Btn>
              </div>
            )}
          </div>
        )}

        {/* ── Fiches ── */}
        {activeTab === 'fiches' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(vehicle.fiches ?? []).map(f => (
              <FicheJournalRow key={f.id} fiche={f} standalone onCloturer={() => setFicheACloturer(f)} onDelete={deleteFiche} onPdf={() => openFichePdf(f, vehicle, f.taches ?? [])} />
            ))}
            {(vehicle.fiches ?? []).length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: THEME.text.muted }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
                <div style={{ marginBottom: 12 }}>Aucune fiche d'intervention</div>
                <Btn size="sm" onClick={() => setShowNewFiche(true)}>+ Créer une fiche</Btn>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && <DocumentsTab vehicleId={vehicle.id} />}
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
      {showNewFiche && (
        <FicheCreateModal vehicle={vehicle} onCreate={createFiche} onClose={() => setShowNewFiche(false)} saving={saving} />
      )}
      {ficheACloturer && (
        <FicheClotureModal fiche={ficheACloturer} vehicle={vehicle} onCloture={handleCloture} onClose={() => setFicheACloturer(null)} saving={saving} />
      )}
    </div>
  );
}

// ─── FICHE DANS LE JOURNAL ───────────────────────────────────────────────────

function FicheJournalRow({ fiche, isLast, standalone, onCloturer, onDelete, onPdf }) {
  const [expanded, setExpanded] = useState(fiche.statut === 'envoyée');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const taches = fiche.taches ?? [];
  const isOpen = fiche.statut === 'envoyée';
  const dotColor = isOpen ? THEME.accent.blue : fiche.statut === 'terminée' ? THEME.accent.green : THEME.text.muted;

  const content = (
    <div style={{ flex: 1, background: THEME.bg.card, border: `1px solid ${isOpen ? THEME.accent.blue + '44' : THEME.border}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${dotColor}22`, color: dotColor, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Fiche · {fiche.statut}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{fiche.titre}</span>
          {fiche.travail_termine && isOpen && <span style={{ fontSize: 11, color: THEME.accent.green, fontWeight: 700 }}>✓ mécano OK</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {fiche.km_au_moment && <span style={{ fontSize: 11, color: THEME.text.muted }}>{fiche.km_au_moment.toLocaleString('fr-FR')} km</span>}
          <span style={{ fontSize: 11, color: THEME.text.muted }}>
            {new Date(fiche.date_cloture ?? fiche.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          {fiche.statut === 'terminée' && (
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.accent.orange, fontFamily: 'Rajdhani' }}>{(parseFloat(fiche.cout_total) || 0).toLocaleString('fr-FR')} €</span>
          )}
        </div>
      </div>

      {/* Tâches */}
      <button onClick={() => setExpanded(e => !e)} style={{ background: 'none', border: 'none', color: THEME.text.muted, fontSize: 11, cursor: 'pointer', padding: '6px 0 0', fontFamily: 'inherit' }}>
        {expanded ? '▾' : '▸'} {taches.length} tâche{taches.length > 1 ? 's' : ''} · {taches.filter(t => t.fait).length} faite{taches.filter(t => t.fait).length > 1 ? 's' : ''}
      </button>
      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {taches.map(t => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
              <span style={{ color: t.fait ? THEME.accent.green : THEME.text.muted, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{t.fait ? '✓' : '○'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: t.fait ? THEME.text.secondary : THEME.text.primary }}>{t.description}</span>
                {t.origine === 'mecano' && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: THEME.accent.blueDim, color: THEME.accent.blue, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Ajouté par le mécano</span>
                )}
                {t.commentaire && <div style={{ fontSize: 11, color: THEME.text.muted, fontStyle: 'italic', marginTop: 2 }}>💬 {t.commentaire}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {fiche.notes && <p style={{ margin: '8px 0 0', fontSize: 12, color: THEME.text.muted, fontStyle: 'italic' }}>{fiche.notes}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {isOpen && (
          <>
            <Btn size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(ficheUrl(fiche))}>📋 Copier le lien</Btn>
            <Btn size="sm" variant="secondary" onClick={onPdf}>📄 PDF</Btn>
            <Btn size="sm" onClick={onCloturer}>Clôturer</Btn>
          </>
        )}
        {fiche.statut === 'terminée' && fiche.facture_url && (
          <a href={fiche.facture_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 600, textDecoration: 'none' }}>🧾 Voir la facture →</a>
        )}
        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button onClick={() => onDelete(fiche.id)} style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
            <button onClick={() => setConfirmDelete(false)} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '3px 8px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ background: 'none', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 15, marginLeft: 'auto', padding: '0 4px' }}>×</button>
        )}
      </div>
    </div>
  );

  if (standalone) return content;

  return (
    <div style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, border: `2px solid ${dotColor}`, flexShrink: 0, marginTop: 4 }} />
        {!isLast && <div style={{ flex: 1, width: 2, background: THEME.border, minHeight: 24, marginTop: 4 }} />}
      </div>
      {content}
    </div>
  );
}

// ─── ONGLET DOCUMENTS ────────────────────────────────────────────────────────

function DocumentsTab({ vehicleId }) {
  const { docs, loading, addDoc, deleteDoc } = useVehicleDocs(vehicleId);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const typeIcons = { document: '📄', facture: '🧾', contrat: '📋', assurance: '🛡', ct: '🔍', carte_grise: '🪪', autre: '📎' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: THEME.text.muted }}>Chargement…</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <Btn size="sm" onClick={() => setShowAddDoc(true)}>+ Ajouter un document</Btn>
      </div>
      {docs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.text.muted }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📁</div>
          <div style={{ fontSize: 13 }}>Aucun document — ajoute le CT, la carte grise, l'assurance…</div>
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
              <button onClick={() => setConfirmDelete(doc.id)} style={{ background: 'transparent', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>×</button>
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

// ─── LIGNE MAINTENANCE (existant, conservé) ──────────────────────────────────

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
