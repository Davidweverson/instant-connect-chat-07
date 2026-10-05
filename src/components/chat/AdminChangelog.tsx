import { useState, useEffect, useCallback } from "react";
import { ClipboardList, Plus, Pencil, Trash2, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { ChangelogEntry, ChangelogItem } from "@/hooks/useChangelog";

interface ChangeRow extends ChangelogItem { key: number; }

let keyCounter = 0;
const newRow = (): ChangeRow => ({ key: ++keyCounter, type: "new", text: "" });

export function AdminChangelog() {
  const [items, setItems] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ChangelogEntry | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [changes, setChanges] = useState<ChangeRow[]>([newRow()]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("changelog_entries")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    setItems(((data as any[]) || []).map((d) => ({ ...d, changes: Array.isArray(d.changes) ? d.changes : [] })) as ChangelogEntry[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setVersion(""); setTitle(""); setDescription(""); setImageUrl("");
    setIsPublished(false); setChanges([newRow()]);
  };

  const openNew = () => { setEditing(null); resetForm(); setFormOpen(true); };

  const openEdit = (e: ChangelogEntry) => {
    setEditing(e);
    setVersion(e.version);
    setTitle(e.title);
    setDescription(e.description);
    setImageUrl(e.image_url || "");
    setIsPublished(e.is_published);
    setChanges(e.changes.length > 0 ? e.changes.map((c) => ({ ...c, key: ++keyCounter })) : [newRow()]);
    setFormOpen(true);
  };

  const save = async () => {
    if (!version.trim()) {
      toast({ title: "Informe a versão (ex: v2.2.0)", variant: "destructive" });
      return;
    }
    const cleanChanges = changes.filter((c) => c.text.trim()).map(({ type, text }) => ({ type, text: text.trim() }));
    setSaving(true);
    const payload: any = {
      version: version.trim(),
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim() || null,
      changes: cleanChanges,
      is_published: isPublished,
      published_at: isPublished ? (editing?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = editing
      ? await supabase.from("changelog_entries").update(payload).eq("id", editing.id)
      : await supabase.from("changelog_entries").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Versão atualizada" : "Versão criada" });
    setFormOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta versão do changelog permanentemente?")) return;
    const { error } = await supabase.from("changelog_entries").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else load();
  };

  const togglePublish = async (e: ChangelogEntry) => {
    await supabase.from("changelog_entries").update({
      is_published: !e.is_published,
      published_at: !e.is_published ? new Date().toISOString() : null,
    } as any).eq("id", e.id);
    load();
  };

  const updateRow = (key: number, patch: Partial<ChangeRow>) =>
    setChanges((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          Changelog ({items.length})
        </h2>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Nova versão
        </button>
      </div>

      {formOpen && (
        <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">{editing ? `Editar ${editing.version}` : "Nova versão"}</p>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Versão (ex: v2.2.0)"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="w-36 px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              placeholder="Título (opcional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 min-w-[180px] px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          />
          <input
            type="url"
            placeholder="URL da imagem (opcional)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mudanças</p>
            {changes.map((row) => (
              <div key={row.key} className="flex gap-2 items-center">
                <select
                  value={row.type}
                  onChange={(e) => updateRow(row.key, { type: e.target.value as ChangelogItem["type"] })}
                  className="px-2 py-2 rounded-lg bg-background border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="new">Novo</option>
                  <option value="improvement">Melhoria</option>
                  <option value="fix">Correção</option>
                </select>
                <input
                  type="text"
                  placeholder="Descreva a mudança"
                  value={row.text}
                  onChange={(e) => updateRow(row.key, { text: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={() => setChanges((rows) => rows.filter((r) => r.key !== row.key))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Remover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button onClick={() => setChanges((rows) => [...rows, newRow()])} className="text-xs text-primary hover:underline">
              + Adicionar mudança
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-primary" />
            Publicado (visível para todos)
          </label>

          <div className="flex gap-2">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {items.map((e) => (
        <div key={e.id} className="p-4 rounded-xl bg-secondary border border-border">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold text-primary">{e.version}</p>
                {e.title && <p className="text-sm font-medium text-foreground">{e.title}</p>}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${e.is_published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {e.is_published ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {e.changes.length} mudança(s) · {e.published_at ? `publicado em ${new Date(e.published_at).toLocaleString("pt-BR")}` : "não publicado"}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => togglePublish(e)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={e.is_published ? "Despublicar" : "Publicar"}>
                {e.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Editar">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(e.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
