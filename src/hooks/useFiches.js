import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

// CRUD admin des fiches d'intervention.
// Les véhicules (avec fiches imbriquées) viennent de useVehicles ;
// ce hook ne gère que les mutations.
export function useFiches() {
  const [saving, setSaving] = useState(false);

  // Créer une fiche + ses tâches, statut 'envoyée' directement
  const createFiche = async ({ vehicleId, titre, km, notes, taches }) => {
    setSaving(true);
    try {
      const { data: fiche, error } = await supabase
        .from('fiches')
        .insert({
          vehicle_id: vehicleId,
          titre,
          statut: 'envoyée',
          km_au_moment: km || null,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (taches.length > 0) {
        const { error: tErr } = await supabase.from('fiche_taches').insert(
          taches.map((t, i) => ({
            fiche_id: fiche.id,
            description: t,
            origine: 'demande',
            position: i,
          }))
        );
        if (tErr) throw tErr;
      }

      toast.success('Fiche créée et envoyée');
      return fiche;
    } catch (err) {
      toast.error('Erreur', err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Clôture admin : coût + facture → terminée, véhicule mis à jour
  const cloturerFiche = async (fiche, { cout, factureFile, updateRevision }) => {
    setSaving(true);
    try {
      let factureUrl = null;
      if (factureFile) {
        const safeName = factureFile.name
          .normalize('NFD').replace(/[̀-ͯ]/g, '')
          .replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `factures/${fiche.id}-${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage.from('vehicle-files').upload(path, factureFile);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
        factureUrl = pub.publicUrl;
      }

      const { error } = await supabase
        .from('fiches')
        .update({
          statut: 'terminée',
          date_cloture: new Date().toISOString(),
          cout_total: parseFloat(cout) || 0,
          ...(factureUrl ? { facture_url: factureUrl } : {}),
        })
        .eq('id', fiche.id);
      if (error) throw error;

      // Mise à jour véhicule : dernière révision = aujourd'hui, km si fourni
      if (updateRevision) {
        const vUpdate = { date_derniere_revision: new Date().toISOString().split('T')[0] };
        if (fiche.km_au_moment) vUpdate.mileage = fiche.km_au_moment;
        await supabase.from('vehicles').update(vUpdate).eq('id', fiche.vehicle_id);
      }

      toast.success('Fiche clôturée');
      return true;
    } catch (err) {
      toast.error('Erreur', err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteFiche = async (id) => {
    const { error } = await supabase.from('fiches').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); return false; }
    toast.success('Fiche supprimée');
    return true;
  };

  return { saving, createFiche, cloturerFiche, deleteFiche };
}
