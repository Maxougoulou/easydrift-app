import { useState, useRef, useEffect } from 'react';
import { THEME } from '../lib/theme';
import { toast } from '../lib/toast';
import { TopBar } from '../components/TopBar';
import { Card, Btn, Spinner } from '../components/ui';
import { useTrackDays } from '../hooks/useTrackDays';
import { useClients } from '../hooks/useClients';
import { useAppContext } from '../lib/AppContext';

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const COST_ITEMS = [
  { key: 'cost_droits_piste', label: 'Droits de piste' },
  { key: 'cost_repas', label: 'Repas' },
  { key: 'cost_hotel', label: 'Hôtel' },
  { key: 'cost_essence', label: 'Essence' },
  { key: 'cost_transport', label: 'Transport' },
  { key: 'cost_location_auto', label: 'Location auto' },
  { key: 'cost_autre', label: 'Autre' },
];

const STATUS_CFG = {
  'À venir': { color: '#3B82F6', bg: 'rgba(59,130,246,0.15)' },
  'Terminé':  { color: '#22C55E', bg: 'rgba(34,197,94,0.15)'  },
  'Annulé':   { color: '#EF4444', bg: 'rgba(239,68,68,0.15)'  },
  'Clôturé':  { color: '#A855F7', bg: 'rgba(168,85,247,0.15)' },
};

const displayStatus = (td) => {
  if (td.status === 'À venir' && td.date < new Date().toISOString().split('T')[0]) return 'Terminé';
  return td.status;
};

const fmt  = (n) => `${Number(n ?? 0).toLocaleString('fr-FR')} €`;
const num  = (n) => Number(n ?? 0);
const pTotal = (p) => num(p.montant_ddp) + num(p.montant_anneaux) + num(p.montant_repas) + num(p.montant_hotel) + num(p.montant_essence) + num(p.montant_loc) + num(p.montant_transport) + num(p.montant_autre);
const tdRevenuePaid     = (td) => (td.track_day_participants ?? []).filter(p => p.paid).reduce((s, p) => s + pTotal(p), 0);
const tdRevenueExpected = (td) => (td.track_day_participants ?? []).reduce((s, p) => s + pTotal(p), 0);
const tdCosts           = (td) => COST_ITEMS.reduce((s, c) => s + num(td[c.key]), 0);
const tdProfit          = (td) => tdRevenuePaid(td) - tdCosts(td);

// ─── MODULE ──────────────────────────────────────────────────────────────────

export function TrackDaysModule() {
  const { isMobile } = useAppContext();
  const {
    trackDays, loading,
    createTrackDay, updateTrackDay, deleteTrackDay,
    addParticipant, updateParticipant, deleteParticipant, uploadParticipantInvoice,
  } = useTrackDays();
  const { clients, createClient, updateClient, deleteClient } = useClients();
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showClients, setShowClients] = useState(false);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar title="Track Days" subtitle="Chargement…" />
      <Spinner />
    </div>
  );

  if (selected) {
    const fresh = trackDays.find(d => d.id === selected.id) ?? selected;
    return (
      <TrackDayDetail
        td={fresh}
        onBack={() => setSelected(null)}
        updateTrackDay={updateTrackDay}
        addParticipant={addParticipant}
        updateParticipant={updateParticipant}
        deleteParticipant={deleteParticipant}
        uploadParticipantInvoice={uploadParticipantInvoice}
        clients={clients}
        createClient={createClient}
      />
    );
  }

  const allParts    = trackDays.flatMap(d => d.track_day_participants ?? []);
  const totalRev    = trackDays.reduce((s, d) => s + tdRevenuePaid(d), 0);
  const totalProfit = trackDays.reduce((s, d) => s + tdProfit(d), 0);
  const upcoming    = trackDays.filter(d => displayStatus(d) === 'À venir').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title="Track Days"
        subtitle={`${trackDays.length} événement${trackDays.length !== 1 ? 's' : ''} · ${upcoming} à venir`}
        actions={<>
          <Btn size="sm" variant="secondary" onClick={() => setShowClients(true)}>Clients ({clients.length})</Btn>
          <Btn size="sm" onClick={() => setShowForm(true)}>+ Nouveau track day</Btn>
        </>}
      />
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 12px' : '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Track days',         value: trackDays.length,                                      color: THEME.text.primary },
            { label: 'Participants total',  value: allParts.length,                                       color: THEME.accent.blue  },
            { label: 'Revenus encaissés',  value: fmt(totalRev),                                          color: THEME.accent.green },
            { label: 'Résultat global',    value: fmt(totalProfit), color: totalProfit >= 0 ? THEME.accent.green : THEME.accent.red },
          ].map(s => (
            <Card key={s.label} style={{ padding: 16 }}>
              <div style={{ fontSize: 11, color: THEME.text.muted, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'Rajdhani, sans-serif' }}>{s.value}</div>
            </Card>
          ))}
        </div>

        {trackDays.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, color: THEME.text.muted, gap: 12 }}>
            <div style={{ fontSize: 40, opacity: 0.25, fontFamily: 'Rajdhani' }}>◉</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text.secondary }}>Aucun track day enregistré</div>
            <div style={{ fontSize: 12 }}>Créez votre premier événement piste</div>
            <Btn style={{ marginTop: 8 }} onClick={() => setShowForm(true)}>+ Nouveau track day</Btn>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {trackDays.map(td => (
              <TrackDayCard key={td.id} td={td} onClick={() => setSelected(td)} onDelete={() => deleteTrackDay(td.id)} />
            ))}
          </div>
        )}
      </div>

      {showForm    && <TrackDayForm onSubmit={createTrackDay} onClose={() => setShowForm(false)} />}
      {showClients && <ClientsManager clients={clients} onCreate={createClient} onUpdate={updateClient} onDelete={deleteClient} onClose={() => setShowClients(false)} />}
    </div>
  );
}

// ─── CARD LISTE ───────────────────────────────────────────────────────────────

function TrackDayCard({ td, onClick, onDelete }) {
  const [hov, setHov] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const parts    = td.track_day_participants ?? [];
  const revenue  = tdRevenuePaid(td);
  const expected = tdRevenueExpected(td);
  const costs    = tdCosts(td);
  const profit   = tdProfit(td);
  const vhcTotal    = parts.reduce((s, p) => s + num(p.vehicules), 0);
  const ds          = displayStatus(td);
  const sc          = STATUS_CFG[ds] ?? STATUS_CFG['À venir'];
  const urgentCount = parts.filter(p => !p.paid && !p.invoice_ref).length;
  const pendingCount= parts.filter(p => !p.paid && p.invoice_ref).length;

  return (
    <div
      onClick={() => { if (!confirmDelete) onClick(); }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
      style={{
        background: hov ? THEME.bg.cardHover : THEME.bg.card,
        border: `1px solid ${hov ? 'rgba(240,120,20,0.25)' : THEME.border}`,
        borderLeft: `3px solid ${sc.color}`,
        borderRadius: 10, padding: '16px 20px',
        cursor: 'pointer', transition: 'all 0.15s', position: 'relative',
      }}
    >
      {hov && !confirmDelete && (
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(true); }}
          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 5, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, fontSize: 14, cursor: 'pointer', zIndex: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = THEME.accent.red; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.5)'; e.currentTarget.style.color = THEME.text.muted; }}
        >×</button>
      )}
      {confirmDelete && (
        <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 2 }}>
          <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>Supprimer « {td.name} » ?</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ background: THEME.accent.red, border: 'none', borderRadius: 7, padding: '6px 16px', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Supprimer</button>
            <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, padding: '6px 16px', color: '#fff', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>{td.name}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: sc.bg, color: sc.color }}>{ds}</span>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 12, color: THEME.text.secondary }}>{td.circuit}</span>
            <span style={{ fontSize: 11, color: THEME.text.muted }}>
              {td.date ? new Date(td.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 4 }}>
          <Stat label="Participants" value={`${parts.length}/${td.max_participants ?? '?'}`} color={THEME.accent.blue} />
          <Stat label="Véhicules" value={vhcTotal} color={THEME.text.secondary} />
          <Stat label="Encaissé / Attendu" value={`${fmt(revenue)} / ${fmt(expected)}`} color={THEME.accent.green} small />
          <Stat label="Coûts" value={fmt(costs)} color={costs > 0 ? THEME.accent.red : THEME.text.muted} />
          {urgentCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>⚠ {urgentCount} à facturer</span>
            </div>
          )}
          {urgentCount === 0 && pendingCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>⏳ {pendingCount} en attente</span>
            </div>
          )}
          <div style={{
            padding: '8px 14px', borderRadius: 8, textAlign: 'center',
            background: profit >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${profit >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}>
            <div style={{ fontSize: 9, color: THEME.text.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Résultat</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: profit >= 0 ? THEME.accent.green : THEME.accent.red, fontFamily: 'Rajdhani' }}>
              {profit >= 0 ? '+' : ''}{fmt(profit)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, small }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: THEME.text.muted, marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: small ? 12 : 15, fontWeight: 800, color, fontFamily: 'Rajdhani', lineHeight: 1.2 }}>{value}</div>
    </div>
  );
}

