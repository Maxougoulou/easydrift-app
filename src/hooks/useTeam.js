import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('team_members')
      .select('*')
      .order('id')
      .then(({ data }) => {
        if (data) setTeam(data);
        setLoading(false);
      });
  }, []);

  return { team, loading };
}
