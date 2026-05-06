import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });
    if (!error && data) setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createClient = async (data) => {
    const { data: created, error } = await supabase.from('clients').insert(data).select().single();
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    return created;
  };

  const updateClient = async (id, data) => {
    const { error } = await supabase.from('clients').update(data).eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Client mis à jour');
  };

  const deleteClient = async (id) => {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Client supprimé');
  };

  return { clients, loading, createClient, updateClient, deleteClient };
}
