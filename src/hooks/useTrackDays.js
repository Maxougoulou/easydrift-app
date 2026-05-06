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

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetch();
    });

    const channel = supabase.channel('track-days-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_days' }, fetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_day_participants' }, fetch)
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
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

    if (data.paid === true) {
      const td = trackDays.find(d => d.track_day_participants?.some(p => p.id === id));
      if (td && td.status !== 'Clôturé' && td.status !== 'Annulé') {
        const updated = td.track_day_participants.map(p => p.id === id ? { ...p, paid: true } : p);
        if (updated.length > 0 && updated.every(p => p.paid)) {
          await supabase.from('track_days').update({ status: 'Clôturé' }).eq('id', td.id);
        }
      }
    }

    await fetch();
  };

  const deleteParticipant = async (id) => {
    await supabase.from('track_day_participants').delete().eq('id', id);
    await fetch();
  };

  return { trackDays, loading, createTrackDay, updateTrackDay, deleteTrackDay, addParticipant, updateParticipant, deleteParticipant };
}
