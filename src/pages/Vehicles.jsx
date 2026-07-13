import { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { THEME } from '../lib/theme';
import { TopBar } from '../components/TopBar';
import { Avatar, StatusBadge, Btn, Spinner } from '../components/ui';
import { VehicleForm, MaintenanceForm, EventForm, DocumentForm } from '../components/Forms';
import { FicheCreateModal, FicheClotureModal, openFichePdf, ficheUrl } from '../components/FicheModals';
import { useAppContext } from '../lib/AppContext';
import { useVehicleDocs } from '../hooks/useVehicles';
import { useFiches } from '../hooks/useFiches';
import { daysUntil, formatDeadline, nextRevisionInfo } from '../lib/vehicleStatus';

// ─── SILHOUETTE VOITURE (remplace l'emoji 🚗) ────────────────────────────────

function CarSilhouette({ size = 120, color = 'rgba(255,255,255,0.55)' }) {
  return (
    <svg width={size} height={size * 0.34} viewBox="0 0 150 51" fill="none">
      {/* Caisse basse, ligne sportive + aileron */}
      <path
        d="M6 38 C6 34 9 31 14 30 L26 28 C33 18 45 12 60 12 L80 12 C95 12 106 17 114 26 L132 29 C139 30 144 33 144 37 L143 41 C143 43 141 44 139 44 L11 44 C9 44 6 42 6 40 Z"
        fill={color}
      />
      <path d="M118 15 L127 13 L128 16 L119 18 Z" fill={color} opacity="0.8" />
      <path d="M40 26 C44 18 52 15 60 15 L66 15 L65 26 Z" fill="#0D0D0F" opacity="0.6" />
      <path d="M71 15 L79 15 C88 15 96 19 102 25 L70 26 Z" fill="#0D0D0F" opacity="0.6" />
      <circle cx="38" cy="42" r="8.5" fill="#0D0D0F" stroke={color} strokeWidth="3" />
      <circle cx="38" cy="42" r="3" fill={color} opacity="0.5" />
      <circle cx="112" cy="42" r="8.5" fill="#0D0D0F" stroke={color} strokeWidth="3" />
      <circle cx="112" cy="42" r="3" fill={color} opacity="0.5" />
    </svg>
  );
}

// Ligne de statut en haut de card : hazard stripes si problème, ligne pleine sinon
function statusStripe(status) {
  if (status === 'À réviser') {
    return `repeating-linear-gradient(-55deg, ${THEME.accent.yellow} 0 8px, rgba(245,158,11,0.25) 8px 16px)`;
  }
  if (status === 'Au garage') {
    return `repeating-linear-gradient(-55deg, ${THEME.accent.blue} 0 8px, rgba(59,130,246,0.25) 8px 16px)`;
  }
  return THEME.accent.green;
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
  const { vehicles, loading, projects, createVehicle, updateVehicle, createEvent } = useAppContext();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showPlanEvent, setShowPlanEvent] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);

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
          {vehicles.map(v => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onClick={() => setSelectedVehicle(v)}
              onEdit={() => setEditVehicle(v)}
            />
          ))}
        </div>
      </div>
      {showAddVehicle && (
        <VehicleForm onSubmit={createVehicle} onClose={() => setShowAddVehicle(false)} />
      )}
      {editVehicle && (
        <VehicleForm
          vehicle={editVehicle}
          onSubmit={(data) => updateVehicle(editVehicle.id, data)}
          onClose={() => setEditVehicle(null)}
        />
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
  const auGarage = vehicles.filter(v => v.status === 'Au garage').length;

  const readouts = [
    {
      label: 'Disponibles',
      value: `${dispo}/${vehicles.length}`,
      color: dispo === vehicles.length ? THEME.accent.green : dispo === 0 ? THEME.accent.red : THEME.accent.yellow,
    },
    ...(auGarage > 0 ? [{ label: 'Au garage', value: String(auGarage), color: THEME.accent.blue }] : []),
    { label: `Coût ${year}`, value: `${totalCost.toLocaleString('fr-FR')} €`, color: THEME.text.primary },
  ];

  // Pit board : un seul bandeau, readouts séparés par des filets — pas de boîtes
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', marginBottom: 18,
      background: 'linear-gradient(90deg, rgba(240,120,20,0.06), transparent 60%)',
      border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden',
    }}>
      <div style={{ width: 4, background: THEME.accent.orange, flexShrink: 0 }} />
      {readouts.map((r, i) => (
        <div key={r.label} style={{
          padding: '12px 22px',
          borderLeft: i > 0 ? `1px solid ${THEME.border}` : 'none',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>{r.label}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: r.color, fontFamily: 'Rajdhani, sans-serif', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
            {r.value}
          </div>
        </div>
      ))}
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
  // Chips compactes : l'urgence informe, elle ne hurle pas
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
      {alerts.map((a, i) => {
        const color = a.severity === 'high' ? THEME.accent.red : THEME.accent.yellow;
        return (
          <button
            key={i}
            onClick={onPlanify}
            title="Planifier"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              background: `${color}10`, border: `1px solid ${color}30`,
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${color}70`}
            onMouseLeave={e => e.currentTarget.style.borderColor = `${color}30`}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text.primary }}>{a.vehicle}</span>
            <span style={{ fontSize: 12, color, fontWeight: 600 }}>{a.text}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── CARD VÉHICULE ───────────────────────────────────────────────────────────

function DeadlineRow({ dotColor, label, value, valueColor, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '7px 0' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, alignSelf: 'center' }} />
      <span style={{ fontSize: 12, color: THEME.text.secondary, flex: 1 }}>{label}</span>
      <span style={{ textAlign: 'right' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: valueColor ?? THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        {sub && <span style={{ display: 'block', fontSize: 10, color: THEME.text.muted, lineHeight: 1.3 }}>{sub}</span>}
      </span>
    </div>
  );
}

function VehicleCard({ vehicle, onClick, onEdit }) {
  const [hov, setHov] = useState(false);
  const ctDays = vehicle.next_ct ? daysUntil(vehicle.next_ct) : null;
  const revInfo = nextRevisionInfo(vehicle);
  const cost = yearCost(vehicle);

  const lastIntervention = useMemo(() => {
    const candidates = [];
    (vehicle.maintenance ?? []).forEach(m => candidates.push({ date: m.date, label: m.type }));
    (vehicle.fiches ?? []).filter(f => f.statut === 'terminée').forEach(f => candidates.push({ date: f.date_cloture, label: f.titre }));
    candidates.sort((a, b) => new Date(b.date) - new Date(a.date));
    return candidates[0] ?? null;
  }, [vehicle]);

  const ctColor = ctDays === null ? THEME.text.muted : ctDays < 0 ? THEME.accent.red : ctDays < 30 ? THEME.accent.yellow : THEME.accent.green;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: THEME.bg.card,
        border: `1px solid ${hov ? 'rgba(240,120,20,0.45)' : THEME.border}`,
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
        transform: hov ? 'translateY(-2px)' : 'none',
        boxShadow: hov ? '0 10px 30px rgba(0,0,0,0.45)' : 'none',
      }}
    >
      {/* Ligne de statut : hazard stripes si À réviser / Au garage, verte sinon */}
      <div style={{ height: 3, background: statusStripe(vehicle.status) }} />

      {/* Visuel : photo ou silhouette sur fond technique */}
      <div style={{ height: 96, background: vehicle.photo_url ? '#000' : `linear-gradient(120deg, ${vehicle.color} 0%, #101013 70%)`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {vehicle.photo_url ? (
          <img src={vehicle.photo_url} alt={vehicle.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <>
            {/* Grille technique subtile */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
            <div style={{ transform: hov ? 'translateX(4px)' : 'none', transition: 'transform 0.25s ease' }}>
              <CarSilhouette size={122} />
            </div>
          </>
        )}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge status={vehicle.status} small />
        </div>
        {/* Bouton édition rapide */}
        <button
          onClick={e => { e.stopPropagation(); onEdit(); }}
          title="Modifier le véhicule"
          style={{
            position: 'absolute', top: 8, left: 8,
            width: 30, height: 30, borderRadius: 8,
            background: 'rgba(10,10,12,0.72)', border: '1px solid rgba(255,255,255,0.15)',
            color: THEME.text.secondary, fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: hov ? 1 : 0.55, transition: 'opacity 0.15s, border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = THEME.accent.orange; e.currentTarget.style.color = THEME.accent.orange; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = THEME.text.secondary; }}
        >✎</button>
        {/* Plaque immat style FR */}
        {vehicle.plate && (
          <div style={{ position: 'absolute', bottom: 8, left: 10, display: 'flex', alignItems: 'stretch', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.18)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            <div style={{ width: 7, background: '#1e3a8a' }} />
            <div style={{ background: 'rgba(10,10,12,0.88)', padding: '2px 8px', fontSize: 11, color: '#fff', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'Rajdhani, sans-serif' }}>
              {vehicle.plate}
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px 12px' }}>
        {/* Identité */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.02em' }}>{vehicle.name}</span>
          <span style={{ fontSize: 11, color: THEME.text.muted, fontFamily: 'Rajdhani, sans-serif', fontWeight: 600 }}>{vehicle.year || ''}</span>
        </div>
        {vehicle.role && <div style={{ fontSize: 11, color: THEME.text.muted, marginTop: 1 }}>{vehicle.role}</div>}

        {/* Compteur : la donnée héros */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '12px 0 10px' }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <EditableKm vehicle={vehicle} style={{ borderBottom: 'none' }} inputWidth={130} />
          </span>
        </div>

        {/* Échéances : lignes fines, pas de boîtes */}
        <div style={{ borderTop: `1px solid ${THEME.border}` }}>
          <DeadlineRow
            dotColor={ctColor}
            label="Contrôle technique"
            value={vehicle.next_ct ? new Date(vehicle.next_ct).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
            valueColor={ctColor}
            sub={ctDays !== null ? formatDeadline(ctDays).text : null}
          />
          <DeadlineRow
            dotColor={revInfo ? (revInfo.overdue ? THEME.accent.red : THEME.accent.blue) : THEME.text.muted}
            label="Révision"
            value={revInfo ? (revInfo.overdue ? 'Dépassée' : revInfo.label) : 'Non planifiée'}
            valueColor={revInfo?.overdue ? THEME.accent.red : revInfo ? THEME.text.primary : THEME.text.muted}
            sub={revInfo?.sub}
          />
        </div>

        {/* Pied : dernière intervention + coût année */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 9, borderTop: `1px solid ${THEME.border}`, gap: 10 }}>
          <span style={{ fontSize: 11, color: THEME.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lastIntervention
              ? `${lastIntervention.label} · ${new Date(lastIntervention.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
              : 'Aucune intervention'}
          </span>
          <span style={{ fontWeight: 700, color: cost > 0 ? THEME.accent.orange : THEME.text.muted, fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {cost.toLocaleString('fr-FR')} €
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── HISTORIQUE KILOMÉTRAGE ──────────────────────────────────────────────────
// Chaque modification de km est historisée par un trigger en base (date + heure).

function KmHistory({ vehicleId, currentKm }) {
  const [log, setLog] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('mileage_log')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setLog(data ?? []));
  }, [vehicleId, currentKm]);

  if (log.length < 2 && !open) {
    // Pas encore d'évolution à montrer — on n'affiche rien tant qu'il n'y a qu'un relevé
    if (log.length === 0) return null;
  }

  // Delta sur les 30 derniers jours
  const now = Date.now();
  const recent = log.filter(l => now - new Date(l.created_at).getTime() < 30 * 86400000);
  const delta30j = recent.length >= 2 ? recent[0].km - recent[recent.length - 1].km : null;

  return (
    <div style={{ marginBottom: 20, border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '11px 16px', background: 'rgba(255,255,255,0.02)', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{ color: THEME.text.muted, fontSize: 10, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text.secondary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Évolution du kilométrage
        </span>
        <span style={{ fontSize: 11, color: THEME.text.muted }}>{log.length} relevé{log.length > 1 ? 's' : ''}</span>
        {delta30j !== null && delta30j > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: THEME.accent.blue, fontFamily: 'Rajdhani, sans-serif' }}>
            +{delta30j.toLocaleString('fr-FR')} km / 30 j
          </span>
        )}
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${THEME.border}`, maxHeight: 260, overflowY: 'auto' }}>
          {log.map((l, i) => {
            const prev = log[i + 1];
            const delta = prev ? l.km - prev.km : null;
            const d = new Date(l.created_at);
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '7px 16px', borderBottom: i < log.length - 1 ? `1px solid rgba(255,255,255,0.04)` : 'none' }}>
                <span style={{ fontSize: 11, color: THEME.text.muted, minWidth: 128 }}>
                  {d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })} · {d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                  {l.km.toLocaleString('fr-FR')} km
                </span>
                {delta !== null && delta !== 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: delta > 0 ? THEME.accent.blue : THEME.accent.yellow, fontFamily: 'Rajdhani, sans-serif' }}>
                    {delta > 0 ? '+' : ''}{delta.toLocaleString('fr-FR')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
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
  const [nfcCopied, setNfcCopied] = useState(false);

  const copyNfcLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/v/${vehicle.token_public}`);
    setNfcCopied(true);
    setTimeout(() => setNfcCopied(false), 2500);
  };

  const tabs = ['journal', 'fiches', 'parts', 'documents'];
  const tabLabels = {
    journal: 'Journal de bord',
    fiches: `Fiches (${(vehicle.fiches ?? []).length})`,
    parts: `Pièces (${(vehicle.parts ?? []).length})`,
    documents: 'Documents',
  };

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

  // Pièces fournies sur une fiche → format PDF (noms résolus depuis le stock)
  const fichePdfPieces = (f) => (f.pieces_fournies ?? []).map(fp => {
    const part = (vehicle.parts ?? []).find(p => p.id === fp.part_id);
    return { name: part?.name ?? `Pièce #${fp.part_id}`, reference: part?.reference, qty: fp.qty_fournie, reorder: part?.reorder };
  });
  const openPdf = (f) => openFichePdf(f, vehicle, f.taches ?? [], fichePdfPieces(f));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={vehicle.name}
        subtitle={`${vehicle.plate} • ${vehicle.year}`}
        actions={<>
          <StatusBadge status={vehicle.status} />
          {vehicle.token_public && (
            <Btn size="sm" variant="secondary" onClick={copyNfcLink} title="Lien permanent à graver sur la puce NFC du véhicule">
              {nfcCopied ? '✓ Copié !' : '📶 Lien NFC'}
            </Btn>
          )}
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
              <Btn size="sm" variant="secondary" onClick={() => openPdf(ficheOuverte)}>📄 PDF</Btn>
              <Btn size="sm" onClick={() => setFicheACloturer(ficheOuverte)}>Clôturer</Btn>
            </div>
          </div>
        )}

        {/* Bandeau telemetry : mêmes readouts que la vue flotte */}
        <div style={{
          display: 'flex', alignItems: 'stretch', flexWrap: 'wrap', marginBottom: 20,
          background: 'linear-gradient(90deg, rgba(240,120,20,0.06), transparent 60%)',
          border: `1px solid ${THEME.border}`, borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{ width: 4, background: THEME.accent.orange, flexShrink: 0 }} />
          {[
            {
              label: 'Kilométrage',
              node: <EditableKm vehicle={vehicle} inputWidth={130} style={{ borderBottom: 'none' }} />,
              color: THEME.text.primary,
            },
            {
              label: 'Prochain CT',
              node: vehicle.next_ct ? new Date(vehicle.next_ct).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—',
              color: ctDays === null ? THEME.text.muted : ctDays < 0 ? THEME.accent.red : ctDays < 30 ? THEME.accent.yellow : THEME.accent.green,
              sub: ctDays !== null ? formatDeadline(ctDays).text : null,
            },
            {
              label: 'Révision',
              node: revInfo ? (revInfo.overdue ? 'Dépassée' : revInfo.label) : 'Non planifiée',
              color: revInfo?.overdue ? THEME.accent.red : revInfo ? THEME.accent.blue : THEME.text.muted,
              sub: revInfo?.sub,
            },
            {
              label: 'Assurance',
              node: vehicle.date_assurance ? new Date(vehicle.date_assurance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }) : '—',
              color: assuranceDays === null ? THEME.text.muted : assuranceDays < 0 ? THEME.accent.red : assuranceDays < 30 ? THEME.accent.yellow : THEME.text.primary,
              sub: assuranceDays !== null && assuranceDays < 60 ? formatDeadline(assuranceDays).text : null,
            },
          ].map((r, i) => (
            <div key={r.label} style={{
              padding: '12px 20px', minWidth: isMobile ? '45%' : 0, flex: 1,
              borderLeft: i > 0 && !isMobile ? `1px solid ${THEME.border}` : 'none',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 10, color: THEME.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 21, fontWeight: 700, color: r.color, fontFamily: 'Rajdhani, sans-serif', fontVariantNumeric: 'tabular-nums', lineHeight: 1.15 }}>{r.node}</div>
              {r.sub && <div style={{ fontSize: 11, color: r.color === THEME.accent.red ? THEME.accent.red : THEME.text.muted, marginTop: 1 }}>{r.sub}</div>}
            </div>
          ))}
        </div>

        {/* Historique kilométrage (trigger en base sur chaque modification) */}
        <KmHistory vehicleId={vehicle.id} currentKm={vehicle.mileage} />

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
                : <FicheJournalRow key={`f-${item.data.id}`} fiche={item.data} vehicle={vehicle} isLast={idx === journal.length - 1} onCloturer={() => setFicheACloturer(item.data)} onDelete={deleteFiche} onPdf={() => openPdf(item.data)} />
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
              <FicheJournalRow key={f.id} fiche={f} vehicle={vehicle} standalone onCloturer={() => setFicheACloturer(f)} onDelete={deleteFiche} onPdf={() => openPdf(f)} />
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

        {activeTab === 'parts' && <PartsTab vehicle={vehicle} />}

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

function FicheJournalRow({ fiche, vehicle, isLast, standalone, onCloturer, onDelete, onPdf }) {
  // Compacte par défaut ; seule une fiche encore ouverte s'affiche dépliée
  const isOpen = fiche.statut === 'envoyée';
  const [expanded, setExpanded] = useState(isOpen);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const taches = fiche.taches ?? [];
  const faites = taches.filter(t => t.fait).length;
  const dotColor = isOpen ? THEME.accent.blue : fiche.statut === 'terminée' ? THEME.accent.green : THEME.text.muted;

  const content = (
    <div style={{ flex: 1, background: THEME.bg.card, border: `1px solid ${isOpen ? THEME.accent.blue + '44' : THEME.border}`, borderRadius: 10, overflow: 'hidden' }}>

      {/* Ligne compacte — cliquer pour déplier */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '10px 14px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <span style={{ color: THEME.text.muted, fontSize: 10, flexShrink: 0, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${dotColor}22`, color: dotColor, letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0 }}>
          {isOpen ? 'En cours' : fiche.statut}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {fiche.titre}
        </span>
        {fiche.travail_termine && isOpen && <span style={{ fontSize: 11, color: THEME.accent.green, fontWeight: 700, flexShrink: 0 }}>✓ mécano OK</span>}
        <span style={{ fontSize: 11, color: THEME.text.muted, flexShrink: 0 }}>{faites}/{taches.length}</span>
        <span style={{ fontSize: 11, color: THEME.text.muted, flexShrink: 0 }}>
          {new Date(fiche.date_cloture ?? fiche.date_creation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}
        </span>
        {fiche.statut === 'terminée' && (
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {(parseFloat(fiche.cout_total) || 0).toLocaleString('fr-FR')} €
          </span>
        )}
      </button>

      {/* Détail déplié */}
      {expanded && (
        <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${THEME.border}` }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', padding: '8px 0', fontSize: 11, color: THEME.text.muted }}>
            {fiche.km_au_moment && <span>Kilométrage : <strong style={{ color: THEME.text.secondary }}>{fiche.km_au_moment.toLocaleString('fr-FR')} km</strong></span>}
            <span>Créée le {new Date(fiche.date_creation).toLocaleDateString('fr-FR')}</span>
            {fiche.date_cloture && <span>Clôturée le {new Date(fiche.date_cloture).toLocaleDateString('fr-FR')}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {taches.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ color: t.fait ? THEME.accent.green : THEME.text.muted, fontSize: 13, fontWeight: 900, flexShrink: 0 }}>{t.fait ? '✓' : '○'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: t.fait ? THEME.text.secondary : THEME.text.primary }}>{t.description}</span>
                  {t.origine === 'mecano' && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3, background: THEME.accent.blueDim, color: THEME.accent.blue, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>Ajouté par le mécano</span>
                  )}
                  {t.consigne && <div style={{ fontSize: 11, color: THEME.accent.orange, marginTop: 2 }}>📌 {t.consigne}</div>}
                  {t.commentaire && <div style={{ fontSize: 11, color: THEME.text.muted, fontStyle: 'italic', marginTop: 2 }}>💬 {t.commentaire}</div>}
                  {t.photo_url && (
                    <a href={t.photo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 5 }}>
                      <img src={t.photo_url} alt="Photo" style={{ maxWidth: 110, maxHeight: 80, borderRadius: 6, border: `1px solid ${THEME.border}`, display: 'block' }} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pièces utilisées par le mécano */}
          {(fiche.pieces_utilisees ?? []).length > 0 && (
            <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: THEME.accent.yellowDim, border: `1px solid ${THEME.accent.yellow}33` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.accent.yellow, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                🛒 Pièces utilisées — à recommander
              </div>
              {fiche.pieces_utilisees.map(fp => {
                const part = (vehicle?.parts ?? []).find(p => p.id === fp.part_id);
                return (
                  <div key={fp.id} style={{ fontSize: 12, color: THEME.text.primary, fontWeight: 600, padding: '1px 0' }}>
                    • {fp.qty_utilisee}× {part?.name ?? `Pièce #${fp.part_id}`}{part?.reference ? ` (réf. ${part.reference})` : ''}
                  </div>
                );
              })}
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
      )}
    </div>
  );

  if (standalone) return content;

  return (
    <div style={{ display: 'flex', gap: 16, paddingBottom: isLast ? 0 : 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, border: `2px solid ${dotColor}`, flexShrink: 0, marginTop: 12 }} />
        {!isLast && <div style={{ flex: 1, width: 2, background: THEME.border, minHeight: 24, marginTop: 4 }} />}
      </div>
      {content}
    </div>
  );
}

// ─── ONGLET PIÈCES ───────────────────────────────────────────────────────────

function PartsTab({ vehicle }) {
  const { addPart, updatePart, deletePart } = useAppContext();
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [form, setForm] = useState({ name: '', reference: '', qty: 1, notes: '' });
  const [saving, setSaving] = useState(false);

  const parts = vehicle.parts ?? [];
  const totalPieces = parts.reduce((s, p) => s + (p.qty ?? 1), 0);

  const inp = { width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.border}`, borderRadius: 8, padding: '8px 12px', color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 10, color: THEME.text.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', display: 'block', marginBottom: 4 };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await addPart(vehicle.id, {
        name: form.name.trim(),
        reference: form.reference.trim() || null,
        qty: Math.max(1, parseInt(form.qty) || 1),
        notes: form.notes.trim() || null,
      });
      setForm({ name: '', reference: '', qty: 1, notes: '' });
      setShowAdd(false);
    } finally {
      setSaving(false);
    }
  };

  const changeQty = (p, delta) => {
    const next = (p.qty ?? 1) + delta;
    if (next < 0) return;
    // Dernière pièce utilisée → flag "à recommander" automatiquement
    updatePart(p.id, { qty: next, ...(next === 0 ? { reorder: true } : {}) });
  };

  const qtyBtn = {
    width: 24, height: 24, borderRadius: 6, border: `1px solid ${THEME.border}`,
    background: 'rgba(255,255,255,0.05)', color: THEME.text.secondary,
    fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', lineHeight: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: THEME.text.muted }}>
          Pièces en rab qui suivent le véhicule — le mécano les voit sur la fiche, rien à commander.
          {totalPieces > 0 && <strong style={{ color: THEME.text.secondary }}> {totalPieces} pièce{totalPieces > 1 ? 's' : ''} en stock.</strong>}
        </span>
        <Btn size="sm" onClick={() => setShowAdd(s => !s)}>{showAdd ? 'Fermer' : '+ Ajouter au stock'}</Btn>
      </div>

      {/* Formulaire inline */}
      {showAdd && (
        <div style={{ background: THEME.bg.card, border: `1px solid ${THEME.accent.orange}33`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 70px', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={lbl}>Pièce *</label>
              <input style={inp} placeholder="Plaquettes AV Ferodo DS2500" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} />
            </div>
            <div>
              <label style={lbl}>Référence</label>
              <input style={inp} placeholder="FCP1667H" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
            </div>
            <div>
              <label style={lbl}>Qté</label>
              <input type="number" min="1" style={inp} value={form.qty} onChange={e => setForm(f => ({ ...f, qty: e.target.value }))} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Notes</label>
            <input style={inp} placeholder="Dans le coffre / chez Alex / à monter en priorité…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn size="sm" onClick={handleAdd} disabled={!form.name.trim() || saving}>{saving ? 'Ajout…' : 'Ajouter au stock'}</Btn>
          </div>
        </div>
      )}

      {/* Stock */}
      {parts.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: THEME.text.muted }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>📦</div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Aucune pièce en stock pour ce véhicule</div>
          <div style={{ fontSize: 11 }}>Ajoute les cardans, plaquettes, etc. que tu gardes en rab</div>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {parts.map(p => {
          const qty = p.qty ?? 1;
          const epuise = qty === 0;
          return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: THEME.bg.card, border: `1px solid ${confirmDelete === p.id ? THEME.accent.red + '55' : epuise ? THEME.accent.red + '33' : THEME.border}` }}>
            {/* Quantité avec stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <button onClick={() => changeQty(p, -1)} style={qtyBtn} title="Utilisée / retirer une">−</button>
              <span style={{ fontSize: 16, fontWeight: 700, color: epuise ? THEME.accent.red : THEME.accent.orange, fontFamily: 'Rajdhani, sans-serif', minWidth: 22, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {qty}
              </span>
              <button onClick={() => changeQty(p, +1)} style={qtyBtn} title="En ajouter une">+</button>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text.primary }}>{p.name}</span>
                {p.reference && <span style={{ fontSize: 11, color: THEME.text.muted, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>réf. {p.reference}</span>}
                {epuise && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 4, background: THEME.accent.redDim, color: THEME.accent.red, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Épuisé</span>}
              </div>
              {p.notes && <div style={{ fontSize: 11, color: THEME.text.muted, fontStyle: 'italic', marginTop: 1 }}>{p.notes}</div>}
            </div>
            {/* Case "À recommander" — visible par le mécano sur la fiche */}
            <button
              onClick={() => updatePart(p.id, { reorder: !p.reorder })}
              title="Si coché, le mécano voit qu'il faut recommander cette pièce"
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', flexShrink: 0 }}
            >
              <span style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${p.reorder ? THEME.accent.yellow : THEME.text.muted}`,
                background: p.reorder ? THEME.accent.yellow : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0D0D0F', fontSize: 11, fontWeight: 900,
              }}>{p.reorder ? '✓' : ''}</span>
              <span style={{ fontSize: 11, fontWeight: p.reorder ? 700 : 400, color: p.reorder ? THEME.accent.yellow : THEME.text.muted, whiteSpace: 'nowrap' }}>
                À recommander
              </span>
            </button>
            {confirmDelete === p.id ? (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: THEME.accent.red, fontWeight: 700 }}>Retirer ?</span>
                <button onClick={() => { deletePart(p.id); setConfirmDelete(null); }} style={{ background: THEME.accent.red, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
                <button onClick={() => setConfirmDelete(null)} style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${THEME.border}`, borderRadius: 5, padding: '3px 8px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Non</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(p.id)} style={{ background: 'transparent', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>×</button>
            )}
          </div>
          );
        })}
      </div>
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
