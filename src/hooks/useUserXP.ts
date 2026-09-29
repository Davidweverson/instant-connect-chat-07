import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface UserXP {
  user_id: string;
  xp: number;
  level: number;
  total_messages: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: {
    code: string;
    name: string;
    description: string;
    icon: string;
  };
}

export function useUserXP(userId: string | undefined) {
  const [xp, setXp] = useState<UserXP | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const prevLevel = useRef<number | null>(null);
  const knownAchievements = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const load = async () => {
      const [{ data: xpData }, { data: aData }] = await Promise.all([
        supabase.from("user_xp" as any).select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("user_achievements" as any)
          .select("id, achievement_id, unlocked_at, achievement:achievements(code,name,description,icon)")
          .eq("user_id", userId)
          .order("unlocked_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (xpData) {
        setXp(xpData as any);
        prevLevel.current = (xpData as any).level;
      }
      if (aData) {
        setAchievements(aData as any);
        knownAchievements.current = new Set((aData as any).map((a: any) => a.achievement_id));
      }
    };
    load();

    const ch = supabase
      .channel(`xp-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_xp", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload.new as UserXP;
          setXp(next);
          if (prevLevel.current != null && next.level > prevLevel.current) {
            toast({
              title: `🎉 Subiu para o nível ${next.level}!`,
              description: `Você acumulou ${next.xp} XP. Continue assim!`,
            });
          }
          prevLevel.current = next.level;
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_achievements", filter: `user_id=eq.${userId}` },
        async (payload) => {
          const row = payload.new as any;
          if (knownAchievements.current.has(row.achievement_id)) return;
          knownAchievements.current.add(row.achievement_id);
          const { data: a } = await supabase
            .from("achievements" as any)
            .select("code,name,description,icon")
            .eq("id", row.achievement_id)
            .maybeSingle();
          if (a) {
            toast({
              title: `${(a as any).icon} Conquista desbloqueada!`,
              description: `${(a as any).name} — ${(a as any).description}`,
            });
            setAchievements((prev) => [
              { id: row.id, achievement_id: row.achievement_id, unlocked_at: row.unlocked_at, achievement: a as any },
              ...prev,
            ]);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [userId]);

  return { xp, achievements };
}
