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
        comments(*, team_members!comments_author_id_fkey(id, name, avatar, color)),
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

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') fetchProjects();
    });

    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchProjects)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchProjects)
      .subscribe();

    return () => {
      authSub.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const createProject = async (data) => {
    const { assignees, ...projectData } = data;
    const { data: project } = await supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();
    if (project && assignees?.length) {
      await supabase.from('project_assignees').insert(
        assignees.map(id => ({ project_id: project.id, team_member_id: id }))
      );
    }
    await fetchProjects();
  };

  const updateProject = async (id, data) => {
    const { assignees, ...projectData } = data;
    await supabase.from('projects').update(projectData).eq('id', id);
    if (assignees !== undefined) {
      await supabase.from('project_assignees').delete().eq('project_id', id);
      if (assignees.length) {
        await supabase.from('project_assignees').insert(
          assignees.map(uid => ({ project_id: id, team_member_id: uid }))
        );
      }
    }
    await fetchProjects();
  };

  const deleteProject = async (id) => {
    await supabase.from('projects').delete().eq('id', id);
    await fetchProjects();
  };

  const updateTaskStatus = async (taskId, done) => {
    const newStatus = done ? 'Terminé' : 'À faire';
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
    // Recalculer le progrès du projet
    const project = projects.find(p => p.tasks?.some(t => t.id === taskId));
    if (project) {
      const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      const progress = Math.round(updatedTasks.filter(t => t.status === 'Terminé').length / updatedTasks.length * 100);
      await supabase.from('projects').update({ progress }).eq('id', project.id);
    }
    await fetchProjects();
  };

  const addTask = async (projectId, taskData) => {
    await supabase.from('tasks').insert({ project_id: projectId, ...taskData });
    await fetchProjects();
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

  const deleteTask = async (taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId);
    const project = projects.find(p => p.tasks?.some(t => t.id === taskId));
    if (project) {
      const remaining = project.tasks.filter(t => t.id !== taskId);
      const done = remaining.filter(t => t.status === 'Terminé').length;
      const progress = remaining.length > 0 ? Math.round(done / remaining.length * 100) : 0;
      await supabase.from('projects').update({ progress }).eq('id', project.id);
    }
    await fetchProjects();
  };

  return { projects, loading, createProject, updateProject, deleteProject, updateTaskStatus, addTask, deleteTask, addComment, refetch: fetchProjects };
}

export function useProjectAttachments(projectId) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const fetchAttachments = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('project_attachments')
      .select('*, team_members(name, avatar, color)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setAttachments(data ?? []);
  };

  useEffect(() => { fetchAttachments(); }, [projectId]);

  const upload = async (file, uploadedBy) => {
    setUploading(true);
    try {
      const path = `${projectId}/${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage.from('project-attachments').upload(path, file);
      if (storageError) {
        console.error('[upload] storage error:', storageError);
        alert('Erreur upload fichier : ' + storageError.message);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from('project-attachments').getPublicUrl(path);
      const { error: dbError } = await supabase.from('project_attachments').insert({
        project_id: projectId,
        name: file.name,
        url: publicUrl,
        size: file.size,
        mime_type: file.type,
        storage_path: path,
        uploaded_by: uploadedBy,
      });
      if (dbError) {
        console.error('[upload] db error:', dbError);
        alert('Erreur base de données : ' + dbError.message);
        return;
      }
      await fetchAttachments();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (att) => {
    if (att.storage_path) {
      await supabase.storage.from('project-attachments').remove([att.storage_path]);
    }
    await supabase.from('project_attachments').delete().eq('id', att.id);
    await fetchAttachments();
  };

  return { attachments, uploading, upload, remove };
}
