import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVehicles = async () => {
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
    fetchVehicles();
    const channel = supabase
      .channel('vehicles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchVehicles)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance' }, fetchVehicles)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const createVehicle = async (data) => {
    await supabase.from('vehicles').insert(data);
    await fetchVehicles();
  };

  const updateVehicle = async (id, data) => {
    await supabase.from('vehicles').update(data).eq('id', id);
    await fetchVehicles();
  };

  const deleteVehicle = async (id) => {
    await supabase.from('vehicles').delete().eq('id', id);
    await fetchVehicles();
  };

  const addMaintenance = async (vehicleId, entry) => {
    await supabase.from('maintenance').insert({ vehicle_id: vehicleId, ...entry });
    // Mettre à jour le kilométrage du véhicule si plus élevé
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle && entry.km > vehicle.mileage) {
      await supabase.from('vehicles').update({ mileage: entry.km }).eq('id', vehicleId);
    }
    await fetchVehicles();
  };

  const deleteMaintenance = async (id) => {
    await supabase.from('maintenance').delete().eq('id', id);
    await fetchVehicles();
  };

  return { vehicles, loading, createVehicle, updateVehicle, deleteVehicle, addMaintenance, deleteMaintenance, refetch: fetchVehicles };
}
