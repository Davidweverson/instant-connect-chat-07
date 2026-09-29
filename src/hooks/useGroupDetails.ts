import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupMember {
  id: string;
  user_id: string;
  role: "admin" | "member";
  username: string;
  avatar_url: string | null;
  joined_at: string;
}

export interface GroupDetails {
  id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  created_by: string;
  last_activity_at: string;
}

export function useGroupDetails(groupId: string | null, userId: string | undefined) {
  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
    setGroup(g as any);
    const { data: mems } = await supabase.from("group_members").select("*").eq("group_id", groupId);
    const ids = (mems || []).map((m: any) => m.user_id);
    let profs: Record<string, any> = {};
    if (ids.length) {
      const { data: p } = await supabase.from("profiles").select("id, username, avatar_url").in("id", ids);
      profs = (p || []).reduce((acc: any, x: any) => { acc[x.id] = x; return acc; }, {});
    }
    const list: GroupMember[] = (mems || []).map((m: any) => ({
      id: m.id, user_id: m.user_id, role: m.role, joined_at: m.joined_at,
      username: profs[m.user_id]?.username || "?", avatar_url: profs[m.user_id]?.avatar_url || null,
    }));
    list.sort((a, b) => (a.role === "admin" ? -1 : 1) - (b.role === "admin" ? -1 : 1) || a.username.localeCompare(b.username));
    setMembers(list);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!groupId) return;
    const ch = supabase.channel(`group-detail-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members", filter: `group_id=eq.${groupId}` }, () => load())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "groups", filter: `id=eq.${groupId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId, load]);

  const isAdmin = !!(userId && members.find((m) => m.user_id === userId)?.role === "admin");
  const adminCount = members.filter((m) => m.role === "admin").length;

  const updateGroup = useCallback(async (fields: Partial<Pick<GroupDetails, "name" | "description" | "photo_url">>) => {
    if (!groupId) return;
    const { error } = await supabase.from("groups").update(fields).eq("id", groupId);
    if (error) { toast.error("Erro ao atualizar grupo"); return; }
    toast.success("Grupo atualizado.");
    await load();
  }, [groupId, load]);

  const promote = useCallback(async (memberUserId: string) => {
    if (!groupId) return;
    const { error } = await supabase.from("group_members").update({ role: "admin" }).eq("group_id", groupId).eq("user_id", memberUserId);
    if (error) { toast.error("Erro ao promover"); return; }
    toast.success("Membro promovido a administrador.");
    await load();
  }, [groupId, load]);

  const demote = useCallback(async (memberUserId: string) => {
    if (!groupId) return;
    if (adminCount <= 1) { toast.error("Deve haver ao menos um administrador."); return; }
    const { error } = await supabase.from("group_members").update({ role: "member" }).eq("group_id", groupId).eq("user_id", memberUserId);
    if (error) { toast.error("Erro ao rebaixar"); return; }
    toast.success("Administrador rebaixado a membro.");
    await load();
  }, [groupId, load, adminCount]);

  const removeMember = useCallback(async (memberUserId: string) => {
    if (!groupId) return;
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberUserId);
    if (error) { toast.error("Erro ao remover"); return; }
    toast.success("Membro removido.");
    await load();
  }, [groupId, load]);

  const deleteGroup = useCallback(async () => {
    if (!groupId) return;
    // Remove dependências que possuem proteções antes de apagar o grupo.
    await supabase.from("group_messages").delete().eq("group_id", groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) { toast.error(`Erro ao excluir grupo: ${error.message}`); return false; }
    toast.success("Grupo excluído.");
    return true;
  }, [groupId]);

  return { group, members, loading, isAdmin, adminCount, reload: load, updateGroup, promote, demote, removeMember, deleteGroup };
}
