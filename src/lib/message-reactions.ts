// Hook + UI para reações em mensagens do chat
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Reaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  users: string[]; // user_ids
}

export function useMessageReactions(messageIds: string[], currentUserId: string) {
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});

  const fetchReactions = useCallback(async () => {
    if (messageIds.length === 0) {
      setReactions({});
      return;
    }
    const { data } = await supabase
      .from("message_reactions" as any)
      .select("message_id, emoji, user_id")
      .in("message_id", messageIds);

    const grouped: Record<string, Record<string, { users: string[] }>> = {};
    (data as any[] | null)?.forEach((r) => {
      if (!grouped[r.message_id]) grouped[r.message_id] = {};
      if (!grouped[r.message_id][r.emoji]) grouped[r.message_id][r.emoji] = { users: [] };
      grouped[r.message_id][r.emoji].users.push(r.user_id);
    });

    const out: Record<string, Reaction[]> = {};
    for (const [mid, emojis] of Object.entries(grouped)) {
      out[mid] = Object.entries(emojis).map(([emoji, { users }]) => ({
        emoji,
        count: users.length,
        reactedByMe: users.includes(currentUserId),
        users,
      }));
    }
    setReactions(out);
  }, [messageIds.join(","), currentUserId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Realtime listener
  useEffect(() => {
    if (messageIds.length === 0) return;
    const channel = supabase
      .channel("reactions-listener")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        () => fetchReactions()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds.join(","), fetchReactions]);

  const toggle = useCallback(
    async (messageId: string, emoji: string) => {
      const existing = reactions[messageId]?.find((r) => r.emoji === emoji);
      if (existing?.reactedByMe) {
        await supabase
          .from("message_reactions" as any)
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", currentUserId)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("message_reactions" as any)
          .insert({ message_id: messageId, user_id: currentUserId, emoji } as any);
      }
    },
    [reactions, currentUserId]
  );

  return { reactions, toggle };
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];
