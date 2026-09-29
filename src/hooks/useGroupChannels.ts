import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GroupChannel {
  id: string;
  group_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_main: boolean;
  is_archived: boolean;
  type: "text" | "voice" | "announcement";
  visibility: "public" | "private";
  read_only: boolean;
  created_at: string;
}

export interface GroupChannelCategory {
  id: string;
  group_id: string;
  name: string;
  position: number;
  collapsed_by_default: boolean;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || `canal-${Date.now().toString(36)}`;
}

export function useGroupChannels(groupId: string | null, isAdmin: boolean) {
  const [channels, setChannels] = useState<GroupChannel[]>([]);
  const [categories, setCategories] = useState<GroupChannelCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    const [chRes, catRes] = await Promise.all([
      supabase.from("group_channels").select("*").eq("group_id", groupId).order("position", { ascending: true }),
      supabase.from("group_channel_categories").select("*").eq("group_id", groupId).order("position", { ascending: true }),
    ]);
    setChannels((chRes.data as any) || []);
    setCategories((catRes.data as any) || []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { setChannels([]); setCategories([]); load(); }, [load]);

  useEffect(() => {
    if (!groupId) return;
    const ch = supabase
      .channel(`group-channels-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_channels", filter: `group_id=eq.${groupId}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_channel_categories", filter: `group_id=eq.${groupId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [groupId, load]);

  const create = useCallback(async (name: string, categoryId: string | null = null) => {
    if (!groupId || !isAdmin) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const nextPos = channels.length ? Math.max(...channels.map((c) => c.position)) + 1 : 1;
    const { data, error } = await supabase
      .from("group_channels")
      .insert({ group_id: groupId, name: trimmed, slug: slugify(trimmed) + "-" + Math.random().toString(36).slice(2, 6), position: nextPos, category_id: categoryId })
      .select()
      .single();
    if (error) { toast.error("Erro ao criar canal"); return null; }
    return data as GroupChannel;
  }, [groupId, isAdmin, channels]);

  const rename = useCallback(async (id: string, name: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channels").update({ name: name.trim() }).eq("id", id);
    if (error) toast.error("Erro ao renomear canal");
  }, [isAdmin]);

  const setDescription = useCallback(async (id: string, description: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channels").update({ description: description.slice(0, 500) || null }).eq("id", id);
    if (error) toast.error("Erro ao atualizar descrição");
  }, [isAdmin]);

  const archive = useCallback(async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channels").update({ is_archived: true }).eq("id", id);
    if (error) toast.error(error.message.includes("MAIN_CHANNEL_PROTECTED") ? "O canal principal não pode ser arquivado" : "Erro ao arquivar");
  }, [isAdmin]);

  const restore = useCallback(async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channels").update({ is_archived: false }).eq("id", id);
    if (error) toast.error("Erro ao restaurar");
  }, [isAdmin]);

  const remove = useCallback(async (id: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channels").delete().eq("id", id);
    if (error) toast.error(error.message.includes("MAIN_CHANNEL_PROTECTED") ? "O canal principal não pode ser excluído" : "Erro ao excluir canal");
  }, [isAdmin]);

  const move = useCallback(async (id: string, direction: -1 | 1) => {
    if (!groupId || !isAdmin) return;
    const visible = channels.filter((c) => !c.is_archived);
    const idx = visible.findIndex((c) => c.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= visible.length) return;
    const reordered = [...visible];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const ids = reordered.map((c) => c.id);
    const { error } = await supabase.rpc("reorder_group_channels", { _group_id: groupId, _ids: ids });
    if (error) toast.error("Erro ao reordenar");
  }, [groupId, isAdmin, channels]);

  const createCategory = useCallback(async (name: string) => {
    if (!groupId || !isAdmin) return null;
    const nextPos = categories.length ? Math.max(...categories.map((c) => c.position)) + 1 : 0;
    const { data, error } = await supabase
      .from("group_channel_categories")
      .insert({ group_id: groupId, name: name.trim(), position: nextPos })
      .select().single();
    if (error) { toast.error("Erro ao criar categoria"); return null; }
    return data as GroupChannelCategory;
  }, [groupId, isAdmin, categories]);

  const renameCategory = useCallback(async (id: string, name: string) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channel_categories").update({ name: name.trim() }).eq("id", id);
    if (error) toast.error("Erro ao renomear categoria");
  }, [isAdmin]);

  const removeCategory = useCallback(async (id: string) => {
    if (!isAdmin) return;
    // canais dentro dela viram sem categoria
    await supabase.from("group_channels").update({ category_id: null }).eq("category_id", id);
    const { error } = await supabase.from("group_channel_categories").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir categoria");
  }, [isAdmin]);

  const moveChannelToCategory = useCallback(async (channelId: string, categoryId: string | null) => {
    if (!isAdmin) return;
    const { error } = await supabase.from("group_channels").update({ category_id: categoryId }).eq("id", channelId);
    if (error) toast.error("Erro ao mover canal");
  }, [isAdmin]);

  return {
    channels, categories, loading,
    create, rename, setDescription, archive, restore, remove, move,
    createCategory, renameCategory, removeCategory, moveChannelToCategory,
    reload: load,
  };
}
