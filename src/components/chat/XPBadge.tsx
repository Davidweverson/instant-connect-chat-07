import { Trophy, Flame } from "lucide-react";
import { getLevelProgress } from "@/lib/xp";
import type { UserXP } from "@/hooks/useUserXP";

interface XPBadgeProps {
  xp: UserXP | null;
  onClick: () => void;
}

export function XPBadge({ xp, onClick }: XPBadgeProps) {
  const progress = getLevelProgress(xp?.xp || 0);
  const streak = xp?.current_streak || 0;

  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent transition-colors text-left"
      title="Ver conquistas e ranking"
    >
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="flex items-center gap-1.5 font-semibold text-foreground">
          <Trophy className="w-3.5 h-3.5 text-primary" />
          Nível {progress.level}
        </span>
        {streak > 0 && (
          <span className="flex items-center gap-0.5 text-orange-500 font-semibold">
            <Flame className="w-3.5 h-3.5" />
            {streak}d
          </span>
        )}
      </div>
      <div className="h-1.5 rounded-full bg-background overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
        {progress.current} / {progress.needed} XP
      </p>
    </button>
  );
}
