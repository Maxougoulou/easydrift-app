import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data } = await supabase.from('events').select('*').order('date');
    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchData();
    });

    const channel = supabase
      .channel('events-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, fetchData)
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const createEvent = async (data) => {
    const { error } = await supabase.from('events').insert(data);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Événement créé');
  };

  const deleteEvent = async (id) => {
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Événement supprimé');
  };

  return { events, loading, createEvent, deleteEvent, refetch: fetchData };
}
