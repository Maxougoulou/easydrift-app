// Statut véhicule TOUJOURS calculé, jamais saisi à la main.
//   1. "Au garage"    → une fiche d'intervention est ouverte (envoyée)
//   2. "À réviser"    → CT < 30 jours ou dépassé, OU révision dépassée (date ou km)
//   3. "Opérationnel" → sinon

export function computeVehicleStatus(vehicle) {
  const fichesOuvertes = (vehicle.fiches ?? []).filter(f => f.statut === 'envoyée');
  if (fichesOuvertes.length > 0) return 'Au garage';

  const today = new Date();

  // CT proche ou dépassé
  if (vehicle.next_ct) {
    const ctDays = Math.ceil((new Date(vehicle.next_ct) - today) / 86400000);
    if (ctDays < 30) return 'À réviser';
  }

  // Révision dépassée par date
  if (vehicle.next_revision_date) {
    const revDays = Math.ceil((new Date(vehicle.next_revision_date) - today) / 86400000);
    if (revDays < 0) return 'À réviser';
  }

  // Révision dépassée par kilométrage
  if (vehicle.next_revision_mileage && vehicle.mileage >= vehicle.next_revision_mileage) {
    return 'À réviser';
  }

  return 'Opérationnel';
}

// Jours restants (négatif = dépassé)
export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

// Libellé "dans X jours" / "en retard de X jours"
export function formatDeadline(days) {
  if (days === null) return null;
  if (days < 0) return { text: `en retard de ${Math.abs(days)} jour${Math.abs(days) > 1 ? 's' : ''}`, overdue: true };
  if (days === 0) return { text: `aujourd'hui`, overdue: true };
  return { text: `dans ${days} jour${days > 1 ? 's' : ''}`, overdue: false };
}

// Prochaine révision : le plus proche entre le seuil km et la date.
// Retourne { label, sub, overdue } ou null si rien n'est planifié.
export function nextRevisionInfo(vehicle) {
  const kmTarget = vehicle.next_revision_mileage;
  const dateTarget = vehicle.next_revision_date;
  const hasKm = kmTarget && kmTarget > 0;
  const hasDate = !!dateTarget;

  if (!hasKm && !hasDate) return null;

  const kmRemaining = hasKm ? kmTarget - vehicle.mileage : null;
  const days = hasDate ? daysUntil(dateTarget) : null;

  const kmOverdue = hasKm && kmRemaining <= 0;
  const dateOverdue = hasDate && days < 0;

  if (kmOverdue || dateOverdue) {
    const parts = [];
    if (kmOverdue) parts.push(`dépassée de ${Math.abs(kmRemaining).toLocaleString('fr-FR')} km`);
    if (dateOverdue) parts.push(`en retard de ${Math.abs(days)} j`);
    return { label: 'Révision dépassée', sub: parts.join(' · '), overdue: true };
  }

  const parts = [];
  if (hasKm) parts.push(`dans ${kmRemaining.toLocaleString('fr-FR')} km`);
  if (hasDate) parts.push(`le ${new Date(dateTarget).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`);
  return {
    label: hasKm ? `à ${kmTarget.toLocaleString('fr-FR')} km` : `le ${new Date(dateTarget).toLocaleDateString('fr-FR')}`,
    sub: parts.join(' · '),
    overdue: false,
  };
}
