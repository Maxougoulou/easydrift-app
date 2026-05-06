import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';

export function useBudget() {
  const [budget, setBudget] = useState({ monthly: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const [{ data: monthly }, { data: categories }] = await Promise.all([
      supabase.from('budget_monthly').select('*').order('id'),
      supabase.from('budget_categories').select('*').order('id'),
    ]);
    setBudget({ monthly: monthly ?? [], categories: categories ?? [] });
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchData();
    });

    const channel = supabase
      .channel('budget-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_monthly' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'budget_categories' }, fetchData)
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const addBudgetEntry = async ({ mode, ...data }) => {
    let error;
    if (mode === 'category') {
      ({ error } = await supabase.from('budget_categories').insert({ name: data.name, amount: Number(data.amount) || 0, color: data.color }));
    } else {
      ({ error } = await supabase.from('budget_monthly').insert({ month: data.month, income: Number(data.income) || 0, expenses: Number(data.expenses) || 0 }));
    }
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Budget mis à jour');
  };

  const updateCategory = async (id, amount) => {
    const { error } = await supabase.from('budget_categories').update({ amount }).eq('id', id);
    if (error) { toast.error('Erreur', error.message); throw error; }
    await fetchData();
    toast.success('Catégorie mise à jour');
  };

  return { budget, loading, addBudgetEntry, updateCategory, refetch: fetchData };
}
