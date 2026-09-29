// Hook para escutar menções recebidas pelo usuário atual
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playMessageSound } from "@/lib/notification-sounds";

export interface MentionEntry {
  id: string;
  message_id: string;
  message_kind: "chat" | "dm";
  room_id: string | null;
  conversation_user_id: string | null;
  preview: string | null;
  is_read: boolean;
  created_at: string;
  mentioned_by_user_id: string;
  mentioned_by_username?: string;
}

export function useMentions(userId: string, dndActive: boolean) {
  const [mentions, setMentions] = useState<MentionEntry[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("mentions" as any)
      .select("*")
      .eq("mentioned_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!data) return;
    const ids = Array.from(new Set((data as any[]).map((d) => d.mentioned_by_user_id)));
    let nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username").in("id", ids);
      profs?.forEach((p: any) => nameMap.set(p.id, p.username));
    }
    setMentions(
      (data as any[]).map((d) => ({ ...d, mentioned_by_username: nameMap.get(d.mentioned_by_user_id) || "Alguém" }))
    );
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`mentions-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mentions", filter: `mentioned_user_id=eq.${userId}` },
        async (payload) => {
          const m = payload.new as any;
          const { data: prof } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", m.mentioned_by_user_id)
            .maybeSingle();
          setMentions((prev) => [
            { ...m, mentioned_by_username: prof?.username || "Alguém" },
            ...prev,
          ]);
          if (!dndActive) playMessageSound();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, dndActive]);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from("mentions" as any)
      .update({ is_read: true })
      .eq("mentioned_user_id", userId)
      .eq("is_read", false);
    setMentions((prev) => prev.map((m) => ({ ...m, is_read: true })));
  }, [userId]);

  const markOneRead = useCallback(async (id: string) => {
    await supabase.from("mentions" as any).update({ is_read: true }).eq("id", id);
    setMentions((prev) => prev.map((m) => (m.id === id ? { ...m, is_read: true } : m)));
  }, []);

  const unreadCount = mentions.filter((m) => !m.is_read).length;

  return { mentions, unreadCount, markAllRead, markOneRead, refresh: load };
}
