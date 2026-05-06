import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

export function useTrackDays() {
  const [trackDays, setTrackDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('track_days')
      .select('*, track_day_participants(*)')
      .order('date', { ascending: false });
    if (!error && data) setTrackDays(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchData();
    });

    const channel = supabase.channel('track-days-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_days' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'track_day_participants' }, fetchData)
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const createTrackDay = async (data) => {
    const { error } = await supabase.from('track_days').insert(data);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Track day créé');
  };

  const updateTrackDay = async (id, data) => {
    const { error } = await supabase.from('track_days').update(data).eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Track day mis à jour');
  };

  const deleteTrackDay = async (id) => {
    const { error } = await supabase.from('track_days').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Track day supprimé');
  };

  const addParticipant = async (trackDayId, data) => {
    const { error } = await supabase.from('track_day_participants').insert({ track_day_id: trackDayId, ...data });
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Participant ajouté');
  };

  const updateParticipant = async (id, data) => {
    const { error } = await supabase.from('track_day_participants').update(data).eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }

    if (data.paid === true || data.paid === false) {
      const { data: part } = await supabase
        .from('track_day_participants')
        .select('track_day_id')
        .eq('id', id)
        .single();

      if (part) {
        const [{ data: allParts }, { data: td }] = await Promise.all([
          supabase.from('track_day_participants').select('id, paid').eq('track_day_id', part.track_day_id),
          supabase.from('track_days').select('id, status').eq('id', part.track_day_id).single(),
        ]);

        if (td && td.status !== 'Annulé') {
          // Simulate the new paid state for this participant
          const projected = allParts?.map(p => p.id === id ? { ...p, paid: data.paid } : p);
          const allPaid = projected?.length > 0 && projected.every(p => p.paid);

          if (allPaid && td.status !== 'Clôturé') {
            await supabase.from('track_days').update({ status: 'Clôturé' }).eq('id', td.id);
          } else if (!allPaid && td.status === 'Clôturé') {
            // Revert to À venir (displayStatus will show Terminé if date has passed)
            await supabase.from('track_days').update({ status: 'À venir' }).eq('id', td.id);
          }
        }
      }
    }

    await fetchData();
  };

  const deleteParticipant = async (id) => {
    const { error } = await supabase.from('track_day_participants').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Participant supprimé');
  };

  const uploadParticipantInvoice = async (participantId, file) => {
    const ext = file.name.split('.').pop();
    const path = `${participantId}/invoice.${ext}`;
    const { error } = await supabase.storage.from('track-day-invoices').upload(path, file, { upsert: true });
    if (error) { toast.error('Erreur upload', error.message); throw error; }
    const { data: { publicUrl } } = supabase.storage.from('track-day-invoices').getPublicUrl(path);
    const { error: updateError } = await supabase.from('track_day_participants').update({ invoice_url: publicUrl }).eq('id', participantId);
    if (updateError) { toast.error('Erreur', updateError.message); throw updateError; }
    await fetchData();
    toast.success('Facture déposée');
  };

  return { trackDays, loading, createTrackDay, updateTrackDay, deleteTrackDay, addParticipant, updateParticipant, deleteParticipant, uploadParticipantInvoice };
}
