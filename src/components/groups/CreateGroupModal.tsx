import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string | null, photoUrl: string | null) => Promise<string | null>;
  userId: string;
}

export function CreateGroupModal({ open, onClose, onCreate, userId }: Props) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const handlePhoto = (f: File | null) => {
    setPhoto(f);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const submit = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao grupo."); return; }
    setBusy(true);
    let photoUrl: string | null = null;
    if (photo) {
      const path = `${userId}/groups/${crypto.randomUUID()}.${photo.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("avatars").upload(path, photo, { upsert: false });
      if (!error) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        photoUrl = data.publicUrl;
      } else {
        toast.error("Não foi possível enviar a imagem do grupo.");
        setBusy(false);
        return;
      }
    }
    const groupId = await onCreate(name.trim(), desc.trim() || null, photoUrl);
    setBusy(false);
    if (!groupId) return;
    setName(""); setDesc(""); setPhoto(null); setPreviewUrl(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/55 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md glass-strong rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg text-foreground">Criar Grupo</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <label className="w-20 h-20 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center cursor-pointer overflow-hidden hover:bg-primary/20 transition-colors">
              {previewUrl ? <img src={previewUrl} alt="" className="w-full h-full object-cover" /> : <Upload className="w-6 h-6 text-primary" />}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0] || null)} />
            </label>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">Nome do grupo</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Ex: Amigos do FlashChat" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descrição (opcional)</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} rows={3} placeholder="Sobre o que é este grupo?" className="w-full mt-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground focus:outline-none focus:border-primary resize-none" />
          </div>
          <button onClick={submit} disabled={busy} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Criar grupo
          </button>
        </div>
      </div>
    </div>
  );
}
