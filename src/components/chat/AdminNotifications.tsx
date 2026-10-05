import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Pencil, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface NotificationRow {
  id: string;
  title: string;
  content: string;
  type: string;
  image_url: string | null;
  is_important: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
}

const emptyForm = {
  title: "",
  content: "",
  type: "informacao",
  image_url: "",
  is_important: false,
  is_published: false,
};

const typeOptions = [
  { value: "informacao", label: "Informação" },
  { value: "atualizacao", label: "Atualização" },
  { value: "manutencao", label: "Manutenção" },
  { value: "seguranca", label: "Segurança" },
  { value: "evento", label: "Evento" },
];

export function AdminNotifications() {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NotificationRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data as NotificationRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (n: NotificationRow) => {
    setEditing(n);
    setForm({
      title: n.title,
      content: n.content,
      type: n.type,
      image_url: n.image_url || "",
      is_important: n.is_important,
      is_published: n.is_published,
    });
    setFormOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      image_url: form.image_url.trim() || null,
      is_important: form.is_important,
      is_published: form.is_published,
      published_at: form.is_published ? (editing?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = editing
      ? await supabase.from("notifications").update(payload).eq("id", editing.id)
      : await supabase.from("notifications").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Aviso atualizado" : "Aviso criado" });
    setFormOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este aviso permanentemente?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else load();
  };

  const togglePublish = async (n: NotificationRow) => {
    await supabase.from("notifications").update({
      is_published: !n.is_published,
      published_at: !n.is_published ? new Date().toISOString() : null,
    } as any).eq("id", n.id);
    load();
  };

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Avisos ({items.length})
        </h2>
        <button onClick={openNew} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">
          <Plus className="w-4 h-4" /> Novo aviso
        </button>
      </div>

      {formOpen && (
        <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
          <p className="text-sm font-semibold text-foreground">{editing ? "Editar aviso" : "Novo aviso"}</p>
          <input
            type="text"
            placeholder="Título"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <textarea
            placeholder="Conteúdo do aviso"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
          />
          <div className="flex gap-2 flex-wrap">
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {typeOptions.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input
              type="url"
              placeholder="URL da imagem (opcional)"
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              className="flex-1 min-w-[200px] px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-4 flex-wrap text-sm">
            <label className="flex items-center gap-2 text-foreground cursor-pointer">
              <input type="checkbox" checked={form.is_important} onChange={(e) => setForm({ ...form, is_important: e.target.checked })} className="accent-primary" />
              Importante (abre popup automático)
            </label>
            <label className="flex items-center gap-2 text-foreground cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="accent-primary" />
              Publicado (visível para todos)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFormOpen(false)} className="px-4 py-2 rounded-lg border border-border text-foreground text-sm hover:bg-muted transition-colors">Cancelar</button>
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !formOpen && (
        <p className="text-muted-foreground text-sm py-4 text-center">Nenhum aviso criado ainda.</p>
      )}

      {items.map((n) => (
        <div key={n.id} className="p-4 rounded-xl bg-secondary border border-border space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                {n.is_important && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${n.is_published ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {n.is_published ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {n.type} · {n.published_at ? `publicado em ${new Date(n.published_at).toLocaleString("pt-BR")}` : "não publicado"}
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => togglePublish(n)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={n.is_published ? "Despublicar" : "Publicar"}>
                {n.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Editar">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(n.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Excluir">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
