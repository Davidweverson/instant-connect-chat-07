import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Flame, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLevelProgress } from "@/lib/xp";
import type { UserXP, UserAchievement } from "@/hooks/useUserXP";

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  kind: string;
}

interface LeaderRow {
  user_id: string;
  xp: number;
  level: number;
  current_streak: number;
  profile?: { username: string; avatar_url: string | null };
}

interface AchievementsModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  xp: UserXP | null;
  achievements: UserAchievement[];
}

export function AchievementsModal({ open, onClose, userId, xp, achievements }: AchievementsModalProps) {
  const [tab, setTab] = useState<"achievements" | "leaderboard">("achievements");
  const [all, setAll] = useState<Achievement[]>([]);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("achievements" as any)
      .select("*")
      .order("threshold", { ascending: true })
      .then(({ data }) => setAll((data as any) || []));
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "leaderboard") return;
    setLoadingLeaders(true);
    (async () => {
      const { data } = await supabase
        .from("user_xp" as any)
        .select("user_id, xp, level, current_streak")
        .order("xp", { ascending: false })
        .limit(20);
      if (!data) {
        setLeaders([]);
        setLoadingLeaders(false);
        return;
      }
      const ids = (data as any[]).map((r) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);
      const map = new Map<string, any>();
      (profs || []).forEach((p) => map.set(p.id, p));
      setLeaders(
        (data as any[]).map((r) => ({ ...r, profile: map.get(r.user_id) }))
      );
      setLoadingLeaders(false);
    })();
  }, [open, tab]);

  const unlockedIds = new Set(achievements.map((a) => a.achievement_id));
  const progress = getLevelProgress(xp?.xp || 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Sua jornada
          </DialogTitle>
        </DialogHeader>

        {/* XP summary */}
        <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Nível atual</p>
              <p className="text-2xl font-bold text-foreground">{progress.level}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">XP total</p>
              <p className="text-xl font-bold text-primary tabular-nums">{xp?.xp || 0}</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-background overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
            <span>{progress.current} / {progress.needed} XP</span>
            <span>Próximo nível em {progress.needed - progress.current} XP</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-2 text-center">
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Mensagens</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{xp?.total_messages || 0}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase flex items-center justify-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Ofensiva
              </p>
              <p className="text-sm font-bold text-foreground tabular-nums">{xp?.current_streak || 0} dias</p>
            </div>
            <div className="rounded-lg bg-background/60 p-2">
              <p className="text-[10px] text-muted-foreground uppercase">Recorde</p>
              <p className="text-sm font-bold text-foreground tabular-nums">{xp?.longest_streak || 0} dias</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 border-b border-border">
          {(["achievements", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "achievements" ? "Conquistas" : "Ranking"}
            </button>
          ))}
        </div>

        {tab === "achievements" && (
          <div className="space-y-2 mt-3">
            {all.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            )}
            {all.map((a) => {
              const unlocked = unlockedIds.has(a.id);
              const value =
                a.kind === "messages"
                  ? xp?.total_messages || 0
                  : a.kind === "streak"
                  ? xp?.current_streak || 0
                  : xp?.xp || 0;
              const pct = Math.min(100, Math.round((value / a.threshold) * 100));
              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    unlocked
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-secondary/30 opacity-70"
                  }`}
                >
                  <div className={`text-2xl ${unlocked ? "" : "grayscale opacity-50"}`}>{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.description}</p>
                    {!unlocked && (
                      <div className="mt-1 h-1 rounded-full bg-background overflow-hidden">
                        <div className="h-full bg-primary/60" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                  {unlocked && <Medal className="w-4 h-4 text-primary flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-1 mt-3">
            {loadingLeaders && (
              <p className="text-sm text-muted-foreground text-center py-6">Carregando...</p>
            )}
            {!loadingLeaders && leaders.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Sem dados ainda.</p>
            )}
            {leaders.map((row, i) => {
              const isMe = row.user_id === userId;
              return (
                <div
                  key={row.user_id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                    isMe ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-secondary/40"
                  }`}
                >
                  <span
                    className={`w-6 text-center text-sm font-bold tabular-nums ${
                      i === 0
                        ? "text-yellow-500"
                        : i === 1
                        ? "text-zinc-400"
                        : i === 2
                        ? "text-orange-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {row.profile?.avatar_url ? (
                      <img src={row.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-primary">
                        {row.profile?.username?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {row.profile?.username || "—"} {isMe && <span className="text-xs text-primary">(você)</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Nível {row.level} · {row.current_streak}d ofensiva
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary tabular-nums">{row.xp} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
