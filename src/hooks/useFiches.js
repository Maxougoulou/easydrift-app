import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

// CRUD admin des fiches d'intervention.
// Les véhicules (avec fiches imbriquées) viennent de useVehicles ;
// ce hook ne gère que les mutations.
export function useFiches() {
  const [saving, setSaving] = useState(false);

  // Upload d'une photo dans le bucket, retourne l'URL publique
  const uploadPhoto = async (file, folder = 'taches') => {
    const safeName = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
    const { error } = await supabase.storage.from('vehicle-files').upload(path, file);
    if (error) throw error;
    const { data: pub } = supabase.storage.from('vehicle-files').getPublicUrl(path);
    return pub.publicUrl;
  };

  // Créer une fiche + ses tâches (avec photos optionnelles), statut 'envoyée'
  // taches : [{ description, photoFile? }] — pieces : [{ part_id, qty }]
  const createFiche = async ({ vehicleId, titre, km, notes, taches, pieces = [] }) => {
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
        // Upload des photos en parallèle
        const rows = await Promise.all(taches.map(async (t, i) => {
          let photoUrl = null;
          if (t.photoFile) {
            try { photoUrl = await uploadPhoto(t.photoFile); }
            catch (e) { console.error('[fiche] upload photo:', e); }
          }
          return {
            fiche_id: fiche.id,
            description: t.description,
            origine: 'demande',
            position: i,
            photo_url: photoUrl,
            consigne: t.consigne ?? null,
          };
        }));
        const { error: tErr } = await supabase.from('fiche_taches').insert(rows);
        if (tErr) throw tErr;
      }

      // Pièces fournies avec le véhicule pour cette fiche
      const fournies = pieces.filter(p => p.qty > 0);
      if (fournies.length > 0) {
        const { error: pErr } = await supabase.from('fiche_pieces').insert(
          fournies.map(p => ({ fiche_id: fiche.id, part_id: p.part_id, qty_fournie: p.qty, qty_utilisee: 0 }))
        );
        if (pErr) throw pErr;
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

  // ── Édition d'une fiche ouverte ──────────────────────────────────────────

  const updateFiche = async (id, data) => {
    const { error } = await supabase.from('fiches').update(data).eq('id', id);
    if (error) { toast.error('Erreur', error.message); return false; }
    return true;
  };

  const addTacheToFiche = async (ficheId, { description, consigne, photoFile }) => {
    let photoUrl = null;
    if (photoFile) {
      try { photoUrl = await uploadPhoto(photoFile); }
      catch (e) { console.error('[fiche] upload photo:', e); }
    }
    const { error } = await supabase.from('fiche_taches').insert({
      fiche_id: ficheId,
      description: description.trim(),
      consigne: consigne?.trim() || null,
      photo_url: photoUrl,
      origine: 'demande',
      position: 999,
    });
    if (error) { toast.error('Erreur', error.message); return false; }
    toast.success('Tâche ajoutée');
    return true;
  };

  const updateTache = async (id, data) => {
    const { error } = await supabase.from('fiche_taches').update(data).eq('id', id);
    if (error) { toast.error('Erreur', error.message); return false; }
    return true;
  };

  const deleteTache = async (id) => {
    const { error } = await supabase.from('fiche_taches').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); return false; }
    return true;
  };

  const setTachePhoto = async (tacheId, file) => {
    try {
      const url = await uploadPhoto(file);
      return updateTache(tacheId, { photo_url: url });
    } catch (e) {
      toast.error('Erreur upload photo', e.message);
      return false;
    }
  };

  // Quantité fournie d'une pièce sur la fiche (0 = retirée, borne min = déjà utilisée)
  const setFichePiece = async (ficheId, partId, qty, usedQty = 0) => {
    const target = Math.max(qty, usedQty);
    if (target <= 0) {
      const { error } = await supabase.from('fiche_pieces').delete()
        .eq('fiche_id', ficheId).eq('part_id', partId);
      if (error) { toast.error('Erreur', error.message); return false; }
      return true;
    }
    const { error } = await supabase.from('fiche_pieces').upsert(
      { fiche_id: ficheId, part_id: partId, qty_fournie: target },
      { onConflict: 'fiche_id,part_id' }
    );
    if (error) { toast.error('Erreur', error.message); return false; }
    return true;
  };

  return { saving, createFiche, cloturerFiche, deleteFiche, updateFiche, addTacheToFiche, updateTache, deleteTache, setTachePhoto, setFichePiece };
}
