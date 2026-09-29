// Busca full-text em DMs entre dois usuários
import { supabase } from "@/integrations/supabase/client";

export interface DMSearchResult {
  id: string;
  text: string | null;
  sender_id: string;
  receiver_id: string;
  created_at: string;
}

export async function searchDirectMessages(
  query: string,
  userId: string,
  friendId: string,
  limit = 50
): Promise<DMSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  let q = supabase
    .from("direct_messages")
    .select("id, text, sender_id, receiver_id, created_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .textSearch("search_vector", trimmed, {
      type: "plain",
      config: "portuguese",
    })
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data, error } = await q;
  if (!error && data && data.length > 0) {
    return (data as DMSearchResult[]) || [];
  }

  const { data: data2 } = await supabase
    .from("direct_messages")
    .select("id, text, sender_id, receiver_id, created_at")
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`
    )
    .ilike("text", `%${trimmed}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data2 as DMSearchResult[]) || [];
}
