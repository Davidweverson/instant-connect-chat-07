import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupMessage {
  id: string;
  group_id: string;
  channel_id: string;
  user_id: string;
  sender_name: string;
  sender_avatar: string | null;
  text: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  reply_to?: { id: string; sender: string; text: string } | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
}

const profileCache = new Map<string, { username: string; avatar_url: string | null }>();

async function fetchProfile(uid: string) {
  if (profileCache.has(uid)) return profileCache.get(uid)!;
  const { data } = await supabase.from("profiles").select("username, avatar_url").eq("id", uid).maybeSingle();
  const p = { username: data?.username || "?", avatar_url: data?.avatar_url || null };
  profileCache.set(uid, p);
  return p;
}

export function useGroupMessages(groupId: string | null, channelId: string | null, userId: string | undefined) {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesRef = useRef<GroupMessage[]>([]);
  messagesRef.current = messages;

  const hydrateReply = useCallback(async (list: GroupMessage[]): Promise<GroupMessage[]> => {
    const replyIds = Array.from(new Set(list.map((m) => m.reply_to_id).filter(Boolean))) as string[];
    if (!replyIds.length) return list;
    const { data: parents } = await supabase
      .from("group_messages")
      .select("id, user_id, text")
      .in("id", replyIds);
    const parentMap: Record<string, { id: string; user_id: string; text: string | null }> = {};
    (parents || []).forEach((p: any) => { parentMap[p.id] = p; });
    const parentUserIds = Array.from(new Set((parents || []).map((p: any) => p.user_id)));
    const missing = parentUserIds.filter((id) => !profileCache.has(id));
    if (missing.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", missing);
      (profs || []).forEach((p: any) => profileCache.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    }
    return list.map((m) => {
      if (!m.reply_to_id) return m;
      const parent = parentMap[m.reply_to_id];
      if (!parent) return m;
      const senderName = profileCache.get(parent.user_id)?.username || "?";
      return { ...m, reply_to: { id: parent.id, sender: senderName, text: parent.text || "" } };
    });
  }, []);

  const load = useCallback(async () => {
    if (!channelId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("group_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) { setLoading(false); return; }
    const ids = Array.from(new Set((data || []).map((m: any) => m.user_id)));
    const missing = ids.filter((id) => !profileCache.has(id));
    if (missing.length) {
      const { data: profs } = await supabase.from("profiles").select("id, username, avatar_url").in("id", missing);
      (profs || []).forEach((p: any) => profileCache.set(p.id, { username: p.username, avatar_url: p.avatar_url }));
    }
    const list: GroupMessage[] = (data || []).reverse().map((m: any) => {
      const prof = profileCache.get(m.user_id);
      return {
        ...m,
        sender_name: prof?.username || "?",
        sender_avatar: prof?.avatar_url || null,
      };
    });
    const hydrated = await hydrateReply(list);
    setMessages(hydrated);
    setLoading(false);
  }, [channelId, hydrateReply]);

  useEffect(() => {
    setMessages([]);
    load();
  }, [load]);

  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`group-channel-msgs-${channelId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `channel_id=eq.${channelId}` }, async (payload) => {
        const m: any = payload.new;
        if (messagesRef.current.some((x) => x.id === m.id)) return;
        const prof = await fetchProfile(m.user_id);
        let base: GroupMessage = { ...m, sender_name: prof.username, sender_avatar: prof.avatar_url };
        if (m.reply_to_id) {
          const [enriched] = await hydrateReply([base]);
          base = enriched;
        }
        setMessages((prev) => (prev.some((x) => x.id === base.id) ? prev : [...prev, base]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "group_messages", filter: `channel_id=eq.${channelId}` }, (payload) => {
        const m: any = payload.new;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, text: m.text, is_edited: m.is_edited, edited_at: m.edited_at } : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "group_messages", filter: `channel_id=eq.${channelId}` }, (payload) => {
        setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") load();
      });
    return () => { supabase.removeChannel(ch); };
  }, [channelId, hydrateReply, load]);

  const send = useCallback(async (text: string, imageUrl: string | null = null, replyToId: string | null = null) => {
    if (!groupId || !channelId || !userId) return;
    const trimmed = text.trim();
    if (!trimmed && !imageUrl) return;
    const { error } = await supabase
      .from("group_messages")
      .insert({ group_id: groupId, channel_id: channelId, user_id: userId, text: trimmed || null, image_url: imageUrl, reply_to_id: replyToId });
    if (error) toast.error(error.message.includes("BANNED_WORD") ? "Palavra proibida." : "Erro ao enviar.");
  }, [groupId, channelId, userId]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("group_messages").delete().eq("id", id);
    if (error) toast.error("Erro ao apagar.");
  }, []);

  const edit = useCallback(async (id: string, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const { error } = await supabase
      .from("group_messages")
      .update({ text: trimmed, is_edited: true, edited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message.includes("BANNED_WORD") ? "Palavra proibida." : "Erro ao editar.");
  }, []);

  return { messages, loading, send, remove, edit };
}
