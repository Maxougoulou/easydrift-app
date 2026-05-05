import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });
    if (!error && data) setClients(data);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const createClient = async (data) => {
    const { data: created } = await supabase.from('clients').insert(data).select().single();
    await fetch();
    return created;
  };

  const updateClient = async (id, data) => {
    await supabase.from('clients').update(data).eq('id', id);
    await fetch();
  };

  const deleteClient = async (id) => {
    await supabase.from('clients').delete().eq('id', id);
    await fetch();
  };

  return { clients, loading, createClient, updateClient, deleteClient };
}
