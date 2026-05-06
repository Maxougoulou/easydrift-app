import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`*, maintenance(*)`)
      .order('id');

    if (!error && data) {
      const normalized = data.map(v => ({
        ...v,
        nextCT: v.next_ct,
        lastCT: { date: v.last_ct_date, result: v.last_ct_result, center: v.last_ct_center },
        nextRevision: { mileage: v.next_revision_mileage, date: v.next_revision_date },
        maintenance: (v.maintenance ?? []).sort((a, b) => new Date(b.date) - new Date(a.date)),
      }));
      setVehicles(normalized);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchData();
    });

    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, fetchData)
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const createVehicle = async (data) => {
    const { error } = await supabase.from('vehicles').insert(data);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Véhicule ajouté');
  };

  const updateVehicle = async (id, data) => {
    const { error } = await supabase.from('vehicles').update(data).eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Véhicule mis à jour');
  };

  const deleteVehicle = async (id) => {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Véhicule supprimé');
  };

  const addMaintenance = async (vehicleId, entry) => {
    const { error } = await supabase.from('maintenance').insert({ vehicle_id: vehicleId, ...entry });
    if (error) { toast.error('Erreur', error.message); throw error; }
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle && entry.km > vehicle.mileage) {
      await supabase.from('vehicles').update({ mileage: entry.km }).eq('id', vehicleId);
    }
    await fetchData();
    toast.success('Entretien ajouté');
  };

  const deleteMaintenance = async (id) => {
    const { error } = await supabase.from('maintenance').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Entretien supprimé');
  };

  return { vehicles, loading, createVehicle, updateVehicle, deleteVehicle, addMaintenance, deleteMaintenance, refetch: fetchData };
}

export function useVehicleDocs(vehicleId) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDocs = async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('vehicle_documents')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });
      setDocs(data ?? []);
    } catch (_) {
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [vehicleId]);

  const addDoc = async (entry) => {
    try {
      await supabase.from('vehicle_documents').insert({ vehicle_id: vehicleId, ...entry });
      await fetchDocs();
      toast.success('Document ajouté');
    } catch (err) {
      toast.error('Erreur', err?.message);
    }
  };

  const deleteDoc = async (id) => {
    try {
      await supabase.from('vehicle_documents').delete().eq('id', id);
      await fetchDocs();
      toast.success('Document supprimé');
    } catch (err) {
      toast.error('Erreur', err?.message);
    }
  };

  return { docs, loading, addDoc, deleteDoc };
}