// ─── DÉTAIL ───────────────────────────────────────────────────────────────────

function TrackDayDetail({ td, onBack, updateTrackDay, addParticipant, updateParticipant, deleteParticipant, uploadParticipantInvoice, clients = [], createClient }) {
  const { isMobile } = useAppContext();
  const [showEdit, setShowEdit] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [editParticipant, setEditParticipant] = useState(null);
  const [mobileTab, setMobileTab] = useState('participants');

  const parts    = td.track_day_participants ?? [];
  const costs    = tdCosts(td);
  const revenue  = tdRevenuePaid(td);
  const expected = tdRevenueExpected(td);
  const profit   = tdProfit(td);
  const ds       = displayStatus(td);
  const sc       = STATUS_CFG[ds] ?? STATUS_CFG['À venir'];

  const invoicePriority = (p) => {
    if (!p.paid && !p.invoice_ref) return 0;
    if (!p.paid && p.invoice_ref) return 1;
    if (p.paid && !p.facture_envoyee) return 2;
    return 3;
  };
  const sorted = [...parts].sort((a, b) => invoicePriority(a) - invoicePriority(b));

  const vhcTotal     = parts.reduce((s, p) => s + num(p.vehicules), 0);
  const anneauxTotal = parts.reduce((s, p) => s + num(p.anneaux), 0);
  const repasTotal   = parts.reduce((s, p) => s + num(p.repas), 0);
  const hotelTotal   = parts.reduce((s, p) => s + num(p.hotel), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <TopBar
        title={td.name}
        subtitle={`${td.circuit} · ${td.date ? new Date(td.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}`}
        actions={<>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 5, background: sc.bg, color: sc.color }}>{ds}</span>
          <Btn size="sm" onClick={() => setShowEdit(true)}>Modifier</Btn>
        </>}
      />

      {/* Breadcrumb */}
      <div style={{ padding: '10px 24px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: THEME.accent.orange, cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 0, fontFamily: 'inherit' }}>← Track Days</button>
          <span style={{ color: THEME.text.muted, fontSize: 12 }}>/</span>
          <span style={{ color: THEME.text.secondary, fontSize: 12, fontWeight: 600 }}>{td.name}</span>
        </div>
        {isMobile && (
          <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
            {[['participants', 'Liste'], ['finances', 'Finances']].map(([val, label]) => (
              <button key={val} onClick={() => setMobileTab(val)} style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', background: mobileTab === val ? THEME.accent.orange : 'transparent', color: mobileTab === val ? '#fff' : THEME.text.secondary, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s' }}>{label}</button>
            ))}
          </div>
        )}
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(3,1fr)' : 'repeat(6,1fr)', flexShrink: 0, borderBottom: `1px solid ${THEME.border}`, background: 'rgba(255,255,255,0.01)' }}>
        {[
          { label: 'Participants',       value: `${parts.length}/${td.max_participants ?? '?'}`,     color: THEME.accent.blue },
          { label: 'Véhicules',          value: vhcTotal,                                             color: THEME.text.secondary },
          { label: 'Anneaux / Repas / Hôtel', value: `${anneauxTotal} / ${repasTotal} / ${hotelTotal}`, color: THEME.text.secondary, small: true },
          { label: 'Encaissé',           value: fmt(revenue),                                         color: THEME.accent.green },
          { label: 'Attendu',            value: fmt(expected),                                        color: THEME.text.secondary },
          { label: 'Résultat net',       value: `${profit >= 0 ? '+' : ''}${fmt(profit)}`,            color: profit >= 0 ? THEME.accent.green : THEME.accent.red },
        ].map((s, i) => (
          <div key={s.label} style={{ padding: '10px 16px', borderRight: i < 5 && !isMobile ? `1px solid ${THEME.border}` : 'none' }}>
            <div style={{ fontSize: 9, color: THEME.text.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            <div style={{ fontSize: s.small ? 11 : 16, fontWeight: 800, color: s.color, fontFamily: 'Rajdhani', lineHeight: 1.2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {isMobile ? (
          mobileTab === 'participants'
            ? <ParticipantsSection parts={sorted} td={td} onAdd={() => setShowAddPart(true)} updateParticipant={updateParticipant} deleteParticipant={deleteParticipant} onEditParticipant={setEditParticipant} uploadParticipantInvoice={uploadParticipantInvoice} />
            : <FinancesSection td={td} parts={parts} profit={profit} revenue={revenue} expected={expected} costs={costs} onEdit={() => setShowEdit(true)} isMobile />
        ) : (
          <>
            <ParticipantsSection parts={sorted} td={td} onAdd={() => setShowAddPart(true)} updateParticipant={updateParticipant} deleteParticipant={deleteParticipant} onEditParticipant={setEditParticipant} uploadParticipantInvoice={uploadParticipantInvoice} />
            <FinancesSection td={td} parts={parts} profit={profit} revenue={revenue} expected={expected} costs={costs} onEdit={() => setShowEdit(true)} />
          </>
        )}
      </div>

      {showEdit        && <TrackDayForm td={td} onSubmit={(d) => updateTrackDay(td.id, d)} onClose={() => setShowEdit(false)} />}
      {showAddPart     && <ParticipantForm td={td} clients={clients} createClient={createClient} onSubmit={(d) => addParticipant(td.id, d)} onClose={() => setShowAddPart(false)} />}
      {editParticipant && <ParticipantForm td={td} participant={editParticipant} clients={clients} createClient={createClient} onSubmit={(d) => updateParticipant(editParticipant.id, d)} onClose={() => setEditParticipant(null)} />}
    </div>
  );
}

// ─── TABLEAU PARTICIPANTS ─────────────────────────────────────────────────────

const COLS = '150px 110px 130px 48px 42px 42px 42px 42px 88px 48px 88px 95px 72px 95px 90px 44px 44px 48px 32px';

function ParticipantsSection({ parts, td, onAdd, updateParticipant, deleteParticipant, onEditParticipant, uploadParticipantInvoice }) {
  const [filter, setFilter] = useState('all');

  // États de facturation
  const urgent     = parts.filter(p => !p.paid && !p.invoice_ref);
  const pending    = parts.filter(p => !p.paid && p.invoice_ref);
  const paidNoAck  = parts.filter(p => p.paid && !p.facture_envoyee);
  const done       = parts.filter(p => p.paid && p.facture_envoyee);

  const FILTERS = [
    { id: 'all',      label: 'Tous',             count: parts.length,     color: THEME.text.secondary,  bg: 'rgba(255,255,255,0.06)' },
    { id: 'urgent',   label: '⚠ À facturer',     count: urgent.length,    color: '#EF4444',             bg: 'rgba(239,68,68,0.12)'   },
    { id: 'pending',  label: '⏳ En attente',     count: pending.length,   color: '#F59E0B',             bg: 'rgba(245,158,11,0.12)'  },
    { id: 'paidNoAck',label: '✓ Payé',            count: paidNoAck.length, color: '#22C55E',             bg: 'rgba(34,197,94,0.12)'   },
    { id: 'done',     label: '✓✓ Clôturé',       count: done.length,      color: '#A855F7',             bg: 'rgba(168,85,247,0.12)'  },
  ];

  const filtered = filter === 'all' ? parts
    : filter === 'urgent' ? urgent
    : filter === 'pending' ? pending
    : filter === 'paidNoAck' ? paidNoAck
    : done;

  const exportCSV = () => {
    const headers = ['Nom', 'Prénom', 'Voiture', 'Téléphone', 'Email', 'Véhicules', 'Pilotes', 'Repas', 'Hôtel', 'Essence', 'DDP (€)', 'Anneaux', 'LOC (€)', 'Transport (€)', 'Autre libellé', 'Autre (€)', 'Total (€)', 'N° Facture', 'Facture envoyée', 'Facture payée', 'PDF'];
    const rows = parts.map(p => [
      p.nom ?? '', p.prenom ?? '',
      [p.marque, p.modele].filter(Boolean).join(' '),
      p.tel ?? '', p.email ?? '',
      num(p.vehicules), num(p.pilotes), num(p.repas), num(p.hotel), num(p.essence),
      num(p.montant_ddp), num(p.anneaux), num(p.montant_loc), num(p.montant_transport),
      p.autre_label ?? '', num(p.montant_autre),
      pTotal(p), p.invoice_ref ?? '', p.facture_envoyee ? 'Oui' : 'Non', p.paid ? 'Oui' : 'Non', p.invoice_url ?? '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${td.name.replace(/[^a-z0-9]/gi, '_')}_participants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

      {/* Barre header */}
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>
          Participants
          <span style={{ fontWeight: 400, color: THEME.text.muted, fontSize: 12, marginLeft: 8 }}>{parts.length} inscrits</span>
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <Btn size="sm" variant="secondary" onClick={exportCSV}>⬇ CSV</Btn>
          <Btn size="sm" onClick={onAdd}>+ Participant</Btn>
        </div>
      </div>

      {/* Pills de filtre — état facturation */}
      {parts.length > 0 && (
        <div style={{ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: `1px solid ${THEME.border}`, flexShrink: 0, overflowX: 'auto' }}>
          {FILTERS.map(f => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: active ? f.bg : 'rgba(255,255,255,0.04)',
                  color: active ? f.color : THEME.text.muted,
                  fontSize: 11, fontWeight: active ? 700 : 500, fontFamily: 'inherit',
                  outline: active ? `1px solid ${f.color}44` : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
                <span style={{ background: active ? `${f.color}22` : 'rgba(255,255,255,0.08)', color: active ? f.color : THEME.text.muted, borderRadius: 10, padding: '0 5px', fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{f.count}</span>
              </button>
            );
          })}
          {/* Alerte globale si des participants à facturer */}
          {urgent.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#EF4444' }}>
                {urgent.length} sans facture — {fmt(urgent.reduce((s, p) => s + pTotal(p), 0))} à encaisser
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflow: 'auto' }}>
        {parts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: THEME.text.muted, fontSize: 13 }}>
            Aucun participant. Ajoutez-en un !
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: THEME.text.muted, fontSize: 12 }}>
            Aucun participant dans cette catégorie.
          </div>
        ) : (
          <div style={{ minWidth: 1200 }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4, padding: '6px 16px', position: 'sticky', top: 0, zIndex: 1, background: '#111114', borderBottom: `1px solid ${THEME.border}`, fontSize: 9, color: THEME.text.muted, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>
              <span>Nom</span><span>Voiture</span><span>Contact</span>
              <span style={{ textAlign: 'center' }}>Vhc</span>
              <span style={{ textAlign: 'center' }}>Pil</span>
              <span style={{ textAlign: 'center' }}>Rep</span>
              <span style={{ textAlign: 'center' }}>Hôt</span>
              <span style={{ textAlign: 'center' }}>Ess</span>
              <span style={{ textAlign: 'right' }}>DDP</span>
              <span style={{ textAlign: 'center' }}>Ann</span>
              <span style={{ textAlign: 'right' }}>LOC</span>
              <span style={{ textAlign: 'right' }}>Transport</span>
              <span style={{ textAlign: 'right' }}>Autre</span>
              <span style={{ textAlign: 'right' }}>Total</span>
              <span>N° Fact.</span>
              <span style={{ textAlign: 'center' }}>Fact. env.</span>
              <span style={{ textAlign: 'center' }}>Fact. payée</span>
              <span style={{ textAlign: 'center' }}>PDF</span>
              <span />
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 16px 8px' }}>
              {filtered.map(p => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  onTogglePaid={() => updateParticipant(p.id, { paid: !p.paid })}
                  onDelete={() => deleteParticipant(p.id)}
                  onEdit={() => onEditParticipant(p)}
                  onUpdate={(d) => updateParticipant(p.id, d)}
                  onToggleFacture={() => updateParticipant(p.id, { facture_envoyee: !p.facture_envoyee })}
                  onUploadInvoice={(file) => uploadParticipantInvoice(p.id, file)}
                />
              ))}
            </div>

            {/* Totals — toujours sur tous les participants, pas le filtre actif */}
            <div style={{ display: 'grid', gridTemplateColumns: COLS, gap: 4, padding: '10px 16px', borderTop: `2px solid ${THEME.border}`, fontSize: 11, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani', background: 'rgba(255,255,255,0.02)' }}>
              <span style={{ fontSize: 10, color: THEME.text.muted, fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', alignSelf: 'center' }}>Totaux ({parts.length})</span>
              <span /><span />
              <span style={{ textAlign: 'center' }}>{parts.reduce((s, p) => s + num(p.vehicules), 0)}</span>
              <span style={{ textAlign: 'center' }}>{parts.reduce((s, p) => s + num(p.pilotes), 0)}</span>
              <span style={{ textAlign: 'center' }}>
                <div>{parts.reduce((s, p) => s + num(p.repas), 0)}</div>
                {parts.some(p => num(p.montant_repas) > 0) && <div style={{ fontSize: 9, color: THEME.accent.orange }}>{fmt(parts.reduce((s, p) => s + num(p.montant_repas), 0))}</div>}
              </span>
              <span style={{ textAlign: 'center' }}>
                <div>{parts.reduce((s, p) => s + num(p.hotel), 0)}</div>
                {parts.some(p => num(p.montant_hotel) > 0) && <div style={{ fontSize: 9, color: THEME.accent.orange }}>{fmt(parts.reduce((s, p) => s + num(p.montant_hotel), 0))}</div>}
              </span>
              <span style={{ textAlign: 'center' }}>
                <div>{parts.reduce((s, p) => s + num(p.essence), 0)}</div>
                {parts.some(p => num(p.montant_essence) > 0) && <div style={{ fontSize: 9, color: THEME.accent.orange }}>{fmt(parts.reduce((s, p) => s + num(p.montant_essence), 0))}</div>}
              </span>
              <span style={{ textAlign: 'right', color: THEME.accent.orange }}>{fmt(parts.reduce((s, p) => s + num(p.montant_ddp), 0))}</span>
              <span style={{ textAlign: 'center' }}>{parts.reduce((s, p) => s + num(p.anneaux), 0)}</span>
              <span style={{ textAlign: 'right', color: THEME.accent.orange }}>{fmt(parts.reduce((s, p) => s + num(p.montant_loc), 0))}</span>
              <span style={{ textAlign: 'right', color: THEME.accent.orange }}>{fmt(parts.reduce((s, p) => s + num(p.montant_transport), 0))}</span>
              <span style={{ textAlign: 'right', color: THEME.accent.orange }}>{parts.some(p => num(p.montant_autre) > 0) ? fmt(parts.reduce((s, p) => s + num(p.montant_autre), 0)) : '—'}</span>
              <span style={{ textAlign: 'right', color: THEME.accent.green, fontSize: 13 }}>{fmt(parts.reduce((s, p) => s + pTotal(p), 0))}</span>
              <span /><span /><span /><span /><span />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ParticipantRow({ participant: p, onTogglePaid, onDelete, onEdit, onUpdate, onToggleFacture, onUploadInvoice }) {
  const [hov, setHov] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const total = pTotal(p);

  const rowBg = () => {
    if (!p.paid && !p.invoice_ref) return hov ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)';
    if (!p.paid && p.invoice_ref)  return hov ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)';
    if (p.paid && p.facture_envoyee) return hov ? 'rgba(168,85,247,0.08)' : 'rgba(168,85,247,0.04)';
    return hov ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.03)';
  };
  const leftColor = () => {
    if (!p.paid && !p.invoice_ref) return '#EF4444';
    if (!p.paid && p.invoice_ref)  return '#F59E0B';
    if (p.paid && p.facture_envoyee) return '#A855F7';
    return '#22C55E';
  };

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setConfirmDelete(false); }}
      style={{
        display: 'grid', gridTemplateColumns: COLS, gap: 4,
        alignItems: 'center', padding: '7px 0 7px 6px',
        borderBottom: `1px solid ${THEME.border}`,
        borderLeft: `3px solid ${leftColor()}`,
        background: rowBg(),
        borderRadius: 4, transition: 'background 0.15s',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.prenom} {p.nom}</div>
      </div>
      <div style={{ fontSize: 11, color: THEME.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[p.marque, p.modele].filter(Boolean).join(' ')}</div>
      <div style={{ minWidth: 0 }}>
        {p.tel   && <div style={{ fontSize: 10, color: THEME.text.muted,  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tel}</div>}
        {p.email && <div style={{ fontSize: 10, color: THEME.accent.blue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.email}</div>}
      </div>
      <Cell center>{num(p.vehicules) || '—'}</Cell>
      <Cell center muted>{num(p.pilotes) || '—'}</Cell>
      <Cell center muted>{num(p.repas) || '—'}</Cell>
      <Cell center muted>{num(p.hotel) || '—'}</Cell>
      <Cell center muted>{num(p.essence) || '—'}</Cell>
      <Cell right active={num(p.montant_ddp) > 0}>{num(p.montant_ddp) > 0 ? fmt(p.montant_ddp) : '—'}</Cell>
      <Cell center active={num(p.anneaux) > 0} color={THEME.accent.purple}>{num(p.anneaux) || '—'}</Cell>
      <Cell right active={num(p.montant_loc) > 0}>{num(p.montant_loc) > 0 ? fmt(p.montant_loc) : '—'}</Cell>
      <Cell right active={num(p.montant_transport) > 0}>{num(p.montant_transport) > 0 ? fmt(p.montant_transport) : '—'}</Cell>
      <Cell right active={num(p.montant_autre) > 0}>{num(p.montant_autre) > 0 ? fmt(p.montant_autre) : '—'}</Cell>
      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 800, color: p.paid ? THEME.accent.green : total > 0 ? THEME.text.primary : THEME.text.muted, fontFamily: 'Rajdhani' }}>
        {total > 0 ? fmt(total) : '—'}
      </div>
      <InvoiceRefCell value={p.invoice_ref} onSave={(v) => onUpdate({ invoice_ref: v })} />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onToggleFacture}
          title={p.facture_envoyee ? 'Facture envoyée' : 'Marquer facture envoyée'}
          style={{ width: 20, height: 20, borderRadius: 5, background: p.facture_envoyee ? THEME.accent.purple : 'transparent', border: `2px solid ${p.facture_envoyee ? THEME.accent.purple : THEME.text.muted}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', transition: 'all 0.15s' }}
        >{p.facture_envoyee ? '✓' : ''}</button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onTogglePaid}
          title={p.paid ? 'Marquer non payé' : 'Facture payée'}
          style={{ width: 20, height: 20, borderRadius: 5, background: p.paid ? THEME.accent.green : 'transparent', border: `2px solid ${p.paid ? THEME.accent.green : THEME.text.muted}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', transition: 'all 0.15s' }}
        >{p.paid ? '✓' : ''}</button>
      </div>
      <PdfCell invoiceUrl={p.invoice_url} onUpload={onUploadInvoice} />
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        {confirmDelete ? (
          <button onClick={onDelete} style={{ background: THEME.accent.red, border: 'none', borderRadius: 4, padding: '2px 6px', color: '#fff', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>×</button>
        ) : (
          <>
            {hov && (
              <button
                onClick={onEdit}
                title="Modifier"
                style={{ background: THEME.accent.orangeDim, border: 'none', borderRadius: 4, padding: '2px 6px', color: THEME.accent.orange, fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >✎</button>
            )}
            <button
              onClick={() => setConfirmDelete(true)}
              style={{ background: 'transparent', border: 'none', color: hov ? THEME.text.muted : 'transparent', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 3px', borderRadius: 4, transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = THEME.accent.red}
              onMouseLeave={e => e.currentTarget.style.color = hov ? THEME.text.muted : 'transparent'}
            >×</button>
          </>
        )}
      </div>
    </div>
  );
}

function InvoiceRefCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={() => { onSave(val); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(val); setEditing(false); }
          if (e.key === 'Escape') { setVal(value ?? ''); setEditing(false); }
        }}
        style={{ width: '100%', background: THEME.bg.input, border: `1px solid ${THEME.accent.orange}`, borderRadius: 4, padding: '2px 6px', color: THEME.text.primary, fontSize: 10, fontFamily: 'inherit', outline: 'none' }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title={val || 'Cliquer pour saisir le numéro de facture'}
      style={{ fontSize: 10, color: val ? THEME.accent.blue : THEME.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'text', padding: '2px 0', minHeight: 18 }}
    >
      {val || '—'}
    </div>
  );
}

function PdfCell({ invoiceUrl, onUpload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      console.error('PDF upload error:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
      <input ref={inputRef} type="file" accept="application/pdf,application/msword,image/*" style={{ display: 'none' }} onChange={handleFile} />
      {invoiceUrl ? (
        <>
          <a
            href={invoiceUrl} target="_blank" rel="noreferrer"
            title="Télécharger la facture"
            onClick={e => e.stopPropagation()}
            style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', fontSize: 11, textDecoration: 'none', flexShrink: 0 }}
          >⬇</a>
          <button
            onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
            title="Remplacer la facture"
            style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.07)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.text.muted, fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
          >{uploading ? '…' : '↑'}</button>
        </>
      ) : (
        <button
          onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
          title="Déposer la facture PDF"
          style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(240,120,20,0.1)', border: `1px dashed rgba(240,120,20,0.35)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.accent.orange, fontSize: 10, cursor: 'pointer', flexShrink: 0 }}
        >{uploading ? '…' : '📎'}</button>
      )}
    </div>
  );
}

function Cell({ children, center, right, muted, active, color }) {
  return (
    <div style={{
      textAlign: center ? 'center' : right ? 'right' : 'left',
      fontSize: 12, fontWeight: active ? 600 : 400,
      color: color ?? (active ? THEME.text.primary : muted ? THEME.text.muted : THEME.text.secondary),
      fontFamily: right ? 'Rajdhani, sans-serif' : 'inherit',
    }}>{children}</div>
  );
}

// ─── PANNEAU FINANCES ─────────────────────────────────────────────────────────

function FinancesSection({ td, parts, profit, revenue, expected, costs, onEdit, isMobile }) {
  const ddpRev       = parts.reduce((s, p) => s + num(p.montant_ddp), 0);
  const anneauxRev   = parts.reduce((s, p) => s + num(p.montant_anneaux), 0);
  const repasRev     = parts.reduce((s, p) => s + num(p.montant_repas), 0);
  const hotelRev     = parts.reduce((s, p) => s + num(p.montant_hotel), 0);
  const essenceRev   = parts.reduce((s, p) => s + num(p.montant_essence), 0);
  const locRev       = parts.reduce((s, p) => s + num(p.montant_loc), 0);
  const transportRev = parts.reduce((s, p) => s + num(p.montant_transport), 0);
  const autreRev     = parts.reduce((s, p) => s + num(p.montant_autre), 0);

  return (
    <div style={{
      width: isMobile ? 'auto' : 300, flex: isMobile ? 1 : 'unset',
      flexShrink: 0, borderLeft: isMobile ? 'none' : `1px solid ${THEME.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{ padding: '10px 16px', borderBottom: `1px solid ${THEME.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>Finances</span>
        <button onClick={onEdit} style={{ fontSize: 11, color: THEME.accent.orange, fontWeight: 600, background: THEME.accent.orangeDim, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>Modifier coûts</button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {/* Résultat net */}
        <div style={{
          background: profit >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${profit >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: 10, padding: '14px', textAlign: 'center', marginBottom: 20,
        }}>
          <div style={{ fontSize: 9, color: THEME.text.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Résultat net</div>
          <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'Rajdhani', color: profit >= 0 ? THEME.accent.green : THEME.accent.red }}>
            {profit >= 0 ? '+' : ''}{fmt(profit)}
          </div>
          <div style={{ fontSize: 10, color: THEME.text.muted, marginTop: 4 }}>
            {fmt(revenue)} encaissé · {fmt(costs)} de coûts
          </div>
        </div>

        {/* Recettes */}
        <FinanceBlock title="Recettes" total={revenue} totalLabel="Total encaissé" totalColor={THEME.accent.green} subTotal={expected !== revenue ? `/ ${fmt(expected)} attendu` : null}>
          {[
            { label: 'Droits de piste', value: ddpRev },
            { label: 'Anneaux',         value: anneauxRev },
            { label: 'Déjeuners',       value: repasRev },
            { label: 'Hôtel',           value: hotelRev },
            { label: 'Essence',         value: essenceRev },
            { label: 'Location',        value: locRev },
            { label: 'Transport',       value: transportRev },
            { label: 'Autre',           value: autreRev },
          ].map(r => (
            <FinanceLine key={r.label} label={r.label} value={r.value} color={THEME.accent.green} />
          ))}
        </FinanceBlock>

        {/* Coûts organisateur */}
        <FinanceBlock title="Coûts organisateur" total={costs} totalLabel="Total coûts" totalColor={costs > 0 ? THEME.accent.red : THEME.text.muted}>
          {COST_ITEMS.map(c => (
            <FinanceLine key={c.key} label={c.label} value={num(td[c.key])} color={THEME.accent.red} />
          ))}
        </FinanceBlock>

        {/* Suivi facturation */}
        {parts.length > 0 && (() => {
          const factUrgent  = parts.filter(p => !p.paid && !p.invoice_ref);
          const factPending = parts.filter(p => !p.paid && p.invoice_ref);
          const factPaid    = parts.filter(p => p.paid && !p.facture_envoyee);
          const factDone    = parts.filter(p => p.paid && p.facture_envoyee);
          const rows = [
            { label: 'À facturer',        count: factUrgent.length,  amount: factUrgent.reduce((s, p)  => s + pTotal(p), 0), color: '#EF4444' },
            { label: 'Facturé · en attente', count: factPending.length, amount: factPending.reduce((s, p) => s + pTotal(p), 0), color: '#F59E0B' },
            { label: 'Payé · sans accusé', count: factPaid.length,   amount: factPaid.reduce((s, p)   => s + pTotal(p), 0), color: '#22C55E' },
            { label: 'Clôturé',           count: factDone.length,    amount: factDone.reduce((s, p)   => s + pTotal(p), 0), color: '#A855F7' },
          ];
          return (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Suivi facturation</div>
              {rows.map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${THEME.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: r.count > 0 ? THEME.text.secondary : THEME.text.muted }}>{r.label}</span>
                    {r.count > 0 && <span style={{ fontSize: 10, color: r.color, fontWeight: 700, background: `${r.color}18`, borderRadius: 8, padding: '0 5px' }}>{r.count}</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: r.count > 0 ? 700 : 400, color: r.count > 0 ? r.color : THEME.text.muted, fontFamily: 'Rajdhani' }}>
                    {r.count > 0 ? fmt(r.amount) : '—'}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Taux de remplissage */}
        {(td.max_participants > 0) && parts.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: THEME.text.muted }}>Taux de remplissage</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.text.secondary }}>
                {parts.length}/{td.max_participants} ({Math.round(parts.length / td.max_participants * 100)}%)
              </span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, parts.length / td.max_participants * 100)}%`, background: parts.length >= td.max_participants ? THEME.accent.green : THEME.accent.blue, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FinanceBlock({ title, children, total, totalLabel, totalColor, subTotal }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: THEME.text.muted, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{title}</div>
      {children}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0 0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text.primary }}>{totalLabel}</span>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: totalColor, fontFamily: 'Rajdhani' }}>{fmt(total)}</div>
          {subTotal && <div style={{ fontSize: 10, color: THEME.text.muted }}>{subTotal}</div>}
        </div>
      </div>
    </div>
  );
}

function FinanceLine({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${THEME.border}` }}>
      <span style={{ fontSize: 12, color: value > 0 ? THEME.text.secondary : THEME.text.muted }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: value > 0 ? 700 : 400, color: value > 0 ? color : THEME.text.muted, fontFamily: 'Rajdhani' }}>
        {value > 0 ? fmt(value) : '—'}
      </span>
    </div>
  );
}

// ─── FORMULAIRE TRACK DAY ─────────────────────────────────────────────────────

function TrackDayForm({ td, onSubmit, onClose }) {
  const [form, setForm] = useState({
    name: td?.name ?? '', circuit: td?.circuit ?? '', date: td?.date ?? '',
    status: td?.status ?? 'À venir', max_participants: td?.max_participants ?? 20,
    prix_vehicule: td?.prix_vehicule ?? 750, prix_anneau: td?.prix_anneau ?? 750,
    prix_dejeuner: td?.prix_dejeuner ?? 0, prix_hotel: td?.prix_hotel ?? 0,
    prix_essence: td?.prix_essence ?? 0,
    prix_loc: td?.prix_loc ?? 0, prix_transport: td?.prix_transport ?? 0,
    cost_droits_piste: td?.cost_droits_piste ?? 0, cost_repas: td?.cost_repas ?? 0,
    cost_hotel: td?.cost_hotel ?? 0, cost_essence: td?.cost_essence ?? 0,
    cost_transport: td?.cost_transport ?? 0, cost_location_auto: td?.cost_location_auto ?? 0,
    cost_autre: td?.cost_autre ?? 0, notes: td?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const totalCostPreview = COST_ITEMS.reduce((s, c) => s + num(form[c.key]), 0);

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 7, background: THEME.bg.input, border: `1px solid ${THEME.border}`, color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const lbl = { fontSize: 11, color: THEME.text.muted, marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 'clamp(16px, 4vw, 28px) clamp(16px, 4vw, 28px)', width: 'min(92vw, 600px)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani', marginBottom: 20 }}>
          {td ? 'Modifier le track day' : 'Nouveau track day'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Nom de l'événement *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bresse 18/03/2026" style={{ ...inp, borderColor: errors.name ? THEME.accent.red : undefined }} />
            {errors.name && <div style={{ fontSize: 11, color: THEME.accent.red, marginTop: 3 }}>{errors.name}</div>}
          </div>
          <div>
            <label style={lbl}>Circuit *</label>
            <input value={form.circuit} onChange={e => set('circuit', e.target.value)} placeholder="Circuit de Bresse" style={{ ...inp, borderColor: errors.circuit ? THEME.accent.red : undefined }} />
            {errors.circuit && <div style={{ fontSize: 11, color: THEME.accent.red, marginTop: 3 }}>{errors.circuit}</div>}
          </div>
          <div>
            <label style={lbl}>Date *</label>
            <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={{ ...inp, borderColor: errors.date ? THEME.accent.red : undefined }} />
            {errors.date && <div style={{ fontSize: 11, color: THEME.accent.red, marginTop: 3 }}>{errors.date}</div>}
          </div>
          <div>
            <label style={lbl}>Statut</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inp}>
              {['À venir', 'Terminé', 'Clôturé', 'Annulé'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Participants max</label>
            <input type="number" min="1" value={form.max_participants} onChange={e => set('max_participants', parseInt(e.target.value) || 0)} style={inp} />
          </div>
        </div>

        <SectionTitle>Tarifs de référence</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={lbl}>Prix par véhicule (€)</label>
            <input type="number" min="0" value={form.prix_vehicule} onChange={e => set('prix_vehicule', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Prix par anneau supplémentaire (€)</label>
            <input type="number" min="0" value={form.prix_anneau} onChange={e => set('prix_anneau', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Prix déjeuner par personne (€)</label>
            <input type="number" min="0" value={form.prix_dejeuner} onChange={e => set('prix_dejeuner', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Prix nuit d'hôtel par personne (€)</label>
            <input type="number" min="0" value={form.prix_hotel} onChange={e => set('prix_hotel', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Prix bidon essence 20L (€)</label>
            <input type="number" min="0" value={form.prix_essence} onChange={e => set('prix_essence', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Prix LOC véhicule — défaut (€)</label>
            <input type="number" min="0" value={form.prix_loc} onChange={e => set('prix_loc', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Prix transport — défaut (€)</label>
            <input type="number" min="0" value={form.prix_transport} onChange={e => set('prix_transport', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
        </div>

        <SectionTitle>Coûts organisateur</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 12 }}>
          {COST_ITEMS.map(c => (
            <div key={c.key}>
              <label style={lbl}>{c.label} (€)</label>
              <input type="number" min="0" step="1" value={form[c.key]} onChange={e => set(c.key, parseFloat(e.target.value) || 0)} style={inp} />
            </div>
          ))}
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 12, color: THEME.text.secondary }}>Total coûts</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: THEME.accent.red, fontFamily: 'Rajdhani' }}>{fmt(totalCostPreview)}</span>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Informations complémentaires…" style={{ ...inp, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Annuler</Btn>
          <Btn
            disabled={saving}
            onClick={async () => {
              const errs = {};
              if (!form.name.trim()) errs.name = 'Champ requis';
              if (!form.circuit.trim()) errs.circuit = 'Champ requis';
              if (!form.date) errs.date = 'Champ requis';
              if (Object.keys(errs).length) { setErrors(errs); return; }
              setSaving(true);
              try { await onSubmit(form); onClose(); }
              catch (_) { /* toast already shown in hook */ }
              finally { setSaving(false); }
            }}
          >
            {saving ? 'Enregistrement…' : td ? 'Enregistrer' : 'Créer'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── FORMULAIRE PARTICIPANT ───────────────────────────────────────────────────

function ParticipantForm({ td, participant, clients = [], createClient, onSubmit, onClose }) {
  const isEdit = !!participant;
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [saveAsClient, setSaveAsClient] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const [form, setForm] = useState({
    prenom: participant?.prenom ?? '',
    nom: participant?.nom ?? '',
    marque: participant?.marque ?? '',
    modele: participant?.modele ?? '',
    tel: participant?.tel ?? '',
    email: participant?.email ?? '',
    vehicules: participant?.vehicules ?? 1,
    pilotes: participant?.pilotes ?? 0,
    repas: participant?.repas ?? 0,
    hotel: participant?.hotel ?? 0,
    montant_ddp: participant?.montant_ddp ?? num(td?.prix_vehicule ?? 750),
    anneaux: participant?.anneaux ?? 0,
    montant_anneaux: participant?.montant_anneaux ?? 0,
    montant_repas: participant?.montant_repas ?? 0,
    montant_hotel: participant?.montant_hotel ?? 0,
    essence: participant?.essence ?? 0,
    montant_essence: participant?.montant_essence ?? 0,
    montant_loc: participant?.montant_loc ?? num(td?.prix_loc ?? 0),
    montant_transport: participant?.montant_transport ?? num(td?.prix_transport ?? 0),
    invoice_ref: participant?.invoice_ref ?? '',
    facture_envoyee: participant?.facture_envoyee ?? false,
    paid: participant?.paid ?? false,
    autre_label: participant?.autre_label ?? '',
    montant_autre: participant?.montant_autre ?? 0,
    notes: participant?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [prenomError, setPrenomError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Ferme le dropdown si clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !searchRef.current?.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredClients = search.trim().length === 0 ? clients : clients.filter(c =>
    `${c.prenom} ${c.nom} ${c.marque} ${c.modele} ${c.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  );

  const selectClient = (client) => {
    setSelectedClientId(client.id);
    setSearch(`${client.prenom} ${client.nom}`);
    setShowDropdown(false);
    setForm(f => ({
      ...f,
      prenom: client.prenom,
      nom: client.nom ?? '',
      marque: client.marque ?? '',
      modele: client.modele ?? '',
      tel: client.tel ?? '',
      email: client.email ?? '',
    }));
  };

  const clearClient = () => {
    setSelectedClientId(null);
    setSearch('');
    setForm(f => ({ ...f, prenom: '', nom: '', marque: '', modele: '', tel: '', email: '' }));
    setSaveAsClient(false);
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleVehicules = (v) => {
    const vhc = parseFloat(v) || 0;
    setForm(f => ({ ...f, vehicules: vhc, montant_ddp: vhc * num(td?.prix_vehicule ?? 750) }));
  };
  const handleAnneaux = (v) => {
    const ann = parseInt(v) || 0;
    setForm(f => ({ ...f, anneaux: ann, montant_anneaux: ann * num(td?.prix_anneau ?? 750) }));
  };
  const handleRepas = (v) => {
    const r = parseInt(v) || 0;
    setForm(f => ({ ...f, repas: r, montant_repas: r * num(td?.prix_dejeuner ?? 0) }));
  };
  const handleHotel = (v) => {
    const h = parseInt(v) || 0;
    setForm(f => ({ ...f, hotel: h, montant_hotel: h * num(td?.prix_hotel ?? 0) }));
  };
  const handleEssence = (v) => {
    const e = parseInt(v) || 0;
    setForm(f => ({ ...f, essence: e, montant_essence: e * num(td?.prix_essence ?? 0) }));
  };

  const handleSubmit = async () => {
    if (!form.prenom.trim()) { setPrenomError('Prénom requis'); return; }
    setSaving(true);
    try {
      if (saveAsClient && !selectedClientId) {
        await createClient({ prenom: form.prenom, nom: form.nom, marque: form.marque, modele: form.modele, tel: form.tel, email: form.email });
      }
      await onSubmit(form);
      onClose();
    } catch (_) {
      /* toast already shown in hook */
    } finally {
      setSaving(false);
    }
  };

  const total = pTotal(form);
  const isNewPerson = !selectedClientId;
  const inp = { width: '100%', padding: '8px 12px', borderRadius: 7, background: THEME.bg.input, border: `1px solid ${THEME.border}`, color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none' };
  const lbl = { fontSize: 11, color: THEME.text.muted, marginBottom: 4, display: 'block' };
  const hint = { fontSize: 9, color: THEME.accent.orange, marginLeft: 4 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 16, padding: 'clamp(16px, 4vw, 28px) clamp(16px, 4vw, 28px)', width: 'min(92vw, 580px)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani', marginBottom: 4 }}>
          {isEdit ? `Modifier — ${participant.prenom} ${participant.nom}` : 'Ajouter un participant'}
        </div>
        <div style={{ fontSize: 12, color: THEME.text.muted, marginBottom: 20 }}>{td?.name}</div>

        {/* ── Recherche client (création uniquement) ── */}
        {!isEdit && (
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <label style={lbl}>Rechercher un client existant</label>
          {selectedClientId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: 'rgba(240,120,20,0.1)', border: `1px solid ${THEME.accent.orange}55` }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{form.prenom} {form.nom}</div>
                <div style={{ fontSize: 11, color: THEME.text.muted }}>{[form.marque, form.modele].filter(Boolean).join(' ')}{form.tel ? ` · ${form.tel}` : ''}</div>
              </div>
              <button onClick={clearClient} style={{ background: 'transparent', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 4 }}
                onMouseEnter={e => e.currentTarget.style.color = THEME.accent.red}
                onMouseLeave={e => e.currentTarget.style.color = THEME.text.muted}
              >×</button>
            </div>
          ) : (
            <input
              ref={searchRef}
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder={clients.length > 0 ? `Rechercher parmi ${clients.length} client${clients.length > 1 ? 's' : ''}…` : 'Aucun client enregistré — remplissez le formulaire'}
              style={{ ...inp, paddingRight: 36 }}
              autoFocus
            />
          )}

          {/* Dropdown */}
          {showDropdown && !selectedClientId && (
            <div
              ref={dropdownRef}
              style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 8, marginTop: 4, maxHeight: 220, overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
            >
              {filteredClients.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 12, color: THEME.text.muted, textAlign: 'center' }}>
                  {search.trim() ? 'Aucun client trouvé — remplissez le formulaire pour une nouvelle personne' : 'Aucun client enregistré'}
                </div>
              ) : (
                filteredClients.slice(0, 10).map(c => (
                  <button
                    key={c.id}
                    onClick={() => selectClient(c)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${THEME.border}`, textAlign: 'left' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: THEME.accent.orangeDim, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: THEME.accent.orange, flexShrink: 0 }}>
                      {c.prenom?.[0]}{c.nom?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{c.prenom} {c.nom}</div>
                      <div style={{ fontSize: 11, color: THEME.text.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {[c.marque, c.modele].filter(Boolean).join(' ')}{c.tel ? ` · ${c.tel}` : ''}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        )}

        {/* ── Infos identité ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Prénom *</label>
            <input value={form.prenom} onChange={e => { set('prenom', e.target.value); setPrenomError(''); }} placeholder="Jean-Rémi" style={{ ...inp, background: selectedClientId ? 'rgba(240,120,20,0.06)' : THEME.bg.input, borderColor: prenomError ? THEME.accent.red : undefined }} />
            {prenomError && <div style={{ fontSize: 11, color: THEME.accent.red, marginTop: 3 }}>{prenomError}</div>}
          </div>
          <div>
            <label style={lbl}>Nom</label>
            <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="BRIX" style={{ ...inp, background: selectedClientId ? 'rgba(240,120,20,0.06)' : THEME.bg.input }} />
          </div>
          <div>
            <label style={lbl}>Marque</label>
            <input value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Renault" style={{ ...inp, background: selectedClientId ? 'rgba(240,120,20,0.06)' : THEME.bg.input }} />
          </div>
          <div>
            <label style={lbl}>Modèle</label>
            <input value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="M4RS Trophy-R" style={{ ...inp, background: selectedClientId ? 'rgba(240,120,20,0.06)' : THEME.bg.input }} />
          </div>
          <div>
            <label style={lbl}>Téléphone</label>
            <input value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="+33 6 76 44 45 98" style={{ ...inp, background: selectedClientId ? 'rgba(240,120,20,0.06)' : THEME.bg.input }} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jean@exemple.fr" style={{ ...inp, background: selectedClientId ? 'rgba(240,120,20,0.06)' : THEME.bg.input }} />
          </div>
        </div>

        {/* Sauvegarder comme client si nouvelle personne (création uniquement) */}
        {!isEdit && isNewPerson && form.prenom && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.07)', border: `1px solid rgba(59,130,246,0.2)` }}>
            <button
              onClick={() => setSaveAsClient(v => !v)}
              style={{ width: 20, height: 20, borderRadius: 5, background: saveAsClient ? THEME.accent.blue : 'transparent', border: `2px solid ${saveAsClient ? THEME.accent.blue : THEME.text.muted}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', transition: 'all 0.15s', flexShrink: 0 }}
            >{saveAsClient ? '✓' : ''}</button>
            <span style={{ fontSize: 12, color: THEME.text.secondary }}>Enregistrer <strong>{form.prenom} {form.nom}</strong> dans la base clients</span>
          </div>
        )}

        <SectionTitle>Présences</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Véhicules</label>
            <select value={form.vehicules} onChange={e => handleVehicules(e.target.value)} style={inp}>
              {[0, 0.5, 1].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Pilotes</label>
            <input type="number" min="0" value={form.pilotes} onChange={e => set('pilotes', parseInt(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Repas{num(td?.prix_dejeuner) > 0 && <span style={hint}>× {fmt(td.prix_dejeuner)}/pers</span>}</label>
            <input type="number" min="0" value={form.repas} onChange={e => handleRepas(e.target.value)} style={inp} />
            {num(td?.prix_dejeuner) > 0 && form.repas > 0 && <div style={{ fontSize: 10, color: THEME.accent.orange, marginTop: 3 }}>= {fmt(form.montant_repas)}</div>}
          </div>
          <div>
            <label style={lbl}>Hôtel (nuits){num(td?.prix_hotel) > 0 && <span style={hint}>× {fmt(td.prix_hotel)}/nuit</span>}</label>
            <input type="number" min="0" value={form.hotel} onChange={e => handleHotel(e.target.value)} style={inp} />
            {num(td?.prix_hotel) > 0 && form.hotel > 0 && <div style={{ fontSize: 10, color: THEME.accent.orange, marginTop: 3 }}>= {fmt(form.montant_hotel)}</div>}
          </div>
          <div>
            <label style={lbl}>Essence (bidons){num(td?.prix_essence) > 0 && <span style={hint}>× {fmt(td.prix_essence)}</span>}</label>
            <input type="number" min="0" value={form.essence} onChange={e => handleEssence(e.target.value)} style={inp} />
            {num(td?.prix_essence) > 0 && form.essence > 0 && <div style={{ fontSize: 10, color: THEME.accent.orange, marginTop: 3 }}>= {fmt(form.montant_essence)}</div>}
          </div>
        </div>

        <SectionTitle>Facturation</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Droit de piste (€) <span style={hint}>auto-calculé</span></label>
            <input type="number" min="0" value={form.montant_ddp} onChange={e => set('montant_ddp', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Nb anneaux supp.</label>
            <input type="number" min="0" value={form.anneaux} onChange={e => handleAnneaux(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Montant anneaux (€) <span style={hint}>auto-calculé</span></label>
            <input type="number" min="0" value={form.montant_anneaux} onChange={e => set('montant_anneaux', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Location véhicule (€){num(td?.prix_loc) > 0 && <span style={hint}>défaut {fmt(td.prix_loc)}</span>}</label>
            <input type="number" min="0" value={form.montant_loc} onChange={e => set('montant_loc', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Transport (€){num(td?.prix_transport) > 0 && <span style={hint}>défaut {fmt(td.prix_transport)}</span>}</label>
            <input type="number" min="0" value={form.montant_transport} onChange={e => set('montant_transport', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Autre — libellé <span style={{ fontSize: 9, color: THEME.text.muted }}>(optionnel)</span></label>
            <input value={form.autre_label} onChange={e => set('autre_label', e.target.value)} placeholder="Casque, combinaison, chronométrage…" style={inp} />
          </div>
          <div>
            <label style={lbl}>Autre — montant (€)</label>
            <input type="number" min="0" step="1" value={form.montant_autre} onChange={e => set('montant_autre', parseFloat(e.target.value) || 0)} style={inp} />
          </div>
          <div>
            <label style={lbl}>N° facture</label>
            <input value={form.invoice_ref} onChange={e => set('invoice_ref', e.target.value)} placeholder="FC001374" style={inp} />
          </div>
        </div>

        {/* Total + paiement */}
        <div style={{ background: total > 0 ? 'rgba(240,120,20,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${total > 0 ? 'rgba(240,120,20,0.2)' : THEME.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 10, color: THEME.text.muted, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: THEME.accent.orange, fontFamily: 'Rajdhani' }}>{fmt(total)}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => set('paid', !form.paid)}
                style={{ width: 22, height: 22, borderRadius: 5, background: form.paid ? THEME.accent.green : 'transparent', border: `2px solid ${form.paid ? THEME.accent.green : THEME.text.muted}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', transition: 'all 0.15s' }}
              >{form.paid ? '✓' : ''}</button>
              <span style={{ fontSize: 13, color: THEME.text.secondary }}>Facture payée</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={() => set('facture_envoyee', !form.facture_envoyee)}
                style={{ width: 22, height: 22, borderRadius: 5, background: form.facture_envoyee ? THEME.accent.purple : 'transparent', border: `2px solid ${form.facture_envoyee ? THEME.accent.purple : THEME.text.muted}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', transition: 'all 0.15s' }}
              >{form.facture_envoyee ? '✓' : ''}</button>
              <span style={{ fontSize: 13, color: THEME.text.secondary }}>Facture envoyée</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose} disabled={saving}>Annuler</Btn>
          <Btn onClick={handleSubmit} disabled={saving}>{saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}</Btn>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.text.secondary, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, paddingTop: 4, borderTop: `1px solid ${THEME.border}`, paddingTop: 14 }}>
      {children}
    </div>
  );
}

// ─── CLIENTS MANAGER ─────────────────────────────────────────────────────────

function ClientsManager({ clients, onCreate, onUpdate, onDelete, onClose }) {
  const [search, setSearch] = useState('');
  const [editClient, setEditClient] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = search.trim()
    ? clients.filter(c => `${c.prenom} ${c.nom} ${c.marque} ${c.modele} ${c.tel ?? ''} ${c.email ?? ''}`.toLowerCase().includes(search.toLowerCase()))
    : clients;

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 7, background: THEME.bg.input, border: `1px solid ${THEME.border}`, color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 16, width: 'min(92vw, 620px)', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.7)' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani' }}>
              Base clients
              <span style={{ fontSize: 12, fontWeight: 400, color: THEME.text.muted, marginLeft: 10 }}>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" onClick={() => setShowAdd(true)}>+ Ajouter</Btn>
              <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: THEME.text.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px', borderRadius: 6 }}
                onMouseEnter={e => e.currentTarget.style.color = THEME.text.primary}
                onMouseLeave={e => e.currentTarget.style.color = THEME.text.muted}
              >×</button>
            </div>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, voiture, contact…"
            style={inp}
            autoFocus
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: THEME.text.muted }}>
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.25 }}>◎</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text.secondary, marginBottom: 6 }}>
                {search.trim() ? 'Aucun résultat' : 'Aucun client enregistré'}
              </div>
              <div style={{ fontSize: 12 }}>
                {search.trim() ? 'Essayez un autre terme' : 'Ajoutez un client ou cochez « Enregistrer comme nouveau client » lors d\'un track day'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filtered.map(c => (
                <ClientRow
                  key={c.id}
                  client={c}
                  isConfirmDelete={confirmDelete === c.id}
                  onEdit={() => setEditClient(c)}
                  onDelete={() => onDelete(c.id).then(() => setConfirmDelete(null))}
                  onAskDelete={() => setConfirmDelete(c.id)}
                  onCancelDelete={() => setConfirmDelete(null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAdd    && <ClientForm onSubmit={async (d) => { await onCreate(d); setShowAdd(false); }} onClose={() => setShowAdd(false)} />}
      {editClient && <ClientForm client={editClient} onSubmit={async (d) => { await onUpdate(editClient.id, d); setEditClient(null); }} onClose={() => setEditClient(null)} />}
    </div>
  );
}

function ClientRow({ client: c, isConfirmDelete, onEdit, onDelete, onAskDelete, onCancelDelete }) {
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); if (isConfirmDelete) onCancelDelete(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
        borderRadius: 10, border: `1px solid ${hov ? 'rgba(240,120,20,0.2)' : THEME.border}`,
        background: hov ? THEME.bg.cardHover : THEME.bg.input,
        transition: 'all 0.15s', position: 'relative',
      }}
    >
      {/* Avatar */}
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: THEME.accent.orangeDim, border: `1.5px solid rgba(240,120,20,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: THEME.accent.orange, flexShrink: 0 }}>
        {c.prenom?.[0]}{c.nom?.[0]}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.text.primary }}>{c.prenom} {c.nom}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
          {(c.marque || c.modele) && <span style={{ fontSize: 11, color: THEME.text.secondary }}>{[c.marque, c.modele].filter(Boolean).join(' ')}</span>}
          {c.tel   && <span style={{ fontSize: 11, color: THEME.text.muted }}>{c.tel}</span>}
          {c.email && <span style={{ fontSize: 11, color: THEME.accent.blue, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{c.email}</span>}
        </div>
      </div>

      {/* Actions */}
      {hov && !isConfirmDelete && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} style={{ background: THEME.accent.orangeDim, border: `1px solid rgba(240,120,20,0.3)`, borderRadius: 7, padding: '5px 12px', color: THEME.accent.orange, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Modifier</button>
          <button onClick={onAskDelete} style={{ background: 'rgba(239,68,68,0.08)', border: `1px solid rgba(239,68,68,0.2)`, borderRadius: 7, padding: '5px 10px', color: THEME.accent.red, fontSize: 11, cursor: 'pointer' }}>×</button>
        </div>
      )}
      {isConfirmDelete && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: THEME.text.secondary }}>Supprimer ?</span>
          <button onClick={onDelete} style={{ background: THEME.accent.red, border: 'none', borderRadius: 7, padding: '5px 12px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Oui</button>
          <button onClick={onCancelDelete} style={{ background: 'rgba(255,255,255,0.07)', border: `1px solid ${THEME.border}`, borderRadius: 7, padding: '5px 10px', color: THEME.text.secondary, fontSize: 11, cursor: 'pointer' }}>Non</button>
        </div>
      )}
    </div>
  );
}

function ClientForm({ client, onSubmit, onClose }) {
  const [form, setForm] = useState({
    prenom: client?.prenom ?? '',
    nom: client?.nom ?? '',
    marque: client?.marque ?? '',
    modele: client?.modele ?? '',
    tel: client?.tel ?? '',
    email: client?.email ?? '',
    notes: client?.notes ?? '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = { width: '100%', padding: '8px 12px', borderRadius: 7, background: THEME.bg.input, border: `1px solid ${THEME.border}`, color: THEME.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };
  const lbl = { fontSize: 11, color: THEME.text.muted, marginBottom: 4, display: 'block' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(2px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: THEME.bg.card, border: `1px solid ${THEME.border}`, borderRadius: 14, padding: 'clamp(16px, 4vw, 26px) clamp(16px, 4vw, 28px)', width: 'min(92vw, 500px)', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.8)' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.text.primary, fontFamily: 'Rajdhani', marginBottom: 20 }}>
          {client ? 'Modifier le client' : 'Nouveau client'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Prénom *</label>
            <input value={form.prenom} onChange={e => set('prenom', e.target.value)} placeholder="Jean-Rémi" style={inp} autoFocus />
          </div>
          <div>
            <label style={lbl}>Nom</label>
            <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="BRIX" style={inp} />
          </div>
          <div>
            <label style={lbl}>Marque</label>
            <input value={form.marque} onChange={e => set('marque', e.target.value)} placeholder="Renault" style={inp} />
          </div>
          <div>
            <label style={lbl}>Modèle</label>
            <input value={form.modele} onChange={e => set('modele', e.target.value)} placeholder="Mégane RS Trophy-R" style={inp} />
          </div>
          <div>
            <label style={lbl}>Téléphone</label>
            <input value={form.tel} onChange={e => set('tel', e.target.value)} placeholder="+33 6 12 34 56 78" style={inp} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@exemple.fr" style={inp} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Informations complémentaires…" style={{ ...inp, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={async () => { if (!form.prenom.trim()) return; await onSubmit(form); }}>{client ? 'Enregistrer' : 'Créer'}</Btn>
        </div>
      </div>
    </div>
  );
}
