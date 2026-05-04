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

  const addMaintenance = async (vehicleId, entry) => {
    await supabase.from('maintenance').insert({ vehicle_id: vehicleId, ...entry });
    await fetchVehicles();
  };

  return { vehicles, loading, addMaintenance, refetch: fetchVehicles };
}
