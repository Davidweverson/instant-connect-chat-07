// Busca full-text em mensagens de chat
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  text: string;
  sender: string;
  user_id: string | null;
  room_id: string;
  created_at: string;
}

export async function searchMessages(
  query: string,
  roomId?: string,
  limit = 50
): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  let q = supabase
    .from("chat_messages")
    .select("id, text, sender, user_id, room_id, created_at")
    .textSearch("search_vector", trimmed, {
      type: "plain",
      config: "portuguese",
    })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (roomId) q = q.eq("room_id", roomId);
  const { data, error } = await q;
  if (!error && data && data.length > 0) {
    return (data as SearchResult[]) || [];
  }

  let q2 = supabase
    .from("chat_messages")
    .select("id, text, sender, user_id, room_id, created_at")
    .ilike("text", `%${trimmed}%`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (roomId) q2 = q2.eq("room_id", roomId);
  const { data: data2 } = await q2;
  return (data2 as SearchResult[]) || [];
}
