import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupInvite {
  id: string;
  code: string;
  status: "active" | "revoked";
  created_at: string;
  expires_at: string;
}

export function useGroupInvites(groupId: string | null, isAdmin: boolean) {
  const [active, setActive] = useState<GroupInvite | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!groupId || !isAdmin) return;
    const { data } = await supabase
      .from("group_invites")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActive((data as any) || null);
  }, [groupId, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const generate = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("create_group_invite", { _group_id: groupId });
    setLoading(false);
    if (error) { toast.error("Erro ao gerar código"); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setActive({ id: row.id, code: row.code, status: "active", created_at: new Date().toISOString(), expires_at: row.expires_at });
    toast.success("Novo código gerado!");
  }, [groupId]);

  const revoke = useCallback(async () => {
    if (!groupId) return;
    const { error } = await supabase.rpc("revoke_group_invites", { _group_id: groupId });
    if (error) { toast.error("Erro ao encerrar código"); return; }
    setActive(null);
    toast.success("Código encerrado.");
  }, [groupId]);

  return { active, loading, generate, revoke };
}
