import { useEffect, useState } from "react";
import { BarChart3, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchPoll, vote, unvote, type Poll } from "@/lib/polls";

interface PollCardProps {
  pollId: string;
  userId: string;
  isOwn?: boolean;
}

export function PollCard({ pollId, userId, isOwn }: PollCardProps) {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const p = await fetchPoll(pollId);
    setPoll(p);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`poll-${pollId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` }, () => {
        load();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [pollId]);

  if (loading) {
    return <div className="min-w-[240px] py-3 text-xs opacity-60">Carregando enquete...</div>;
  }
  if (!poll) {
    return <div className="min-w-[240px] py-3 text-xs opacity-60">Enquete não encontrada</div>;
  }

  const totalVotes = poll.votes.length;
  const myVotes = new Set(poll.votes.filter((v) => v.user_id === userId).map((v) => v.option_id));
  const closed = poll.closes_at && new Date(poll.closes_at) < new Date();

  const handleClick = async (optionId: string) => {
    if (closed) return;
    if (myVotes.has(optionId)) {
      await unvote(optionId, userId);
    } else {
      await vote(poll.id, optionId, userId, poll.allow_multiple);
    }
    load();
  };

  return (
    <div className="min-w-[260px] max-w-[360px] py-1">
      <div className="flex items-center gap-1.5 mb-2 opacity-90">
        <BarChart3 className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          Enquete{poll.allow_multiple ? " · múltipla" : ""}
        </span>
      </div>
      <p className="text-sm font-semibold mb-2 break-words">{poll.question}</p>
      <div className="flex flex-col gap-1.5">
        {poll.options.map((opt) => {
          const votesForOption = poll.votes.filter((v) => v.option_id === opt.id).length;
          const pct = totalVotes > 0 ? Math.round((votesForOption / totalVotes) * 100) : 0;
          const voted = myVotes.has(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => handleClick(opt.id)}
              disabled={!!closed}
              className={`relative w-full text-left rounded-lg overflow-hidden border transition-all ${
                voted ? "border-current" : "border-current/20"
              } hover:border-current/60 disabled:cursor-default`}
            >
              <div
                className={`absolute inset-y-0 left-0 ${isOwn ? "bg-background/20" : "bg-primary/15"} transition-all`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="flex items-center gap-1.5 min-w-0">
                  {voted && <Check className="w-3 h-3 flex-shrink-0" />}
                  <span className="truncate">{opt.text}</span>
                </span>
                <span className="opacity-70 tabular-nums flex-shrink-0 ml-2">
                  {votesForOption} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] opacity-60 mt-2">
        {totalVotes} voto{totalVotes === 1 ? "" : "s"}
        {closed ? " · encerrada" : ""}
      </p>
    </div>
  );
}
