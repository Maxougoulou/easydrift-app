import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useBudget() {
  const [budget, setBudget] = useState({ monthly: [], categories: [] });
  const [loading, setLoading] = useState(true);

  const fetchBudget = async () => {
    const [{ data: monthly }, { data: categories }] = await Promise.all([
      supabase.from('budget_monthly').select('*').order('id'),
      supabase.from('budget_categories').select('*').order('id'),
    ]);
    setBudget({ monthly: monthly ?? [], categories: categories ?? [] });
    setLoading(false);
  };

  useEffect(() => { fetchBudget(); }, []);

  const addBudgetEntry = async ({ mode, ...data }) => {
    if (mode === 'category') {
      await supabase.from('budget_categories').insert({ name: data.name, amount: Number(data.amount) || 0, color: data.color });
    } else {
      await supabase.from('budget_monthly').insert({ month: data.month, income: Number(data.income) || 0, expenses: Number(data.expenses) || 0 });
    }
    await fetchBudget();
  };

  const updateCategory = async (id, amount) => {
    await supabase.from('budget_categories').update({ amount }).eq('id', id);
    await fetchBudget();
  };

  return { budget, loading, addBudgetEntry, updateCategory, refetch: fetchBudget };
}
