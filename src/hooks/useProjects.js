import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        tasks(*),
        comments(*, team_members(id, name, avatar, color)),
        project_assignees(team_member_id)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const normalized = data.map(p => ({
        ...p,
        assignees: p.project_assignees?.map(a => a.team_member_id) ?? [],
        budget: { allocated: p.budget_allocated ?? 0, spent: p.budget_spent ?? 0 },
        tags: p.tags ?? [],
      }));
      setProjects(normalized);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();

    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchProjects)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const updateTaskStatus = async (taskId, done) => {
    const newStatus = done ? 'Terminé' : 'À faire';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  };

  const addComment = async (projectId, authorId, text) => {
    const now = new Date();
    await supabase.from('comments').insert({
      project_id: projectId,
      author_id: authorId,
      text,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
    await fetchProjects();
  };

  return { projects, loading, updateTaskStatus, addComment, refetch: fetchProjects };
}
