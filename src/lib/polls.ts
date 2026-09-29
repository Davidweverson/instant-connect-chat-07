import { supabase } from "@/integrations/supabase/client";

export interface Poll {
  id: string;
  question: string;
  allow_multiple: boolean;
  closes_at: string | null;
  created_by: string;
  created_at: string;
  options: PollOption[];
  votes: PollVote[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  position: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
}

export const POLL_MARKER = "📊poll:";

export function extractPollId(text: string | null | undefined): string | null {
  if (!text) return null;
  const m = text.match(/📊poll:([0-9a-f-]{36})/i);
  return m ? m[1] : null;
}

export async function createPoll(params: {
  question: string;
  options: string[];
  allowMultiple: boolean;
  userId: string;
  roomId?: string;
  dmPair?: string;
}): Promise<string | null> {
  const { data: poll, error } = await supabase
    .from("polls" as any)
    .insert({
      question: params.question.slice(0, 300),
      allow_multiple: params.allowMultiple,
      created_by: params.userId,
      room_id: params.roomId || null,
      dm_pair: params.dmPair || null,
    })
    .select("id")
    .single();
  if (error || !poll) {
    console.error("[polls] create failed", error);
    return null;
  }
  const pollId = (poll as any).id;
  const rows = params.options
    .map((t, i) => ({ poll_id: pollId, text: t.slice(0, 120), position: i }))
    .filter((r) => r.text.trim().length > 0);
  if (rows.length > 0) {
    await supabase.from("poll_options" as any).insert(rows);
  }
  return pollId;
}

export async function fetchPoll(pollId: string): Promise<Poll | null> {
  const { data: poll } = await supabase.from("polls" as any).select("*").eq("id", pollId).maybeSingle();
  if (!poll) return null;
  const [{ data: options }, { data: votes }] = await Promise.all([
    supabase.from("poll_options" as any).select("*").eq("poll_id", pollId).order("position", { ascending: true }),
    supabase.from("poll_votes" as any).select("*").eq("poll_id", pollId),
  ]);
  return {
    ...(poll as any),
    options: (options as any) || [],
    votes: (votes as any) || [],
  };
}

export async function vote(pollId: string, optionId: string, userId: string, allowMultiple: boolean) {
  if (!allowMultiple) {
    // Remove existing votes by this user on this poll first
    await supabase.from("poll_votes" as any).delete().eq("poll_id", pollId).eq("user_id", userId);
  }
  const { error } = await supabase
    .from("poll_votes" as any)
    .insert({ poll_id: pollId, option_id: optionId, user_id: userId });
  if (error && !error.message.includes("duplicate")) {
    console.error("[polls] vote failed", error);
  }
}

export async function unvote(optionId: string, userId: string) {
  await supabase.from("poll_votes" as any).delete().eq("option_id", optionId).eq("user_id", userId);
}
