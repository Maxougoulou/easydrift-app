import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date');
    if (data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const createEvent = async (data) => {
    await supabase.from('events').insert(data);
    await fetchEvents();
  };

  const deleteEvent = async (id) => {
    await supabase.from('events').delete().eq('id', id);
    await fetchEvents();
  };

  return { events, loading, createEvent, deleteEvent, refetch: fetchEvents };
}
