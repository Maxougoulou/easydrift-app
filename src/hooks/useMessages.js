import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMessages(projectId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from('comments')
      .select('*, author:team_members!comments_author_id_fkey(id, name, avatar, color)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`messages-${projectId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `project_id=eq.${projectId}` },
        async (payload) => {
          const { data } = await supabase
            .from('comments')
            .select('*, author:team_members!comments_author_id_fkey(id, name, avatar, color)')
            .eq('id', payload.new.id)
            .single();
          if (data) setMessages(prev => [...prev, data]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchMessages, projectId]);

  const sendMessage = async (authorId, text) => {
    const now = new Date();
    await supabase.from('comments').insert({
      project_id: projectId,
      author_id: authorId,
      text,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  return { messages, loading, sendMessage };
}
