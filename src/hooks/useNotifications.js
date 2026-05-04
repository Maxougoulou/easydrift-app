import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('notifications')
      .select('*, from_member:team_members!notifications_from_member_id_fkey(id, name, avatar, color)')
      .eq('to_member_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setNotifications(data);
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const addNotification = async (notif) => {
    const now = new Date();
    await supabase.from('notifications').insert({
      type: notif.type,
      from_member_id: notif.from,
      to_member_id: notif.to,
      text: notif.text,
      detail: notif.detail ?? null,
      project_id: notif.projectId ?? null,
      read: false,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const showToast = (toast) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, toasts, unreadCount, markAllRead, markRead, addNotification, showToast };
}
