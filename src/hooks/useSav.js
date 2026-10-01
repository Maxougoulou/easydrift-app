import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

// Déclarations d'anneaux défectueux (SAV).
// Un enregistrement est créé AVANT d'être rempli : on génère le lien,
// on l'envoie au client, il revient rempli quelques jours plus tard.

export function useSav() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { data, error } = await supabase
      .from('sav_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setReports(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createReport = async ({ libelle, client_email, locale }) => {
    const { data, error } = await supabase
      .from('sav_reports')
      .insert({
        libelle: libelle?.trim() || null,
        client_email: client_email?.trim() || null,
        locale: locale || 'fr',
      })
      .select()
      .single();
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    return data;
  };

  const updateReport = async (id, patch) => {
    const { error } = await supabase.from('sav_reports').update(patch).eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
  };

  const deleteReport = async (id) => {
    const { error } = await supabase.from('sav_reports').delete().eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Déclaration supprimée');
  };

  return { reports, loading, createReport, updateReport, deleteReport, refetch: fetchData };
}
