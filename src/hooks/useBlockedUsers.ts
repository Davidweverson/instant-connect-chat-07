import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function useBlockedUsers(userId: string | undefined) {
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setBlocked(new Set()); setLoading(false); return; }
    const { data } = await supabase
      .from("blocked_users" as any)
      .select("blocked_id")
      .eq("blocker_id", userId);
    setBlocked(new Set((data as any[] || []).map((r) => r.blocked_id)));
    setLoading(false);
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  const block = useCallback(async (targetId: string) => {
    if (!userId || targetId === userId) return;
    const { error } = await supabase
      .from("blocked_users" as any)
      .insert({ blocker_id: userId, blocked_id: targetId } as any);
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Não foi possível bloquear", variant: "destructive" });
      return;
    }
    setBlocked((s) => new Set(s).add(targetId));
    toast({ title: "Usuário bloqueado", description: "Você não verá mais mensagens dessa pessoa." });
  }, [userId]);

  const unblock = useCallback(async (targetId: string) => {
    if (!userId) return;
    await supabase.from("blocked_users" as any).delete()
      .eq("blocker_id", userId).eq("blocked_id", targetId);
    setBlocked((s) => { const n = new Set(s); n.delete(targetId); return n; });
    toast({ title: "Bloqueio removido" });
  }, [userId]);

  return { blocked, isBlocked: (id: string) => blocked.has(id), block, unblock, refresh, loading };
}
