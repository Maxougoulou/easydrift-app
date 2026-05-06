import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTeam = () => {
    supabase
      .from('team_members')
      .select('*')
      .order('id')
      .then(({ data }) => {
        if (data) setTeam(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTeam();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchTeam();
    });

    return () => subscription.unsubscribe();
  }, []);

  return { team, loading };
}
