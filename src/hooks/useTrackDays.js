import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTrackDays() {
  const [trackDays, setTrackDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    const { data, error } = await supabase
      .from('track_days')
      .select('*, track_day_participants(*)')
      .order('date', { ascending: false });
    if (!error && data) setTrackDays(data);
    setLoading(false);
  };

  useEffect(() => {
    fetch();
    const channel = supabase.channel('track-days-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_days' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_day_participants' }, fetch)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const createTrackDay = async (data) => {
    await supabase.from('track_days').insert(data);
    await fetch();
  };

  const updateTrackDay = async (id, data) => {
    await supabase.from('track_days').update(data).eq('id', id);
    await fetch();
  };

  const deleteTrackDay = async (id) => {
    await supabase.from('track_days').delete().eq('id', id);
    await fetch();
  };

  const addParticipant = async (trackDayId, data) => {
    await supabase.from('track_day_participants').insert({ track_day_id: trackDayId, ...data });
    await fetch();
  };

  const updateParticipant = async (id, data) => {
    await supabase.from('track_day_participants').update(data).eq('id', id);
    await fetch();
  };

  const deleteParticipant = async (id) => {
    await supabase.from('track_day_participants').delete().eq('id', id);
    await fetch();
  };

  return { trackDays, loading, createTrackDay, updateTrackDay, deleteTrackDay, addParticipant, updateParticipant, deleteParticipant };
}
