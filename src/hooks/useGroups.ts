import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  last_activity_at: string;
  member_count: number;
  role: "admin" | "member";
}

export function useGroups(userId: string | undefined) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data: memberships, error } = await supabase
      .from("group_members")
      .select("role, group_id, groups:group_id (id, name, description, photo_url, created_by, last_activity_at)")
      .eq("user_id", userId);
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const groupIds = (memberships || []).map((m: any) => m.group_id);
    let countsMap: Record<string, number> = {};
    if (groupIds.length > 0) {
      const { data: counts } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);
      countsMap = (counts || []).reduce((acc: Record<string, number>, r: any) => {
        acc[r.group_id] = (acc[r.group_id] || 0) + 1;
        return acc;
      }, {});
    }
    const list: GroupSummary[] = (memberships || [])
      .filter((m: any) => m.groups)
      .map((m: any) => ({
        id: m.groups.id,
        name: m.groups.name,
        description: m.groups.description,
        photo_url: m.groups.photo_url,
        created_by: m.groups.created_by,
        last_activity_at: m.groups.last_activity_at,
        member_count: countsMap[m.groups.id] || 1,
        role: m.role,
      }))
      .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
    setGroups(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`user-groups-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `user_id=eq.${userId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "groups" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const createGroup = useCallback(async (name: string, description: string | null, photoUrl: string | null) => {
    if (!userId) return null;
    const groupId = crypto.randomUUID();
    const { error } = await supabase
      .from("groups")
      .insert({ id: groupId, name, description, photo_url: photoUrl, created_by: userId });
    if (error) {
      console.error("Erro ao criar grupo", error);
      const message = error.message.includes("row-level security") || error.code === "42501"
        ? "Permissão de grupos corrigida. Recarregue a página e tente novamente."
        : "Erro ao criar grupo";
      toast.error(message);
      return null;
    }
    toast.success("Grupo criado!");
    await load();
    return groupId;
  }, [userId, load]);

  const joinByCode = useCallback(async (code: string) => {
    const clean = code.trim().toUpperCase().replace(/\s+/g, "");
    const { data, error } = await supabase.rpc("redeem_group_invite", { _code: clean });
    if (error) {
      toast.error(error.message.includes("INVALID_CODE") ? "Código inválido ou expirado." : "Erro ao entrar no grupo.");
      return null;
    }
    toast.success("Você entrou no grupo!");
    await load();
    return data as string;
  }, [load]);

  const leaveGroup = useCallback(async (groupId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) { toast.error("Erro ao sair do grupo"); return; }
    toast.success("Você saiu do grupo.");
    await load();
  }, [userId, load]);

  return { groups, loading, createGroup, joinByCode, leaveGroup, refresh: load };
}
