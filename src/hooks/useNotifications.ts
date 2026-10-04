import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  type: string;
  image_url: string | null;
  is_important: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase
        .from("notifications")
        .select("id, title, content, type, image_url, is_important, is_published, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(50),
      supabase
        .from("notification_reads")
        .select("notification_id")
        .eq("user_id", userId),
    ]);
    setNotifications((notifs as AppNotification[]) || []);
    setReadIds(new Set((reads || []).map((r: any) => r.notification_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const markRead = useCallback(async (notificationId: string) => {
    if (!userId || readIds.has(notificationId)) return;
    setReadIds((prev) => new Set(prev).add(notificationId));
    await supabase
      .from("notification_reads")
      .upsert({ notification_id: notificationId, user_id: userId } as any, { onConflict: "notification_id,user_id" });
  }, [userId, readIds]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    const unread = notifications.filter((n) => !readIds.has(n.id));
    if (unread.length === 0) return;
    setReadIds(new Set(notifications.map((n) => n.id)));
    await supabase
      .from("notification_reads")
      .upsert(unread.map((n) => ({ notification_id: n.id, user_id: userId })) as any, { onConflict: "notification_id,user_id" });
  }, [userId, notifications, readIds]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readIds.has(n.id)).length,
    [notifications, readIds]
  );

  const latestUnreadImportant = useMemo(
    () => notifications.find((n) => n.is_important && !readIds.has(n.id)) || null,
    [notifications, readIds]
  );

  return { notifications, readIds, unreadCount, latestUnreadImportant, loading, markRead, markAllRead, reload: load };
}
