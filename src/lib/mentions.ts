// Helpers para mencões @user no FlashChat
import { supabase } from "@/integrations/supabase/client";

// Aceita @ seguido de letras/números/_/- (2-30 chars)
export const MENTION_REGEX = /(^|[\s>(\[{,;.!?])@([a-zA-Z0-9_\-]{2,30})/g;

export interface MentionTarget {
  username: string;
  user_id: string;
}

/** Extrai usernames mencionados de um texto (case-preserved) */
export function extractMentionUsernames(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  const re = new RegExp(MENTION_REGEX.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.add(m[2]);
  }
  return Array.from(out);
}

/** Resolve usernames -> profiles (case-insensitive) */
export async function resolveMentions(usernames: string[]): Promise<MentionTarget[]> {
  if (usernames.length === 0) return [];
  // Use OR de ilike para casar case-insensitively com cada username
  const orExpr = usernames.map((u) => `username.ilike.${u.replace(/[,()]/g, "")}`).join(",");
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .or(orExpr);
  if (error || !data) return [];
  // Dedupe por id
  const seen = new Set<string>();
  const out: MentionTarget[] = [];
  for (const p of data as any[]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({ user_id: p.id, username: p.username });
  }
  return out;
}

interface RecordMentionsArgs {
  text: string;
  fromUserId: string;
  fromUsername: string;
  messageId: string;
  messageKind: "chat" | "dm";
  roomId?: string | null;
  conversationUserId?: string | null;
  preview?: string;
}

/** Cria registros de menção no banco e dispara push */
export async function recordMentions(args: RecordMentionsArgs): Promise<MentionTarget[]> {
  const usernames = extractMentionUsernames(args.text);
  if (usernames.length === 0) return [];
  const resolved = await resolveMentions(usernames);
  const others = resolved.filter((r) => r.user_id !== args.fromUserId);
  if (others.length === 0) return [];

  const { error: insErr } = await supabase.from("mentions" as any).insert(
    others.map((m) => ({
      mentioned_user_id: m.user_id,
      mentioned_by_user_id: args.fromUserId,
      message_id: args.messageId,
      message_kind: args.messageKind,
      room_id: args.roomId || null,
      conversation_user_id: args.conversationUserId || null,
      preview: (args.preview || args.text || "").slice(0, 200),
    })) as any
  );
  if (insErr) console.warn("[mentions] insert failed", insErr);

  supabase.functions
    .invoke("send-push", {
      body: {
        type: args.messageKind === "dm" ? "dm" : "chat",
        recipientUserIds: others.map((m) => m.user_id),
        senderId: args.fromUserId,
        senderName: args.fromUsername,
        body: `@${args.fromUsername} te mencionou: ${(args.text || "").slice(0, 100)}`,
        url: "/",
        roomName: args.roomId || undefined,
      },
    })
    .catch((e) => console.warn("[mentions] push invoke failed", e));

  return others;
}

/** Busca usernames para autocomplete (prefix match, case-insensitive) */
export async function searchUsernames(prefix: string, limit = 6): Promise<MentionTarget[]> {
  const p = prefix.trim();
  let q = supabase.from("profiles").select("id, username").order("username").limit(limit);
  if (p.length > 0) q = q.ilike("username", `${p}%`);
  const { data } = await q;
  return (data || []).map((d: any) => ({ user_id: d.id, username: d.username }));
}
