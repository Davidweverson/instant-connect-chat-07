import { useState } from "react";
import { X, Copy, RefreshCw, Trash2, LogOut, Crown, UserMinus, ShieldCheck, ShieldOff, Loader2, Camera, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGroupInvites } from "@/hooks/useGroupInvites";
import type { GroupDetails, GroupMember } from "@/hooks/useGroupDetails";

interface Props {
  open: boolean;
  onClose: () => void;
  group: GroupDetails;
  members: GroupMember[];
  isAdmin: boolean;
  userId: string;
  onUpdate: (fields: Partial<Pick<GroupDetails, "name" | "description" | "photo_url">>) => Promise<void>;
  onPromote: (uid: string) => Promise<void>;
  onDemote: (uid: string) => Promise<void>;
  onRemove: (uid: string) => Promise<void>;
  onDelete: () => Promise<boolean>;
  onLeave: () => Promise<void>;
  onAfterDelete: () => void;
}

export function GroupSettingsModal(p: Props) {
  const inv = useGroupInvites(p.group.id, p.isAdmin);
  const [name, setName] = useState(p.group.name);
  const [desc, setDesc] = useState(p.group.description || "");
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  if (!p.open) return null;

  const copy = () => {
    if (!inv.active) return;
    navigator.clipboard.writeText(inv.active.code);
    toast.success("Código copiado!");
  };

  const changePhoto = async (file: File | null) => {
    if (!file) return;
    setUploadingPhoto(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${p.userId}/groups/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (error) {
      toast.error("Não foi possível enviar a imagem.");
      setUploadingPhoto(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    await p.onUpdate({ photo_url: data.publicUrl });
    setUploadingPhoto(false);
  };

  const removePhoto = async () => {
    await p.onUpdate({ photo_url: null });
  };

  const save = async () => {
    setSaving(true);
    await p.onUpdate({ name: name.trim() || p.group.name, description: desc.trim() || null });
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!confirm("Excluir este grupo? Ação irreversível.")) return;
    const ok = await p.onDelete();
    if (ok) { p.onClose(); p.onAfterDelete(); }
  };

  const confirmLeave = async () => {
    if (!confirm("Sair deste grupo?")) return;
    await p.onLeave();
    p.onClose();
    p.onAfterDelete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={p.onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
          <h3 className="font-display text-lg text-foreground">Configurações do Grupo</h3>
          <button onClick={p.onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-6">
          {/* Info edit (admin) */}
          {p.isAdmin && (
            <section className="space-y-3">
              <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Informações</h4>
              <div className="flex items-center gap-4">
                <label className="relative w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-primary/20 transition-colors group">
                  {p.group.photo_url
                    ? <img src={p.group.photo_url} alt="Foto do grupo" className="w-full h-full object-cover" />
                    : <Users className="w-6 h-6 text-primary" />}
                  <span className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingPhoto ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Camera className="w-5 h-5 text-primary" />}
                  </span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={(e) => changePhoto(e.target.files?.[0] || null)} />
                </label>
                <div className="text-xs text-muted-foreground">
                  <p>Clique na imagem para trocar a foto do grupo.</p>
                  {p.group.photo_url && (
                    <button onClick={removePhoto} className="mt-1 text-destructive hover:underline">Remover foto</button>
                  )}
                </div>
              </div>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" placeholder="Nome" />
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none" placeholder="Descrição" />
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
              </button>
            </section>
          )}

          {/* Invite code (admin) */}
          {p.isAdmin && (
            <section className="space-y-3">
              <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Código de Convite</h4>
              {inv.active ? (
                <div className="p-4 rounded-xl bg-muted border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl tracking-widest text-primary">{inv.active.code}</span>
                    <button onClick={copy} className="p-2 rounded-lg hover:bg-background transition-colors" title="Copiar"><Copy className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-muted-foreground">Expira em {new Date(inv.active.expires_at).toLocaleDateString("pt-BR")}</p>
                  <div className="flex gap-2">
                    <button onClick={inv.generate} disabled={inv.loading} className="flex-1 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm hover:bg-primary/20 flex items-center justify-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Gerar novo</button>
                    <button onClick={inv.revoke} className="flex-1 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 flex items-center justify-center gap-1.5"><Trash2 className="w-3.5 h-3.5" /> Encerrar</button>
                  </div>
                </div>
              ) : (
                <button onClick={inv.generate} disabled={inv.loading} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {inv.loading && <Loader2 className="w-4 h-4 animate-spin" />} Gerar código
                </button>
              )}
            </section>
          )}

          {/* Members */}
          <section className="space-y-2">
            <h4 className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">Membros ({p.members.length})</h4>
            <div className="space-y-1">
              {p.members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary/20 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-bold text-primary">{m.username[0]?.toUpperCase()}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1.5">
                      {m.username}
                      {m.role === "admin" && <span title="Administrador"><Crown className="w-3.5 h-3.5 text-amber-500" /></span>}
                      {m.user_id === p.userId && <span className="text-[10px] text-muted-foreground">(você)</span>}
                    </p>
                  </div>
                  {p.isAdmin && m.user_id !== p.userId && (
                    <div className="flex gap-1">
                      {m.role === "admin" ? (
                        <button onClick={() => p.onDemote(m.user_id)} className="p-1.5 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10" title="Rebaixar a membro"><ShieldOff className="w-3.5 h-3.5" /></button>
                      ) : (
                        <button onClick={() => p.onPromote(m.user_id)} className="p-1.5 rounded text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10" title="Promover a admin"><ShieldCheck className="w-3.5 h-3.5" /></button>
                      )}
                      <button onClick={() => p.onRemove(m.user_id)} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Remover"><UserMinus className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Danger zone */}
          <section className="pt-4 border-t border-border space-y-2">
            {p.isAdmin ? (
              <button onClick={confirmDelete} className="w-full py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" /> Excluir grupo
              </button>
            ) : (
              <button onClick={confirmLeave} className="w-full py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Sair do grupo
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
